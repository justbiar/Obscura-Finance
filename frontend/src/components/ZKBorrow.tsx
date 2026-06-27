import { useState, useEffect, useMemo } from 'react';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from 'wagmi';
import { parseEther, keccak256, toBytes, toHex, pad, formatEther } from 'viem';
import { LENDING_ADDRESS, LENDING_ABI } from '../config/contracts';
import { monadTestnet } from '../config/wagmi';

function getOrCreateSecret(address: string): string {
  const key = `obscura_secret_${address}`;
  let secret = localStorage.getItem(key);
  if (!secret) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    secret = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(key, secret);
  }
  return secret;
}

function calcCreditScore(balanceWei: bigint, nonce: number, collateralWei: bigint): number {
  const balanceMon = Number(formatEther(balanceWei));
  const collateralMon = Number(formatEther(collateralWei));

  // Balance score (0-300): 0 MON = 0, 5+ MON = 300
  const balanceScore = Math.min(Math.floor(balanceMon * 60), 300);

  // Activity score (0-200): each sent tx = 40 points, max 200
  const activityScore = Math.min(nonce * 40, 200);

  // Collateral score (0-300): deposited collateral, 1+ MON = 300
  const collateralScore = Math.min(Math.floor(collateralMon * 300), 300);

  // Base score: everyone starts at 200
  const base = 200;

  return Math.min(base + balanceScore + activityScore + collateralScore, 1000);
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 800) return { label: 'Excellent', color: 'text-green' };
  if (score >= 650) return { label: 'Good', color: 'text-accent' };
  if (score >= 500) return { label: 'Fair', color: 'text-accent-dim' };
  return { label: 'Low', color: 'text-red' };
}

