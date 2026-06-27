import { useState, useEffect } from 'react';
import { useAccount, useReadContracts, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { LENDING_ADDRESS, LENDING_ABI } from '../config/contracts';
import { monadTestnet } from '../config/wagmi';
import { calcCreditScore } from './ZKBorrow';

export function UserPosition() {
  const { address, isConnected } = useAccount();
  const [nonce, setNonce] = useState(0);
  const [isNonceLoaded, setIsNonceLoaded] = useState(false);

  const { data: balanceData, isLoading: isBalanceLoading } = useBalance({ address, chainId: monadTestnet.id });

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

  // Fetch nonce (transaction count)
  useEffect(() => {
    if (!address) return;
    setIsNonceLoaded(false);
    fetch(monadTestnet.rpcUrls.default.http[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getTransactionCount', params: [address, 'latest'], id: 1 }),
    })
      .then(r => r.json())
      .then(d => {
        setNonce(parseInt(d.result, 16));
        setIsNonceLoaded(true);
      })
      .catch(() => {
        setIsNonceLoaded(true);
      });
  }, [address]);

  const collateral = position?.[0] ?? 0n;
  const debt = position?.[1] ?? 0n;
  const isZK = position?.[2];
  const hasCommitment = commitment && commitment !== '0x0000000000000000000000000000000000000000000000000000000000000000';

  const balance = balanceData?.value ?? 0n;
  const isScoreLoading = isBalanceLoading || !isNonceLoaded;
  const score = calcCreditScore(balance, nonce, collateral);
  
  // Calculate dynamic ratio based on score
  // If score is 1000, ratio is 100%. If score is 750, ratio is 120%. If score < 750, ratio is 150%.
  const zkRatioPercent = score >= 750 ? Math.max(100, Math.min(120, 120 - ((score - 750) / 250) * 20)) : 150;
  // ratio format: e.g. 100% means 10000n / 10000n. 120% means 10000n / 12000n.
  const zkRatioBase = BigInt(Math.floor(zkRatioPercent * 100));

  // Client-side max borrow calc
  const standardMax = collateral * 10000n / 15000n; // 150% ratio
  const zkMax = collateral * 10000n / zkRatioBase; // Dynamic ratio
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

  const collateralNum = Number(formatEther(collateral));
  const debtNum = Number(formatEther(debt));
  const netWorth = collateralNum - debtNum;
  
  // Mock PnL data for the hackathon demo
  const mockEarned = collateralNum > 0 ? collateralNum * 0.045 : 0; // 4.5% supply APY
  const mockPaid = debtNum > 0 ? debtNum * 0.021 : 0; // 2.1% borrow APY
  const netPnL = mockEarned - mockPaid;
  const netApy = collateralNum > 0 ? ((mockEarned - mockPaid) / collateralNum) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Net Worth */}
        <div className="bg-surface border border-border rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <p className="text-text-dim text-xs uppercase tracking-wider mb-2 font-medium">Net Worth</p>
          <p className="text-3xl font-extrabold text-text mb-1">{netWorth > 0 ? netWorth.toFixed(4) : '0.0000'} <span className="text-sm font-medium text-text-dim">MON</span></p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${netPnL >= 0 ? 'bg-green/10 text-green' : 'bg-red/10 text-red'}`}>
              {netPnL >= 0 ? '+' : ''}{netPnL.toFixed(4)} MON (PnL)
            </span>
          </div>
        </div>

        {/* Net APY */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-text-dim text-xs uppercase tracking-wider mb-2 font-medium">Net APY</p>
          <p className={`text-3xl font-extrabold ${netApy >= 0 ? 'text-green' : 'text-red'} mb-1`}>
            {netApy >= 0 ? '+' : ''}{netApy.toFixed(2)}%
          </p>
          <p className="text-text-dim text-xs mt-2">Combined Supply & Borrow APY</p>
        </div>

        {/* Health Factor */}
        <div className="bg-surface border border-border rounded-2xl p-5 md:col-span-2">
          <div className="flex justify-between items-start mb-2">
            <p className="text-text-dim text-xs uppercase tracking-wider font-medium">Health Factor</p>
            <div className="flex items-center gap-2">
              {isZK && <span className="px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-full text-accent text-[10px] font-bold">ZK BORROWER</span>}
            </div>
          </div>
          <p className={`text-3xl font-extrabold ${hfColor} mb-2`}>{hfValue}</p>
          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${Number(healthFactor) >= 12000 || isInfinite ? 'bg-green' : Number(healthFactor) >= 10000 ? 'bg-accent' : 'bg-red'}`} 
              style={{ width: isInfinite ? '100%' : `${Math.min((Number(healthFactor) / 15000) * 100, 100)}%` }}
            />
          </div>
          <p className="text-text-dim text-xs mt-2">Liquidation at &lt; 1.00</p>
        </div>
      </div>

      {/* Detailed Position Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supplies (Verilen Borçlar) */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border/50">
            <h3 className="text-lg font-semibold text-text">Supplies (Verilen Borçlar)</h3>
          </div>
          <div className="p-5">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-text-dim text-xs uppercase tracking-wider mb-1">Total Supplied</p>
                <p className="text-2xl font-bold text-text">{collateralNum.toFixed(4)} <span className="text-sm">MON</span></p>
              </div>
              <div className="text-right">
                <p className="text-text-dim text-xs uppercase tracking-wider mb-1">Earned</p>
                <p className="text-green font-semibold">+{mockEarned.toFixed(4)} MON</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between p-3 bg-surface-2 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-text/10 flex items-center justify-center font-bold text-text text-xs">M</div>
                  <div>
                    <p className="text-sm font-semibold text-text">MON</p>
                    <p className="text-xs text-text-dim">Monad</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text">{collateralNum.toFixed(4)}</p>
                  <p className="text-xs text-green">4.50% APY</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Borrows (Alınan Borçlar) */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border/50">
            <h3 className="text-lg font-semibold text-text">Borrows (Alınan Borçlar)</h3>
          </div>
          <div className="p-5">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-text-dim text-xs uppercase tracking-wider mb-1">Total Borrowed</p>
                <p className="text-2xl font-bold text-text">{debtNum.toFixed(4)} <span className="text-sm">MON</span></p>
              </div>
              <div className="text-right">
                <p className="text-text-dim text-xs uppercase tracking-wider mb-1">Accrued Debt</p>
                <p className="text-red font-semibold">-{mockPaid.toFixed(4)} MON</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {debtNum > 0 ? (
                <div className="flex justify-between p-3 bg-surface-2 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-text/10 flex items-center justify-center font-bold text-text text-xs">M</div>
                    <div>
                      <p className="text-sm font-semibold text-text">MON</p>
                      <p className="text-xs text-text-dim">{isZK ? 'ZK Borrow' : 'Standard'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text">{debtNum.toFixed(4)}</p>
                    <p className="text-xs text-red">2.10% APY</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-surface-2 rounded-xl text-center">
                  <p className="text-text-dim text-sm">You have no active borrows.</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-border/50 grid grid-cols-2 gap-4">
              <div>
                <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1">Standard Max Borrow</p>
                <p className="text-sm font-semibold text-text-secondary">{Number(formatEther(standardAvail)).toFixed(4)} MON</p>
              </div>
              <div className="relative">
                {isScoreLoading && (
                  <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm flex items-center">
                    <span className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  </div>
                )}
                <p className="text-accent text-[10px] uppercase tracking-wider mb-1 font-bold">ZK Max Borrow ({zkRatioPercent.toFixed(0)}%)</p>
                <p className="text-sm font-semibold text-accent">{Number(formatEther(zkAvail)).toFixed(4)} MON</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
