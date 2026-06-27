import { DepositWithdraw } from '../components/DepositWithdraw';
import { useAccount } from 'wagmi';
import { ConnectWallet } from '../components/ConnectWallet';

export function Lend() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold text-text mb-4">Connect Wallet to Lend</h2>
        <ConnectWallet />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 min-h-[calc(100vh-160px)]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text mb-2">Supply Assets</h1>
        <p className="text-text-dim">Deposit MON to act as liquidity and your collateral base.</p>
      </div>
      <div className="max-w-2xl">
        <DepositWithdraw />
      </div>
    </div>
  );
}
