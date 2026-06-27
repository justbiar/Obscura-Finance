// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ============================================================================
// IVerifier - ZK Proof Doğrulayıcı Arayüzü
// ============================================================================
//
// Bu interface, ZK devresinden (Noir/Circom) üretilen proof'ları on-chain'de
// doğrulamak için standart bir sözleşme tanımlar.
//
// Gerçek implementasyon, devre derlemesinden sonra otomatik olarak üretilir:
//   - Noir: `nargo codegen-verifier` komutu ile Solidity verifier üretilir
//   - Circom: `snarkjs zkey export solidityverifier` ile üretilir
//
// Bu interface sayesinde:
//   1. ObscuraLending kontratı, hangi proof sistemi kullanılırsa kullanılsın
//      aynı arayüz üzerinden doğrulama yapabilir.
//   2. Verifier kontratı, lending kontratından bağımsız olarak
//      güncellenebilir (upgrade edilebilir).
//   3. Test ortamında MockVerifier kullanılarak geliştirme kolaylaşır.
// ============================================================================

interface IVerifier {
    /// @notice ZK proof'unu doğrular
    /// @dev Proof formatı kullanılan ZK sistemine göre değişir:
    ///      - Noir/UltraPlonk: Serileştirilmiş proof byte dizisi
    ///      - Circom/Groth16: [pi_a, pi_b, pi_c] noktaları
    ///
    /// @param proof ZK devresinden üretilen serileştirilmiş proof verisi
    /// @param publicInputs Devrenin public (açık) girdileri
    ///        publicInputs[0] = minScore (minimum kredi skoru eşiği)
    ///        publicInputs[1] = secretHash (kullanıcının commitment hash'i)
    ///
    /// @return isValid Proof geçerliyse true, değilse false
    function verify(
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external view returns (bool isValid);
}
