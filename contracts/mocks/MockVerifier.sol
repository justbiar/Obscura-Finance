// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVerifier} from "../interfaces/IVerifier.sol";

// ============================================================================
// MockVerifier - Test ve Geliştirme Amaçlı Sahte Doğrulayıcı
// ============================================================================
//
// Bu kontrat, gerçek ZK verifier kontratının yerine SADECE geliştirme ve
// test ortamlarında kullanılır.
//
// ÖNEMLİ: Bu kontrat ASLA production'da deploy edilmemelidir!
//         Production'da, ZK devre derlemesinden üretilen gerçek verifier
//         kontratı kullanılmalıdır.
//
// Özellikler:
//   - Owner tarafından doğrulama sonucu kontrol edilebilir (test senaryoları)
//   - Varsayılan olarak tüm proof'ları kabul eder (geliştirme kolaylığı)
//   - Minimum proof uzunluğu kontrolü (temel format doğrulaması)
// ============================================================================

contract MockVerifier is IVerifier {
    // -----------------------------------------------------------------------
    // Durum Değişkenleri
    // -----------------------------------------------------------------------

    /// @notice Kontrat sahibi (test senaryolarını kontrol eder)
    address public owner;

    /// @notice true ise tüm proof'lar geçerli sayılır, false ise reddedilir
    bool public shouldVerify;

    /// @notice Minimum kabul edilebilir proof byte uzunluğu
    /// @dev Gerçek proof'lar genellikle 256+ byte uzunluğundadır
    uint256 public constant MIN_PROOF_LENGTH = 64;

    // -----------------------------------------------------------------------
    // Olaylar (Events)
    // -----------------------------------------------------------------------

    /// @notice Bir proof doğrulama denemesi yapıldığında tetiklenir
    /// @param caller Doğrulama isteğinde bulunan adres
    /// @param result Doğrulama sonucu (true/false)
    /// @param publicInputCount Public girdi sayısı
    event VerificationAttempted(
        address indexed caller,
        bool result,
        uint256 publicInputCount
    );

    // -----------------------------------------------------------------------
    // Hatalar (Custom Errors)
    // -----------------------------------------------------------------------

    /// @notice Sadece owner çağırabilecek fonksiyonlar için
    error OnlyOwner();

    /// @notice Proof byte dizisi çok kısa olduğunda
    error ProofTooShort(uint256 provided, uint256 minimum);

    /// @notice Public input sayısı yetersiz olduğunda
    error InsufficientPublicInputs(uint256 provided, uint256 required);

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    /// @notice MockVerifier'ı başlatır
    /// @dev Varsayılan olarak shouldVerify = true (tüm proof'ları kabul et)
    constructor() {
        owner = msg.sender;
        shouldVerify = true;
    }

    // -----------------------------------------------------------------------
    // Dış Fonksiyonlar
    // -----------------------------------------------------------------------

    /// @inheritdoc IVerifier
    /// @dev Mock implementasyon: shouldVerify durumuna göre sonuç döndürür
    ///      Temel format kontrollerini yapar (proof uzunluğu, input sayısı)
    function verify(
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external view override returns (bool isValid) {
        // Temel format doğrulaması: Proof en az MIN_PROOF_LENGTH byte olmalı
        if (proof.length < MIN_PROOF_LENGTH) {
            revert ProofTooShort(proof.length, MIN_PROOF_LENGTH);
        }

        // Kredi skoru devresi için en az 2 public input gerekli:
        //   [0] = minScore, [1] = secretHash
        if (publicInputs.length < 2) {
            revert InsufficientPublicInputs(publicInputs.length, 2);
        }

        // Mock sonuç: shouldVerify değerine göre kabul/red
        return shouldVerify;
    }

    // -----------------------------------------------------------------------
    // Admin Fonksiyonları (Sadece Test İçin)
    // -----------------------------------------------------------------------

    /// @notice Doğrulama sonucunu değiştirir (test senaryoları için)
    /// @param _shouldVerify true = tüm proof'ları kabul et, false = reddet
    function setShouldVerify(bool _shouldVerify) external {
        if (msg.sender != owner) revert OnlyOwner();
        shouldVerify = _shouldVerify;
    }
}
