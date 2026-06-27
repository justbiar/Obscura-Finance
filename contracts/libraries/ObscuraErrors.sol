// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ============================================================================
// ObscuraErrors - Merkezi Hata Tanımları
// ============================================================================
// Tüm Obscura kontratları tarafından paylaşılan custom error tanımları.
// Custom error'lar, string revert mesajlarına göre ~%50 daha az gas harcar.
// ============================================================================

library ObscuraErrors {
    /// @notice Sıfır adresine transfer/atama denemesi
    error ZeroAddress();

    /// @notice Sıfır miktarda işlem denemesi
    error ZeroAmount();

    /// @notice Havuzda yeterli likidite yok
    error InsufficientLiquidity(uint256 requested, uint256 available);

    /// @notice Kullanıcının teminatı yetersiz
    error InsufficientCollateral(uint256 required, uint256 provided);

    /// @notice ZK proof doğrulaması başarısız
    error InvalidZKProof();

    /// @notice Kullanıcının zaten aktif bir ZK-borcu var
    error ExistingZKDebt();

    /// @notice Kullanıcının ödenmemiş borcu var (withdraw engeli)
    error OutstandingDebt(uint256 debtAmount);

    /// @notice Borç miktarı, ödeme miktarından az
    error ExcessiveRepayment(uint256 debt, uint256 repayment);

    /// @notice Kullanıcının commitment'ı zaten kayıtlı
    error CommitmentAlreadyRegistered();
}
