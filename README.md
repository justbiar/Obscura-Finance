# Obscura Finance

**Privacy-Preserving Dark Lending Protocol on Monad**

Obscura Finance enables undercollateralized borrowing through Zero-Knowledge proofs. Users prove their creditworthiness without revealing their identity or credit score, unlocking 100% collateral ratio instead of the standard 150%.

Built for the **Monad Hackathon 2025**.

---

## How It Works

1. **Deposit Collateral** - Add MON to the lending pool
2. **Register Commitment** - Submit `keccak256(secret)` on-chain (anti-replay)
3. **Generate ZK Proof** - Prove `credit_score >= 750` without revealing the actual score
4. **Borrow at 100%** - Get approved with reduced collateral (100% vs 150%)

Standard borrowers need 1.5 MON collateral per 1 MON borrowed. ZK-verified borrowers only need 1:1.

---

## Architecture

```
circuits/noir/          Noir ZK circuit (credit score verification)
contracts/
  ObscuraLending.sol    Main lending pool contract
  interfaces/           IVerifier interface
  verifier/             UltraVerifier (generated) + ObscuraVerifier (adapter)
  mocks/                MockVerifier for testing
  libraries/            Custom errors
frontend/               React + Vite + Tailwind + Wagmi v2
script/                 Foundry deploy scripts
test/                   28 Foundry tests
```

### ZK Circuit (Noir)

The circuit at `circuits/noir/src/main.nr` verifies:
- Credit score is in valid range (0-1000)
- Score meets minimum threshold (e.g., >= 750)
- Pedersen hash commitment matches (prevents replay attacks)

**Private inputs**: `credit_score`, `user_secret` (never revealed)
**Public inputs**: `min_score`, `secret_hash` (verified on-chain)

### Smart Contracts (Solidity 0.8.24)

**ObscuraLending.sol** - Core lending protocol:
- `deposit()` / `withdraw()` - Manage collateral
- `borrow()` - Standard 150% collateral borrowing
- `borrowWithZKProof()` - ZK-verified 100% collateral borrowing
- `repay()` - Repay debt (clears ZK flag when fully repaid)
- `registerCommitment()` - Store commitment hash for ZK verification
- Reentrancy protection, CEI pattern, custom errors for gas efficiency

**UltraVerifier.sol** - Auto-generated UltraPlonk verifier from Noir circuit compilation (via Barretenberg `bb`). Contains the verification key and pairing-based proof verification logic.

**ObscuraVerifier.sol** - Adapter wrapping UltraVerifier to implement the `IVerifier` interface. Uses try/catch so invalid proofs return `false` instead of reverting.

**MockVerifier.sol** - Testing verifier with configurable `setShouldVerify(bool)`.

### Frontend (React + Vite)

- **Wagmi v2 + Viem** for wallet connection and contract interaction
- **Tailwind CSS v4** with custom dark theme (Pera Wallet color palette)
- Components: ConnectWallet, PoolInfo, UserPosition, DepositWithdraw, ZKBorrow, Repay
- ZK flow: Register commitment -> Enter secret -> Generate proof -> Borrow

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Network | Monad Testnet (Chain ID: 10143) |
| ZK Circuit | Noir (Pedersen hash, UltraPlonk) |
| Smart Contracts | Solidity 0.8.24, Foundry |
| Proof System | UltraPlonk (Barretenberg) |
| Frontend | React, Vite, Tailwind CSS v4 |
| Web3 | Wagmi v2, Viem |
| Future | FHE (Zama fhEVM) - marked with `[FHE_SLOT]` |

---

## Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Noir](https://noir-lang.org/docs/getting_started/installation/) (nargo 0.33.0)
- [Barretenberg](https://github.com/AztecProtocol/aztec-packages) (bb 0.46.0)
- Node.js 18+

### Build & Test Smart Contracts

```bash
# Install dependencies
forge install

# Build
forge build

# Run tests (28 tests)
forge test

# Run tests with verbosity
forge test -vvv
```

### Compile ZK Circuit

```bash
cd circuits/noir

# Compile circuit
nargo compile

# Run circuit tests (6 tests)
nargo test

# Generate verification key
bb write_vk -b target/obscura_credit_score.json -o target/vk

# Generate Solidity verifier
bb contract -b target/obscura_credit_score.json -o target/Verifier.sol
```

### Run Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Deploy to Monad Testnet

```bash
# Deploy all contracts (UltraVerifier + ObscuraVerifier + ObscuraLending)
forge script script/Deploy.s.sol:DeployAll \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $PRIVATE_KEY \
  --broadcast

# Deploy with MockVerifier (for testing)
forge script script/Deploy.s.sol:DeployMock \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $PRIVATE_KEY \
  --broadcast
```

---

## Contract Constants

| Parameter | Value | Description |
|-----------|-------|-------------|
| `STANDARD_COLLATERAL_RATIO` | 15000 (150%) | Required for normal borrowing |
| `ZK_COLLATERAL_RATIO` | 10000 (100%) | Required with valid ZK proof |
| `BASIS_POINTS` | 10000 | 100% = 10000 basis points |
| Min Proof Length | 64 bytes | Minimum ZK proof size |

---

## Security

- **Reentrancy Guard**: Custom `nonReentrant` modifier on all state-changing functions
- **CEI Pattern**: Checks-Effects-Interactions ordering throughout
- **Custom Errors**: Gas-efficient error handling via `ObscuraErrors.sol`
- **Commitment Binding**: One-time commitment registration prevents replay attacks
- **Try/Catch Verification**: ObscuraVerifier catches reverts, returns false

---

## Monad Optimization

The contract isolates per-user state in separate mapping slots (`collateral`, `debt`, `commitments`, `hasZKBorrow`), enabling Monad's parallel EVM to execute independent user transactions concurrently without state conflicts.

---

## Roadmap

- **Phase 1 (Current)**: ZK credit score verification, undercollateralized lending
- **Phase 2**: FHE integration via Zama fhEVM - encrypt collateral/debt amounts on-chain (slots marked with `[FHE_SLOT]`)

---

## License

MIT
