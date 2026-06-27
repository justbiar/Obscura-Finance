#!/bin/bash
# ============================================================================
# Obscura Finance - Localhost Demo Akisi
# ============================================================================
# Bu script, tum protokol akisini local Anvil node uzerinde gosterir:
#   1. Likidite saglayici (Bob) havuza ETH yatirir
#   2. Borclanan (Alice) teminat yatirir
#   3. Alice commitment kaydeder
#   4. Alice ZK proof ile eksik teminatli borc alir
#   5. Alice borcunu oder
# ============================================================================

set -e

RPC="http://127.0.0.1:8545"
LENDING="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
VERIFIER="0x5FbDB2315678afecb367f032d93F642f64180aa3"

# Anvil default hesaplari
ALICE_KEY="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
BOB_KEY="0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"

DEPLOYER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
ALICE="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
BOB="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"

# Helper: cast call ciktisindaki "12345 [1.2e4]" formatindan sayi cikar ve ETH'e cevir
to_eth() {
  local raw="$1"
  local clean=$(echo "$raw" | awk '{print $1}')
  cast from-wei "$clean" 2>/dev/null || echo "$clean"
}

echo "============================================"
echo "  OBSCURA FINANCE - LOCAL DEMO"
echo "============================================"
echo ""
echo "Kontrat Adresleri:"
echo "  MockVerifier  : $VERIFIER"
echo "  ObscuraLending: $LENDING"
echo "  Deployer      : $DEPLOYER"
echo "  Alice (borclanan): $ALICE"
echo "  Bob (likidite)   : $BOB"
echo ""

# -----------------------------------------------------------------------
# ADIM 1: Bob havuza 50 ETH likidite yatirir
# -----------------------------------------------------------------------
echo "--------------------------------------------"
echo "[1/7] Bob havuza 50 ETH yatiriyor (deposit)..."
echo "--------------------------------------------"
cast send --rpc-url $RPC --private-key $BOB_KEY \
  $LENDING "deposit()" --value 50ether > /dev/null 2>&1

BOB_COLLATERAL=$(cast call --rpc-url $RPC $LENDING "collateral(address)(uint256)" $BOB)
echo "  Bob teminat: $(to_eth "$BOB_COLLATERAL") ETH"
echo ""

# -----------------------------------------------------------------------
# ADIM 2: Alice 10 ETH teminat yatirir
# -----------------------------------------------------------------------
echo "--------------------------------------------"
echo "[2/7] Alice 10 ETH teminat yatiriyor..."
echo "--------------------------------------------"
cast send --rpc-url $RPC --private-key $ALICE_KEY \
  $LENDING "deposit()" --value 10ether > /dev/null 2>&1

ALICE_COLLATERAL=$(cast call --rpc-url $RPC $LENDING "collateral(address)(uint256)" $ALICE)
echo "  Alice teminat: $(to_eth "$ALICE_COLLATERAL") ETH"
echo ""

# -----------------------------------------------------------------------
# ADIM 3: Havuz durumunu kontrol et
# -----------------------------------------------------------------------
echo "--------------------------------------------"
echo "[3/7] Havuz durumu kontrol ediliyor..."
echo "--------------------------------------------"
TOTAL_DEP=$(cast call --rpc-url $RPC $LENDING "totalDeposits()(uint256)")
TOTAL_BOR=$(cast call --rpc-url $RPC $LENDING "totalBorrows()(uint256)")
echo "  Toplam mevduat : $(to_eth "$TOTAL_DEP") ETH"
echo "  Toplam borc    : $(to_eth "$TOTAL_BOR") ETH"

MAX_BORROW_STD=$(cast call --rpc-url $RPC $LENDING "getMaxBorrow(address)(uint256)" $ALICE)
echo "  Alice max standart borc: $(to_eth "$MAX_BORROW_STD") ETH"
echo "  (Standart %150 teminat: 10 ETH ile max ~6.66 ETH)"
echo ""

# -----------------------------------------------------------------------
# ADIM 4: Alice commitment kaydeder
# -----------------------------------------------------------------------
echo "--------------------------------------------"
echo "[4/7] Alice commitment hash kaydediyor..."
echo "--------------------------------------------"
COMMITMENT=$(cast keccak "alice_secret_key_12345")
echo "  Commitment hash: $COMMITMENT"

cast send --rpc-url $RPC --private-key $ALICE_KEY \
  $LENDING "registerCommitment(bytes32)" $COMMITMENT > /dev/null 2>&1

STORED=$(cast call --rpc-url $RPC $LENDING "commitments(address)(bytes32)" $ALICE)
echo "  Kaydedilen: $STORED"
echo ""

