// ============================================================================
// Obscura Finance - ZK Kredi Skoru Doğrulama Devresi (Circom)
// ============================================================================
//
// Noir devresinin Circom (circom 2.x / snarkjs) alternatifi.
// Groth16 veya PLONK proof sistemi ile kullanılabilir.
//
// Akış:
//   1. Kullanıcı, front-end'de kredi skorunu off-chain hesaplar.
//   2. Skor, private signal olarak devreye verilir.
//   3. Devre, skorun minimum eşiği karşıladığını ispatlayan proof üretir.
//   4. snarkjs ile üretilen verifier.sol kontratı on-chain deploy edilir.
//   5. ObscuraLending kontratı, proof'u bu verifier üzerinden doğrular.
//
// Derleme:
//   circom credit_score_verifier.circom --r1cs --wasm --sym -o build/
//   snarkjs groth16 setup build/credit_score_verifier.r1cs pot_final.ptau circuit.zkey
//   snarkjs zkey export verificationkey circuit.zkey verification_key.json
//   snarkjs zkey export solidityverifier circuit.zkey Verifier.sol
// ============================================================================

pragma circom 2.1.6;

include "circomlib/comparators.circom";
include "circomlib/poseidon.circom";

// ============================================================================
// Ana Şablon: CreditScoreVerifier
// ============================================================================
//
// Parametreler:
//   - SCORE_BITS: Skor değerlerinin bit genişliği (varsayılan 16 bit = max 65535)
//
// Private Sinyaller (Gizli - sadece prover bilir):
//   - creditScore: Kullanıcının gerçek kredi skoru
//   - userSecret: Kullanıcının gizli anahtarı (commitment için)
//
// Public Sinyaller (Açık - on-chain doğrulanır):
//   - minScore: Sistemin talep ettiği minimum skor
//   - commitmentHash: userSecret'in Poseidon hash'i
//   - isValid: Çıktı sinyali (1 = geçerli, 0 = geçersiz)
// ============================================================================
template CreditScoreVerifier(SCORE_BITS) {
    // === Gizli (Private) Girdiler ===
    signal input creditScore;
    signal input userSecret;

    // === Açık (Public) Girdiler ===
    signal input minScore;
    signal input commitmentHash;

    // === Çıktı ===
    signal output isValid;

    // -----------------------------------------------------------------------
    // Adım 1: Skor aralık kontrolü (0 <= score <= 1000)
    // -----------------------------------------------------------------------
    // LessEqThan, Circomlib'in karşılaştırma şablonudur.
    // SCORE_BITS bit genişliğinde çalışır.
    // creditScore <= 1000 olmalı.
    // -----------------------------------------------------------------------
    component upperBound = LessEqThan(SCORE_BITS);
    upperBound.in[0] <== creditScore;
    upperBound.in[1] <== 1000;

    // Skor 1000'den büyükse devre başarısız olur
    upperBound.out === 1;

    // -----------------------------------------------------------------------
    // Adım 2: Minimum skor eşik kontrolü
    // -----------------------------------------------------------------------
    // creditScore >= minScore kontrolü.
    // GreaterEqThan yerine LessEqThan tersine çevrilir:
    // minScore <= creditScore
    // -----------------------------------------------------------------------
    component minCheck = LessEqThan(SCORE_BITS);
    minCheck.in[0] <== minScore;
    minCheck.in[1] <== creditScore;

    // Minimum skor karşılanmıyorsa devre başarısız olur
    minCheck.out === 1;

    // -----------------------------------------------------------------------
    // Adım 3: Commitment (Taahhüt) Doğrulaması
    // -----------------------------------------------------------------------
    // Poseidon hash kullanarak userSecret'in commitment'ını doğrula.
    // Poseidon, ZK devreleri için optimize edilmiş bir hash fonksiyonudur.
    // Circom ekosisteminde Pedersen yerine Poseidon tercih edilir
    // çünkü daha az constraint üretir.
    //
    // Hash(userSecret) == commitmentHash olmalı.
    // -----------------------------------------------------------------------
    component hasher = Poseidon(1);
    hasher.inputs[0] <== userSecret;

    // Hesaplanan hash ile verilen commitment hash eşleşmeli
    component hashCheck = IsEqual();
    hashCheck.in[0] <== hasher.out;
    hashCheck.in[1] <== commitmentHash;

    // Hash uyuşmazlığı varsa devre başarısız olur
    hashCheck.out === 1;

    // -----------------------------------------------------------------------
    // Adım 4: Sonuç
    // -----------------------------------------------------------------------
    // Tüm kontroller geçtiyse isValid = 1
    // (Zaten assert'ler ile zorlanıyor, bu çıktı ek bilgi amaçlı)
    // -----------------------------------------------------------------------
    isValid <== upperBound.out * minCheck.out * hashCheck.out;
}

// ============================================================================
// Ana bileşen tanımı
// ============================================================================
// SCORE_BITS = 16: 16 bit, 0-65535 arası değerleri destekler (1000 yeterli)
// Public sinyaller: minScore, commitmentHash (on-chain doğrulama için açık)
// ============================================================================
component main { public [minScore, commitmentHash] } = CreditScoreVerifier(16);
