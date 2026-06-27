// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVerifier} from "./interfaces/IVerifier.sol";
import {ObscuraErrors} from "./libraries/ObscuraErrors.sol";

// ============================================================================
// ObscuraLending - Gizlilik Odaklı ZK Tabanlı Borç Havuzu
// ============================================================================
//
// Obscura Finance'in ana lending kontratıdır. Kullanıcıların ZK proof
// sunarak, kredi geçmişlerini açık etmeden eksik teminatlı borç
// alabilmelerini sağlar.
//
// === Temel Mekanizma ===
//
//   Standart DeFi lending: %150 teminat gerektirir (1 ETH borç = 1.5 ETH teminat)
//   Obscura ZK lending: ZK proof ile %100 teminat yeterli olur
//
//   Bu fark, kullanıcının kredi güvenilirliğini ZK ile kanıtlamasından gelir.
//   Gerçek kredi skoru veya işlem geçmişi ASLA on-chain'de görünmez.
//
// === Monad Optimizasyonu ===
//
//   Monad'ın paralel EVM'i, bağımsız kullanıcı işlemlerini eş zamanlı çalıştırır.
//   Bu kontrat, state güncellemelerini kullanıcı bazında izole tutarak
//   paralel execution'dan maksimum fayda sağlar:
//     - Her kullanıcının teminat/borç bilgisi kendi mapping slot'unda
//     - Kullanıcılar arası state çakışması minimize edilmiş
//     - Toplam havuz değişkenleri sadece gerekli yerlerde güncellenir
//
// === FHE Yol Haritası (Aşama 2) ===
//
//   İleride Zama fhEVM entegrasyonu ile:
//     - uint256 -> euint64 (şifreli teminat miktarları)
//     - Tasfiye eşikleri şifreli olarak hesaplanacak
//     - Borç miktarları sadece ilgili kullanıcı tarafından görülebilecek
//
//   Bu kontratın modüler yapısı, FHE geçişini minimal değişiklikle
//   destekleyecek şekilde tasarlanmıştır.
// ============================================================================