# -----------------------------------------------------------------------
# ADIM 5: Alice ZK proof ile 8 ETH borc alir (eksik teminatli!)
# -----------------------------------------------------------------------
echo "============================================"
echo "[5/7] KRITIK: Alice ZK Proof ile borc aliyor!"
echo "============================================"
echo ""
echo "  Standart borclama: 10 ETH teminat -> max 6.66 ETH"
echo "  ZK borclama:       10 ETH teminat -> max 10 ETH"
echo "  Alice 8 ETH istiyor (standart ile IMKANSIZ, ZK ile MUMKUN)"
echo ""

# Mock proof olustur (128 byte)
MOCK_PROOF="0x$(python3 -c "print('aa' * 128)")"

# Public inputs: [minScore=750, commitmentHash]
MIN_SCORE_B32=$(cast to-bytes32 750)

cast send --rpc-url $RPC --private-key $ALICE_KEY \
  $LENDING "borrowWithZKProof(uint256,bytes,bytes32[])" \
  8ether \
  $MOCK_PROOF \
  "[$MIN_SCORE_B32,$COMMITMENT]" \
  > /dev/null 2>&1

echo "  >>> ZK Borc BASARILI! <<<"
echo ""

ALICE_DEBT=$(cast call --rpc-url $RPC $LENDING "debt(address)(uint256)" $ALICE)
echo "  Alice borc: $(to_eth "$ALICE_DEBT") ETH"

HAS_ZK=$(cast call --rpc-url $RPC $LENDING "hasZKBorrow(address)(bool)" $ALICE)
echo "  ZK Borrower: $HAS_ZK"

HF=$(cast call --rpc-url $RPC $LENDING "getHealthFactor(address)(uint256)" $ALICE)
HF_CLEAN=$(echo "$HF" | awk '{print $1}')
echo "  Saglik Faktoru: $HF_CLEAN (10000 = 1.0x, su an 1.25x)"
echo ""

# -----------------------------------------------------------------------
# ADIM 6: Alice pozisyonunu goruntule
# -----------------------------------------------------------------------
echo "--------------------------------------------"
echo "[6/7] Alice pozisyon detaylari..."
echo "--------------------------------------------"
A_COL=$(cast call --rpc-url $RPC $LENDING "collateral(address)(uint256)" $ALICE)
A_DEBT=$(cast call --rpc-url $RPC $LENDING "debt(address)(uint256)" $ALICE)
A_ZK=$(cast call --rpc-url $RPC $LENDING "hasZKBorrow(address)(bool)" $ALICE)
ALICE_BAL=$(cast balance --rpc-url $RPC $ALICE)

echo "  Teminat      : $(to_eth "$A_COL") ETH"
echo "  Borc         : $(to_eth "$A_DEBT") ETH"
echo "  ZK Borrower  : $A_ZK"
echo "  Cuzdan       : $(to_eth "$ALICE_BAL") ETH"
echo ""

# -----------------------------------------------------------------------
# ADIM 7: Alice borcunu oder
# -----------------------------------------------------------------------
echo "--------------------------------------------"
echo "[7/7] Alice borcunu oduyor (8 ETH)..."
echo "--------------------------------------------"
cast send --rpc-url $RPC --private-key $ALICE_KEY \
  $LENDING "repay()" --value 8ether > /dev/null 2>&1

ALICE_DEBT_AFTER=$(cast call --rpc-url $RPC $LENDING "debt(address)(uint256)" $ALICE)
echo "  Alice kalan borc: $(to_eth "$ALICE_DEBT_AFTER") ETH"

HAS_ZK_AFTER=$(cast call --rpc-url $RPC $LENDING "hasZKBorrow(address)(bool)" $ALICE)
echo "  ZK Borrower (odeme sonrasi): $HAS_ZK_AFTER"

echo ""
echo "============================================"
echo "  DEMO TAMAMLANDI"
echo "============================================"
echo ""

# Final havuz durumu
FINAL_DEP=$(cast call --rpc-url $RPC $LENDING "totalDeposits()(uint256)")
FINAL_BOR=$(cast call --rpc-url $RPC $LENDING "totalBorrows()(uint256)")
echo "  Final Havuz:"
echo "    Toplam mevduat: $(to_eth "$FINAL_DEP") ETH"
echo "    Toplam borc   : $(to_eth "$FINAL_BOR") ETH"
echo ""
echo "  Tum islemler basariyla tamamlandi!"
echo "  Obscura Finance - Gizlilik Odakli Dark Lending"
