import { ZKBorrow } from '../components/ZKBorrow';
import { Repay } from '../components/Repay';
import { useAccount } from 'wagmi';
import { ConnectWallet } from '../components/ConnectWallet';

export function Borrow() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold text-text mb-4">Connect Wallet to Borrow</h2>
        <ConnectWallet />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 min-h-[calc(100vh-160px)]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text mb-2">Borrow & Repay</h1>
        <p className="text-text-dim">Take out loans privately using ZK proofs or manage existing debt.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <ZKBorrow />
        </div>
        <div>
          <Repay />
        </div>
      </div>
    </div>
  );
}
