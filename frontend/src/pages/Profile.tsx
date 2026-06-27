import { UserPosition } from '../components/UserPosition';
import { useAccount } from 'wagmi';
import { ConnectWallet } from '../components/ConnectWallet';

export function Profile() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold text-text mb-4">Connect Wallet to View Profile</h2>
        <ConnectWallet />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 min-h-[calc(100vh-160px)]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text mb-2">Dashboard</h1>
        <p className="text-text-dim">Your overall protocol position and ZK credit health.</p>
      </div>
      
      <UserPosition />
    </div>
  );
}