export function ZKBorrow() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [nonce, setNonce] = useState(0);
  const [step, setStep] = useState<'score' | 'borrow'>('score');

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: balanceData } = useBalance({ address, chainId: monadTestnet.id });

  const { data } = useReadContracts({
    contracts: address ? [
      { address: LENDING_ADDRESS, abi: LENDING_ABI, functionName: 'commitments', args: [address] },
      { address: LENDING_ADDRESS, abi: LENDING_ABI, functionName: 'hasZKBorrow', args: [address] },
      { address: LENDING_ADDRESS, abi: LENDING_ABI, functionName: 'collateral', args: [address] },
    ] : [],
    query: { refetchInterval: 4000 },
  });

  const commitment = data?.[0]?.result as `0x${string}` | undefined;
  const hasZK = data?.[1]?.result as boolean | undefined;
  const collateral = (data?.[2]?.result as bigint | undefined) ?? 0n;
  const hasCommitment = commitment && commitment !== '0x0000000000000000000000000000000000000000000000000000000000000000';

  // Fetch nonce (transaction count)
  useEffect(() => {
    if (!address) return;
    fetch(monadTestnet.rpcUrls.default.http[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getTransactionCount', params: [address, 'latest'], id: 1 }),
    })
      .then(r => r.json())
      .then(d => setNonce(parseInt(d.result, 16)))
      .catch(() => {});
  }, [address, isSuccess]);

  const secret = useMemo(() => address ? getOrCreateSecret(address) : '', [address]);
  const secretHash = useMemo(() => secret ? keccak256(toBytes(secret)) : '0x', [secret]);

  const balance = balanceData?.value ?? 0n;
  const score = calcCreditScore(balance, nonce, collateral);
  const scoreInfo = getScoreLabel(score);
  const meetsThreshold = score >= 750;
  const scorePercent = Math.min((score / 1000) * 100, 100);

  const handleRegister = () => {
    if (!secret) return;
    writeContract({
      address: LENDING_ADDRESS, abi: LENDING_ABI,
      functionName: 'registerCommitment',
      args: [secretHash as `0x${string}`],
    });
  };

  const handleZKBorrow = () => {
    if (!amount || Number(amount) <= 0 || !secret) return;
    const mockProof = ('0x' + 'aa'.repeat(128)) as `0x${string}`;
    const publicInputs: `0x${string}`[] = [pad(toHex(750), { size: 32 }), secretHash as `0x${string}`];
    writeContract({
      address: LENDING_ADDRESS, abi: LENDING_ABI,
      functionName: 'borrowWithZKProof',
      args: [parseEther(amount), mockProof, publicInputs],
    });
  };

  if (!isConnected) return null;

  return (
    <div className="bg-surface border border-accent/20 rounded-2xl p-6 flex flex-col glow-accent">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-text">ZK Private Borrow</h2>
        <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse ml-auto" />
      </div>
      <p className="text-text-dim text-xs mb-5">
        Borrow at 100% collateral with zero-knowledge credit proof.
      </p>

      {hasZK ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-accent/[0.06] border border-accent/20 rounded-xl p-5 text-center w-full">
            <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-accent text-sm font-medium">Active ZK Loan</p>
            <p className="text-text-dim text-xs mt-1">Repay your current loan to borrow again.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Credit Score Card */}
          <div className="bg-surface-2 border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-text-dim text-xs uppercase tracking-wider">ZK Credit Score</span>
              <span className={`text-xs font-semibold ${scoreInfo.color}`}>{scoreInfo.label}</span>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <span className={`text-3xl font-extrabold ${scoreInfo.color}`}>{score}</span>
              <span className="text-text-dim text-sm mb-1">/ 1000</span>
            </div>
            <div className="h-2 bg-surface-3 rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${scorePercent}%`,
                  background: score >= 750 ? 'linear-gradient(90deg, #1F8E9D, #34D399)' :
                    score >= 500 ? 'linear-gradient(90deg, #C77700, #FFED54)' :
                    'linear-gradient(90deg, #FF5252, #C77700)',
                }}
              />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-surface rounded-lg py-1.5 px-1">
                <p className="text-text-dim text-[10px] uppercase">Balance</p>
                <p className="text-text text-xs font-semibold">{Number(formatEther(balance)).toFixed(1)}</p>
              </div>
              <div className="bg-surface rounded-lg py-1.5 px-1">
                <p className="text-text-dim text-[10px] uppercase">Collateral</p>
                <p className="text-text text-xs font-semibold">{Number(formatEther(collateral)).toFixed(1)}</p>
              </div>
              <div className="bg-surface rounded-lg py-1.5 px-1">
                <p className="text-text-dim text-[10px] uppercase">Txns</p>
                <p className="text-text text-xs font-semibold">{nonce}</p>
              </div>
              <div className="bg-surface rounded-lg py-1.5 px-1">
                <p className="text-text-dim text-[10px] uppercase">Min</p>
                <p className="text-text text-xs font-semibold">750</p>
              </div>
            </div>
          </div>

          {!meetsThreshold ? (
            <div className="flex items-center gap-2 py-3 px-4 bg-red/[0.06] border border-red/20 rounded-xl">
              <span className="w-1.5 h-1.5 bg-red rounded-full" />
              <span className="text-red text-sm">Score must be 750+ for ZK borrowing. Increase balance or activity.</span>
            </div>
          ) : !hasCommitment ? (
            <>
              <div className="flex items-center gap-2 py-3 px-4 bg-accent/[0.06] border border-accent/20 rounded-xl mb-3">
                <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                <span className="text-accent text-sm">Score qualified! Register your ZK commitment first.</span>
              </div>
              <button onClick={handleRegister} disabled={isPending || isConfirming}
                className="w-full py-3.5 bg-accent hover:bg-accent-bright disabled:bg-surface-3 disabled:text-text-dim text-obsidian font-semibold rounded-xl transition-colors"
              >
                {isPending ? 'Confirm in wallet...' : isConfirming ? 'Registering...' : 'Register ZK Commitment'}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 py-2 px-4 bg-green/[0.06] border border-green/20 rounded-xl mb-3">
                <span className="w-1.5 h-1.5 bg-green rounded-full" />
                <span className="text-green text-xs">Commitment verified. Ready to borrow at 100% collateral.</span>
              </div>
              <div className="mb-4">
                <label className="block text-text-dim text-xs font-medium mb-2 uppercase tracking-wider">Borrow Amount</label>
                <div className="relative">
                  <input
                    type="number" step="0.01" min="0" placeholder="0.00" value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-text text-lg font-medium focus:outline-none focus:border-accent/50 transition-colors placeholder:text-text-dim/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim text-sm font-medium">MON</span>
                </div>
              </div>
              <button onClick={handleZKBorrow}
                disabled={isPending || isConfirming || !amount || Number(amount) <= 0}
                className="w-full py-3.5 bg-accent hover:bg-accent-bright disabled:bg-surface-3 disabled:text-text-dim text-obsidian font-semibold rounded-xl transition-all glow-accent"
              >
                {isPending ? 'Confirm in wallet...' : isConfirming ? 'Confirming...' : 'Borrow with ZK Proof'}
              </button>
            </>
          )}

          {isSuccess && (
            <div className="mt-3 flex items-center justify-center gap-2 py-2 bg-green/[0.08] border border-green/20 rounded-lg">
              <span className="w-1.5 h-1.5 bg-green rounded-full" />
              <span className="text-green text-sm font-medium">Transaction confirmed</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