contract ObscuraLending {
    // ========================================================================
    // Sabitler
    // ========================================================================

    /// @notice Standart teminat oranı: %150 (1.5x)
    /// @dev 10000 baz puan = %100. Yani 15000 = %150.
    ///      Örnek: 1 ETH borç almak için 1.5 ETH teminat gerekir.
    uint256 public constant STANDARD_COLLATERAL_RATIO = 15000;

    /// @notice ZK doğrulanmış kullanıcılar için indirimli teminat oranı: %100 (1x)
    /// @dev ZK proof ile kredi güvenilirliğini kanıtlayan kullanıcılar
    ///      %50 daha az teminatla borç alabilir.
    ///
    /// [FHE_SLOT]: Aşama 2'de bu değer euint64 olarak şifrelenebilir,
    ///             böylece indirimli oran bile gizli kalır.
    uint256 public constant ZK_COLLATERAL_RATIO = 10000;

    /// @notice Baz puan çarpanı (%100 = 10000)
    uint256 public constant BASIS_POINTS = 10000;

    // ========================================================================
    // Durum Değişkenleri (State Variables)
    // ========================================================================
    //
    // Monad Paralel Execution Notu:
    //   Monad, farklı storage slot'larına yazan işlemleri paralel çalıştırır.
    //   Aşağıdaki mapping'ler kullanıcı bazında izole olduğundan,
    //   farklı kullanıcıların işlemleri birbirini engellemez.
    //
    //   Ancak totalDeposits ve totalBorrows gibi global değişkenler
    //   paralel çakışmaya neden olabilir. Bu nedenle bu değişkenlerin
    //   güncellenmesi dikkatli yapılmalıdır.
    // ========================================================================

    /// @notice ZK proof doğrulayıcı kontrat adresi
    /// @dev IVerifier interface'ini implemente eden kontrat.
    ///      Production'da ZK devre derlemesinden üretilen verifier,
    ///      test'te MockVerifier kullanılır.
    IVerifier public immutable verifier;

    /// @notice Kontrat sahibi (admin işlemleri için)
    address public owner;

    // --- Kullanıcı Bazlı State (Paralel Execution İçin Optimize) ---

    /// @notice Her kullanıcının yatırdığı teminat miktarı (wei)
    /// @dev [FHE_SLOT]: Aşama 2'de euint64 olarak şifrelenecek
    mapping(address => uint256) public collateral;

    /// @notice Her kullanıcının toplam borç miktarı (wei)
    /// @dev [FHE_SLOT]: Aşama 2'de euint64 olarak şifrelenecek
    mapping(address => uint256) public debt;

    /// @notice Kullanıcının ZK proof ile borç alıp almadığı
    /// @dev true ise kullanıcı indirimli teminat oranından faydalanıyor
    mapping(address => bool) public hasZKBorrow;

    /// @notice Kullanıcının kayıtlı commitment hash'i
    /// @dev ZK devresindeki secret_hash ile eşleşmeli.
    ///      Replay saldırılarını önler: her kullanıcının benzersiz commitment'ı var.
    mapping(address => bytes32) public commitments;

    // --- Global Havuz State ---

    /// @notice Havuzdaki toplam mevduat (wei)
    uint256 public totalDeposits;

    /// @notice Havuzdan çekilen toplam borç (wei)
    uint256 public totalBorrows;

    // ========================================================================
    // Reentrancy Koruması
    // ========================================================================
    //
    // OpenZeppelin'in ReentrancyGuard'ını manuel olarak implemente ediyoruz.
    // Sebep: Minimal bağımlılık, hackathon hızı, ve tam kontrol.
    //
    // Reentrancy saldırısı: Kötü niyetli kontrat, ETH transferi sırasında
    // fallback fonksiyonu ile lending kontratını tekrar çağırır ve
    // fonlar tükenmeden önce birden fazla çekim yapar.
    //
    // Koruma mekanizması: Fonksiyon giriş/çıkışında kilit (mutex) kullanılır.
    // ========================================================================

    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private _status;

    /// @dev Reentrancy kilidini kontrol eder
    modifier nonReentrant() {
        require(_status != ENTERED, "ReentrancyGuard: reentrant call");
        _status = ENTERED;
        _;
        _status = NOT_ENTERED;
    }

    /// @dev Sadece owner çağırabilir
    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    // ========================================================================
    // Olaylar (Events)
    // ========================================================================
    //
    // Event'ler off-chain indexer'lar (The Graph, Goldsky vb.) tarafından
    // dinlenir. Front-end bu event'leri kullanarak UI'ı günceller.
    //
    // Monad'da event'ler paralel execution'ı etkilemez çünkü
    // log'lar state'den bağımsızdır.
    // ========================================================================

    /// @notice Teminat yatırıldığında tetiklenir
    event Deposited(address indexed user, uint256 amount);

    /// @notice Teminat çekildiğinde tetiklenir
    event Withdrawn(address indexed user, uint256 amount);

    /// @notice Standart borç alındığında tetiklenir
    event Borrowed(address indexed user, uint256 amount);

    /// @notice ZK proof ile eksik teminatlı borç alındığında tetiklenir
    /// @param user Borç alan kullanıcı
    /// @param amount Borç miktarı (wei)
    /// @param collateralRatio Uygulanan teminat oranı (baz puan)
    event ZKBorrowed(address indexed user, uint256 amount, uint256 collateralRatio);

    /// @notice Borç ödendiğinde tetiklenir
    event Repaid(address indexed user, uint256 amount);

    /// @notice Kullanıcı commitment'ını kaydettiğinde tetiklenir
    event CommitmentRegistered(address indexed user, bytes32 commitmentHash);

    /// @notice Verifier kontratı güncellendiğinde tetiklenir
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    // ========================================================================
    // Constructor
    // ========================================================================

    /// @notice ObscuraLending kontratını başlatır
    /// @param _verifier ZK proof doğrulayıcı kontrat adresi
    /// @dev Verifier adresi immutable'dır, deploy sonrası değiştirilemez.
    ///      Güvenlik nedeniyle: Verifier değişikliği, yeni deploy gerektirir.
    constructor(address _verifier) {
        if (_verifier == address(0)) revert ObscuraErrors.ZeroAddress();

        verifier = IVerifier(_verifier);
        owner = msg.sender;
        _status = NOT_ENTERED;
    }

    // ========================================================================
    // Teminat Fonksiyonları
    // ========================================================================

    /// @notice Havuza teminat (ETH) yatırır
    /// @dev Kullanıcı msg.value kadar ETH gönderir, teminat bakiyesi artar.
    ///
    /// Monad Notu: Bu fonksiyon sadece msg.sender'ın storage slot'unu günceller.
    ///             Farklı kullanıcıların deposit işlemleri paralel çalışabilir.
    ///
    /// [FHE_SLOT]: Aşama 2'de collateral[msg.sender] yerine
    ///             TFHE.asEuint64(msg.value) kullanılacak.
    ///             Teminat miktarı şifreli olarak saklanacak.
    function deposit() external payable nonReentrant {
        if (msg.value == 0) revert ObscuraErrors.ZeroAmount();

        // Kullanıcının teminat bakiyesini güncelle
        collateral[msg.sender] += msg.value;

        // Global havuz miktarını güncelle
        totalDeposits += msg.value;

        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Havuzdan teminat (ETH) çeker
    /// @param amount Çekilecek miktar (wei)
    /// @dev Kullanıcının borcu varsa, kalan teminat borcu karşılamalıdır.
    ///
    /// Güvenlik: nonReentrant modifier ile reentrancy saldırısı önlenir.
    ///           ETH transferi, state güncellemesinden SONRA yapılır
    ///           (Checks-Effects-Interactions pattern).
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ObscuraErrors.ZeroAmount();

        uint256 userCollateral = collateral[msg.sender];
        uint256 userDebt = debt[msg.sender];

        // Çekilecek miktarın mevcut teminatı aşmadığını kontrol et
        require(amount <= userCollateral, "Yetersiz teminat");

        // Eğer kullanıcının borcu varsa, kalan teminat borcu karşılamalı
        if (userDebt > 0) {
            uint256 remainingCollateral = userCollateral - amount;
            uint256 ratio = hasZKBorrow[msg.sender]
                ? ZK_COLLATERAL_RATIO
                : STANDARD_COLLATERAL_RATIO;
            uint256 requiredCollateral = (userDebt * ratio) / BASIS_POINTS;

            if (remainingCollateral < requiredCollateral) {
                revert ObscuraErrors.InsufficientCollateral(
                    requiredCollateral,
                    remainingCollateral
                );
            }
        }

        // === Checks-Effects-Interactions Pattern ===
        // Önce state'i güncelle (Effect)
        collateral[msg.sender] -= amount;
        totalDeposits -= amount;

        // Sonra ETH'i gönder (Interaction)
        // Bu sıralama reentrancy saldırısını engeller
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transferi basarisiz");

        emit Withdrawn(msg.sender, amount);
    }

    // ========================================================================
    // Borçlanma Fonksiyonları
    // ========================================================================

    /// @notice Standart borç alır (tam teminat gerektirir)
    /// @param amount Borç alınacak miktar (wei)
    /// @dev %150 teminat oranı uygulanır.
    ///      Örnek: 1 ETH borç = minimum 1.5 ETH teminat.
    function borrow(uint256 amount) external nonReentrant {
        if (amount == 0) revert ObscuraErrors.ZeroAmount();

        // Havuzda yeterli likidite var mı kontrol et
        uint256 availableLiquidity = totalDeposits - totalBorrows;
        if (amount > availableLiquidity) {
            revert ObscuraErrors.InsufficientLiquidity(amount, availableLiquidity);
        }

        // Teminat yeterliliğini kontrol et (%150 standart oran)
        uint256 totalDebtAfter = debt[msg.sender] + amount;
        uint256 requiredCollateral = (totalDebtAfter * STANDARD_COLLATERAL_RATIO)
            / BASIS_POINTS;

        if (collateral[msg.sender] < requiredCollateral) {
            revert ObscuraErrors.InsufficientCollateral(
                requiredCollateral,
                collateral[msg.sender]
            );
        }

        // State güncelle
        debt[msg.sender] += amount;
        totalBorrows += amount;

        // ETH transferi (Checks-Effects-Interactions)
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transferi basarisiz");

        emit Borrowed(msg.sender, amount);
    }

    // ========================================================================
    // ZK Tabanlı Eksik Teminatlı Borçlanma (Kritik Fonksiyon)
    // ========================================================================
    //
    //                    ┌─────────────────────────────┐
    //                    │     borrowWithZKProof()      │
    //                    └──────────────┬──────────────┘
    //                                   │
    //                    ┌──────────────▼──────────────┐
    //                    │  1. Commitment kontrolü     │
    //                    │     (replay koruması)        │
    //                    └──────────────┬──────────────┘
    //                                   │
    //                    ┌──────────────▼──────────────┐
    //                    │  2. ZK Proof doğrulaması    │
    //                    │     (IVerifier.verify())     │
    //                    └──────────────┬──────────────┘
    //                                   │
    //                    ┌──────────────▼──────────────┐
    //                    │  3. Likidite kontrolü       │
    //                    └──────────────┬──────────────┘
    //                                   │
    //                    ┌──────────────▼──────────────┐
    //                    │  4. Teminat kontrolü (%100) │
    //                    │     (ZK indirimli oran)      │
    //                    └──────────────┬──────────────┘
    //                                   │
    //                    ┌──────────────▼──────────────┐
    //                    │  5. Borç ver & ETH transfer  │
    //                    └─────────────────────────────┘
    //
    // ========================================================================

    /// @notice ZK proof ile eksik teminatlı borç alır
    /// @dev Bu fonksiyon, Obscura Finance'in temel yeniliğidir.
    ///      Kullanıcı, kredi skorunun minimum eşiği karşıladığını
    ///      ZK proof ile kanıtlar ve %100 teminat oranıyla borç alır.
    ///
    /// @param amount Borç alınacak miktar (wei)
    /// @param zkProof ZK devresinden üretilen serileştirilmiş proof
    /// @param publicInputs Devrenin public girdileri:
    ///        publicInputs[0] = minScore (bytes32 olarak kodlanmış)
    ///        publicInputs[1] = secretHash (kullanıcının commitment'ı)
    ///
    /// Güvenlik Katmanları:
    ///   1. nonReentrant: Reentrancy saldırısını engeller
    ///   2. Commitment kontrolü: Replay saldırılarını önler
    ///   3. ZK doğrulama: Sahte proof'ları reddeder
    ///   4. Teminat kontrolü: Yetersiz teminatı engeller
    ///   5. CEI pattern: State güncelleme -> ETH transfer sıralaması
    ///
    /// [FHE_SLOT]: Aşama 2'de amount parametresi TFHE.asEuint64(amount)
    ///             ile şifrelenecek. Teminat kontrolü FHE üzerinden yapılacak.
    function borrowWithZKProof(
        uint256 amount,
        bytes calldata zkProof,
        bytes32[] calldata publicInputs
    ) external nonReentrant {
        // -----------------------------------------------------------------
        // Adım 1: Temel girdi doğrulaması
        // -----------------------------------------------------------------
        if (amount == 0) revert ObscuraErrors.ZeroAmount();

        // Kullanıcının zaten ZK-borcu olup olmadığını kontrol et.
        // MVP'de her kullanıcı aynı anda sadece bir ZK-borç alabilir.
        // Bu kısıtlama, risk yönetimini basitleştirir.
        if (hasZKBorrow[msg.sender]) revert ObscuraErrors.ExistingZKDebt();

        // -----------------------------------------------------------------
        // Adım 2: Commitment doğrulaması (replay koruması)
        // -----------------------------------------------------------------
        // Kullanıcının daha önce kaydettiği commitment hash'i,
        // ZK proof'taki public input ile eşleşmeli.
        //
        // Bu sayede:
        //   - Bir kullanıcının proof'u başka biri tarafından kullanılamaz
        //   - Aynı proof tekrar kullanılamaz (çünkü hasZKBorrow kontrolü var)
        // -----------------------------------------------------------------
        require(publicInputs.length >= 2, "Yetersiz public input");
        bytes32 proofCommitment = publicInputs[1];
        require(
            commitments[msg.sender] == proofCommitment,
            "Commitment uyusmasi"
        );

        // -----------------------------------------------------------------
        // Adım 3: ZK Proof doğrulaması (on-chain verification)
        // -----------------------------------------------------------------
        // IVerifier kontratı üzerinden proof doğrulanır.
        //
        // Production'da bu çağrı ~200k-300k gas harcar (Groth16).
        // Monad'ın yüksek throughput'u sayesinde bu maliyet kabul edilebilir.
        //
        // Verifier kontratı, devrenin doğrulama anahtarını (vk) içerir
        // ve matematiksel olarak proof'un geçerli bir witness'tan
        // üretildiğini doğrular.
        // -----------------------------------------------------------------
        bool isValidProof = verifier.verify(zkProof, publicInputs);
        if (!isValidProof) revert ObscuraErrors.InvalidZKProof();

        // -----------------------------------------------------------------
        // Adım 4: Havuz likidite kontrolü
        // -----------------------------------------------------------------
        uint256 availableLiquidity = totalDeposits - totalBorrows;
        if (amount > availableLiquidity) {
            revert ObscuraErrors.InsufficientLiquidity(amount, availableLiquidity);
        }

        // -----------------------------------------------------------------
        // Adım 5: Teminat yeterliliği kontrolü (ZK indirimli oran: %100)
        // -----------------------------------------------------------------
        // ZK proof ile doğrulanmış kullanıcılar %100 teminat oranından
        // faydalanır (standart %150 yerine).
        //
        // Örnek:
        //   Standart: 1 ETH borç = 1.5 ETH teminat gerekir
        //   ZK:       1 ETH borç = 1.0 ETH teminat yeterli
        //
        // [FHE_SLOT]: Aşama 2'de bu hesaplama TFHE.le() ile
        //             şifreli olarak yapılacak. Tasfiye eşiği
        //             bile gizli kalacak.
        // -----------------------------------------------------------------
        uint256 totalDebtAfter = debt[msg.sender] + amount;
        uint256 requiredCollateral = (totalDebtAfter * ZK_COLLATERAL_RATIO)
            / BASIS_POINTS;

        if (collateral[msg.sender] < requiredCollateral) {
            revert ObscuraErrors.InsufficientCollateral(
                requiredCollateral,
                collateral[msg.sender]
            );
        }

        // -----------------------------------------------------------------
        // Adım 6: State güncelleme (Effects - CEI pattern)
        // -----------------------------------------------------------------
        // Tüm kontroller geçtikten sonra state güncellenir.
        // ETH transferinden ÖNCE güncelleme yapılarak
        // reentrancy saldırısı önlenir.
        // -----------------------------------------------------------------
        debt[msg.sender] += amount;
        totalBorrows += amount;
        hasZKBorrow[msg.sender] = true;

        // -----------------------------------------------------------------
        // Adım 7: ETH transferi (Interactions - CEI pattern)
        // -----------------------------------------------------------------
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transferi basarisiz");

        emit ZKBorrowed(msg.sender, amount, ZK_COLLATERAL_RATIO);
    }

    // ========================================================================
    // Borç Ödeme
    // ========================================================================

    /// @notice Mevcut borcu öder
    /// @dev Kullanıcı msg.value kadar ETH göndererek borcunu azaltır.
    ///      Borç tamamen ödendiğinde hasZKBorrow flag'i sıfırlanır.
    ///
    /// [FHE_SLOT]: Aşama 2'de ödeme miktarı ve kalan borç
    ///             şifreli olarak hesaplanacak.
    function repay() external payable nonReentrant {
        if (msg.value == 0) revert ObscuraErrors.ZeroAmount();

        uint256 currentDebt = debt[msg.sender];
        require(currentDebt > 0, "Borcunuz bulunmuyor");

        // Fazla ödeme kontrolü: Borçtan fazla ödeme yapmayı engelle
        if (msg.value > currentDebt) {
            revert ObscuraErrors.ExcessiveRepayment(currentDebt, msg.value);
        }

        // Borç miktarını azalt
        debt[msg.sender] -= msg.value;
        totalBorrows -= msg.value;

        // Borç tamamen ödendiyse ZK-borrow flag'ini sıfırla
        // Bu sayede kullanıcı gelecekte yeni bir ZK-borç alabilir
        if (debt[msg.sender] == 0) {
            hasZKBorrow[msg.sender] = false;
        }

        // Ödenen miktar havuza geri eklenir (totalDeposits artmaz,
        // çünkü ödeme zaten mevcut likiditenin geri dönüşüdür)

        emit Repaid(msg.sender, msg.value);
    }

    // ========================================================================
    // Commitment Yönetimi
    // ========================================================================

    /// @notice Kullanıcının commitment hash'ini kaydeder
    /// @dev Bu hash, ZK devresindeki secret_hash ile eşleşmelidir.
    ///      Kullanıcı, front-end'de Pedersen/Poseidon hash hesaplayıp
    ///      bu fonksiyon ile on-chain'e kaydeder.
    ///
    /// Akış:
    ///   1. Kullanıcı rastgele bir secret seçer
    ///   2. Hash(secret) hesaplanır (off-chain)
    ///   3. Hash bu fonksiyon ile on-chain'e kaydedilir
    ///   4. ZK proof üretirken aynı secret kullanılır
    ///   5. borrowWithZKProof çağrılırken proof'taki hash ile eşleştirilir
    ///
    /// @param _commitment Kullanıcının secret'ının hash'i
    function registerCommitment(bytes32 _commitment) external {
        // Her adres sadece bir commitment kaydedebilir (güvenlik)
        if (commitments[msg.sender] != bytes32(0)) {
            revert ObscuraErrors.CommitmentAlreadyRegistered();
        }

        commitments[msg.sender] = _commitment;
        emit CommitmentRegistered(msg.sender, _commitment);
    }

    // ========================================================================
    // Görüntüleme Fonksiyonları (View)
    // ========================================================================

    /// @notice Kullanıcının mevcut sağlık faktörünü hesaplar
    /// @dev Sağlık faktörü = (teminat * BASIS_POINTS) / (borç * teminat_oranı)
    ///      > 1.0 (10000) ise pozisyon sağlıklı
    ///      < 1.0 (10000) ise tasfiye riski var
    ///
    /// @param user Sorgulanacak kullanıcı adresi
    /// @return healthFactor Sağlık faktörü (baz puan cinsinden, 10000 = 1.0)
    ///
    /// [FHE_SLOT]: Aşama 2'de bu fonksiyon TFHE.decrypt() ile
    ///             sadece kullanıcının kendisine görünür olacak.
    function getHealthFactor(address user) external view returns (uint256 healthFactor) {
        uint256 userDebt = debt[user];
        if (userDebt == 0) return type(uint256).max; // Borcu yoksa sonsuz sağlıklı

        uint256 ratio = hasZKBorrow[user] ? ZK_COLLATERAL_RATIO : STANDARD_COLLATERAL_RATIO;
        // healthFactor = (collateral * BASIS_POINTS) / (debt * ratio / BASIS_POINTS)
        // Sadeleştirilmiş: (collateral * BASIS_POINTS^2) / (debt * ratio)
        healthFactor = (collateral[user] * BASIS_POINTS * BASIS_POINTS) / (userDebt * ratio);
    }

    /// @notice Kullanıcının borç alabileceği maksimum miktarı hesaplar
    /// @param user Sorgulanacak kullanıcı adresi
    /// @return maxBorrow Maksimum borç miktarı (wei)
    function getMaxBorrow(address user) external view returns (uint256 maxBorrow) {
        uint256 ratio = hasZKBorrow[user] ? ZK_COLLATERAL_RATIO : STANDARD_COLLATERAL_RATIO;
        uint256 maxDebt = (collateral[user] * BASIS_POINTS) / ratio;

        if (maxDebt <= debt[user]) return 0;
        maxBorrow = maxDebt - debt[user];

        // Havuz likiditesini aşamaz
        uint256 availableLiquidity = totalDeposits - totalBorrows;
        if (maxBorrow > availableLiquidity) {
            maxBorrow = availableLiquidity;
        }
    }

    /// @notice Kullanıcının tüm pozisyon bilgilerini döndürür
    /// @param user Sorgulanacak kullanıcı adresi
    /// @return userCollateral Teminat miktarı (wei)
    /// @return userDebt Borç miktarı (wei)
    /// @return isZKBorrower ZK proof ile borç almış mı
    /// @return currentRatio Uygulanan teminat oranı (baz puan)
    function getUserPosition(address user)
        external
        view
        returns (
            uint256 userCollateral,
            uint256 userDebt,
            bool isZKBorrower,
            uint256 currentRatio
        )
    {
        userCollateral = collateral[user];
        userDebt = debt[user];
        isZKBorrower = hasZKBorrow[user];
        currentRatio = isZKBorrower ? ZK_COLLATERAL_RATIO : STANDARD_COLLATERAL_RATIO;
    }

    /// @notice Havuzun genel durumunu döndürür
    /// @return deposits Toplam mevduat (wei)
    /// @return borrows Toplam borç (wei)
    /// @return utilization Kullanım oranı (baz puan, 10000 = %100)
    function getPoolInfo()
        external
        view
        returns (
            uint256 deposits,
            uint256 borrows,
            uint256 utilization
        )
    {
        deposits = totalDeposits;
        borrows = totalBorrows;
        utilization = deposits > 0 ? (borrows * BASIS_POINTS) / deposits : 0;
    }

    // ========================================================================
    // Fallback
    // ========================================================================

    /// @notice Direkt ETH gönderimlerini deposit olarak işle
    receive() external payable {
        // Direkt gönderilen ETH'i teminat olarak kaydet
        if (msg.value > 0) {
            collateral[msg.sender] += msg.value;
            totalDeposits += msg.value;
            emit Deposited(msg.sender, msg.value);
        }
    }
}
