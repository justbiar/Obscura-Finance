import { useAccount, useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { LENDING_ADDRESS, LENDING_ABI } from '../config/contracts';

export function UserPosition() {
  const { address, isConnected } = useAccount();

  const { data } = useReadContracts({
    contracts: address ? [
      { address: LENDING_ADDRESS, abi: LENDING_ABI, functionName: 'getUserPosition', args: [address] },
      { address: LENDING_ADDRESS, abi: LENDING_ABI, functionName: 'getHealthFactor', args: [address] },
      { address: LENDING_ADDRESS, abi: LENDING_ABI, functionName: 'commitments', args: [address] },
    ] : [],
    query: { refetchInterval: 4000 },
  });

  if (!isConnected) return null;

  const position = data?.[0]?.result as [bigint, bigint, boolean, bigint] | undefined;
  const healthFactor = data?.[1]?.result as bigint | undefined;
  const commitment = data?.[2]?.result as `0x${string}` | undefined;

  const collateral = position?.[0] ?? 0n;
  const debt = position?.[1] ?? 0n;
  const isZK = position?.[2];
  const hasCommitment = commitment && commitment !== '0x0000000000000000000000000000000000000000000000000000000000000000';

  // Client-side max borrow calc
  const standardMax = collateral * 10000n / 15000n; // 150% ratio
  const zkMax = collateral; // 100% ratio
  const standardAvail = standardMax > debt ? standardMax - debt : 0n;
  const zkAvail = zkMax > debt ? zkMax - debt : 0n;

  const isInfinite = healthFactor !== undefined && healthFactor > BigInt(1e18);
  const hfValue = healthFactor !== undefined
    ? isInfinite ? '∞' : (Number(healthFactor) / 10000).toFixed(2)
    : '—';
  const hfColor = healthFactor !== undefined
    ? isInfinite ? 'text-green'
    : Number(healthFactor) >= 12000 ? 'text-green'
    : Number(healthFactor) >= 10000 ? 'text-accent'
    : 'text-red'
    : 'text-text-dim';

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-text">Your Position</h2>
        <div className="flex items-center gap-2">
          {isZK && (
            <span className="px-3 py-1 bg-accent/[0.1] border border-accent/25 rounded-full text-accent text-xs font-semibold">
              ZK Borrower
            </span>
          )}
          {hasCommitment && (
            <span className="px-3 py-1 bg-teal/[0.08] border border-teal/20 rounded-full text-teal text-xs font-medium">
              Committed
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-surface-2 rounded-xl p-4">
          <p className="text-text-dim text-xs uppercase tracking-wider mb-2">Collateral</p>
          <p className="text-xl font-bold text-text">
            {Number(formatEther(collateral)).toFixed(4)}
          </p>
          <p className="text-text-dim text-xs mt-0.5">MON</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-4">
          <p className="text-text-dim text-xs uppercase tracking-wider mb-2">Debt</p>
          <p className="text-xl font-bold text-text">
            {Number(formatEther(debt)).toFixed(4)}
          </p>
          <p className="text-text-dim text-xs mt-0.5">MON</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-4">
          <p className="text-text-dim text-xs uppercase tracking-wider mb-2">Health Factor</p>
          <p className={`text-xl font-bold ${hfColor}`}>{hfValue}</p>
          <p className="text-text-dim text-xs mt-0.5">min 1.00</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-4">
          <p className="text-text-dim text-xs uppercase tracking-wider mb-2">Standard Max</p>
          <p className="text-xl font-bold text-text-secondary">
            {Number(formatEther(standardAvail)).toFixed(4)}
          </p>
          <p className="text-text-dim text-xs mt-0.5">150% ratio</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 border border-accent/20">
          <p className="text-accent text-xs uppercase tracking-wider mb-2 font-medium">ZK Max</p>
          <p className="text-xl font-bold text-accent">
            {Number(formatEther(zkAvail)).toFixed(4)}
          </p>
          <p className="text-text-dim text-xs mt-0.5">100% ratio</p>
        </div>
      </div>
    </div>
  );
}
