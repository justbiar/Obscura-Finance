import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { formatEther } from 'viem';

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {balance && (
          <span className="hidden sm:inline px-3 py-2 bg-surface-2 border border-border rounded-xl text-text-secondary text-sm font-medium">
            {Number(formatEther(balance.value)).toFixed(2)} MON
          </span>
        )}
        <button
          onClick={() => disconnect()}
          className="flex items-center gap-2 px-4 py-2 bg-surface-2 border border-border hover:border-accent/40 rounded-xl transition-colors group"
        >
          <span className="w-2 h-2 bg-green rounded-full" />
          <span className="text-text text-sm font-medium group-hover:text-accent transition-colors">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      className="px-6 py-2.5 bg-accent text-obsidian font-semibold text-sm rounded-xl hover:bg-accent-bright transition-colors glow-accent"
    >
      Connect Wallet
    </button>
  );
}
