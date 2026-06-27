import { useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { LENDING_ADDRESS, LENDING_ABI } from '../config/contracts';

export function PoolInfo() {
  const { data } = useReadContracts({
    contracts: [
      { address: LENDING_ADDRESS, abi: LENDING_ABI, functionName: 'totalDeposits' },
      { address: LENDING_ADDRESS, abi: LENDING_ABI, functionName: 'totalBorrows' },
      { address: LENDING_ADDRESS, abi: LENDING_ABI, functionName: 'getPoolInfo' },
    ],
    query: { refetchInterval: 4000 },
  });

  const totalDeposits = data?.[0]?.result as bigint | undefined;
  const totalBorrows = data?.[1]?.result as bigint | undefined;
  const poolInfo = data?.[2]?.result as [bigint, bigint, bigint] | undefined;
  const utilization = poolInfo?.[2];
  const utilizationPct = utilization !== undefined ? Number(utilization) / 100 : 0;

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-text">Lending Pool</h2>
        <span className="px-3 py-1 bg-green/[0.08] border border-green/20 rounded-full text-green text-xs font-medium">
          Live
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-2 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal">
                <path d="M12 2v20M2 12h20" />
              </svg>
            </div>
            <span className="text-text-dim text-xs uppercase tracking-wider">Total Deposits</span>
          </div>
          <p className="text-2xl font-bold text-text">
            {totalDeposits !== undefined ? Number(formatEther(totalDeposits)).toFixed(2) : '0.00'}
            <span className="text-text-dim text-sm font-medium ml-1">MON</span>
          </p>
        </div>

        <div className="bg-surface-2 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" />
                <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
              </svg>
            </div>
            <span className="text-text-dim text-xs uppercase tracking-wider">Total Borrows</span>
          </div>
          <p className="text-2xl font-bold text-text">
            {totalBorrows !== undefined ? Number(formatEther(totalBorrows)).toFixed(2) : '0.00'}
            <span className="text-text-dim text-sm font-medium ml-1">MON</span>
          </p>
        </div>

        <div className="bg-surface-2 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-text-dim text-xs uppercase tracking-wider">Utilization</span>
          </div>
          <p className="text-2xl font-bold text-text">
            {utilizationPct.toFixed(1)}<span className="text-text-dim text-sm font-medium">%</span>
          </p>
          <div className="mt-3 h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal to-accent rounded-full transition-all duration-500"
              style={{ width: `${Math.min(utilizationPct, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
