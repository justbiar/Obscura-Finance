import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContracts, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { LENDING_ADDRESS, LENDING_ABI } from '../config/contracts';
import { monadTestnet } from '../config/wagmi';
import { calcCreditScore } from './ZKBorrow';

export function DepositWithdraw() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [nonce, setNonce] = useState(0);

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: balanceData } = useBalance({ address, chainId: monadTestnet.id });

  const { data } = useReadContracts({
    contracts: address ? [
      { address: LENDING_ADDRESS, abi: LENDING_ABI, functionName: 'getUserPosition', args: [address] },
    ] : [],
    query: { refetchInterval: 4000 },
  });

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
  }, [address]);

  const position = data?.[0]?.result as [bigint, bigint, boolean, bigint] | undefined;
  const collateral = position?.[0] ?? 0n;
  const debt = position?.[1] ?? 0n;
  const isZK = position?.[2];

  const balance = balanceData?.value ?? 0n;
  const score = calcCreditScore(balance, nonce, collateral);
  const zkRatioPercent = score >= 750 ? Math.max(100, Math.min(120, 120 - ((score - 750) / 250) * 20)) : 150;
  const zkRatioBase = BigInt(Math.floor(zkRatioPercent * 100));

  let requiredCollateral = 0n;
  if (debt > 0n) {
    requiredCollateral = isZK ? (debt * zkRatioBase) / 10000n : (debt * 15000n) / 10000n;
  }
  const maxWithdrawable = collateral > requiredCollateral ? collateral - requiredCollateral : 0n;

  const handleMax = () => {
    if (mode === 'deposit') {
      // Leave a tiny bit for gas (e.g. 0.01 MON)
      const maxDep = balance > parseEther('0.01') ? balance - parseEther('0.01') : 0n;
      setAmount(formatEther(maxDep));
    } else {
      setAmount(formatEther(maxWithdrawable));
    }
  };

  const handleSubmit = () => {
    if (!amount || Number(amount) <= 0) return;
    if (mode === 'deposit') {
      writeContract({ address: LENDING_ADDRESS, abi: LENDING_ABI, functionName: 'deposit', value: parseEther(amount) });
    } else {
      writeContract({ address: LENDING_ADDRESS, abi: LENDING_ABI, functionName: 'withdraw', args: [parseEther(amount)] });
    }
  };

  if (!isConnected) return null;

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal">
            <path d="M21 12V7H5a2 2 0 010-4h14v4" /><path d="M3 5v14a2 2 0 002 2h16v-5" />
            <path d="M18 12a2 2 0 000 4h4v-4h-4z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-text">Collateral</h2>
      </div>

      <div className="flex gap-1 mb-5 bg-surface-2 p-1 rounded-xl">
        {(['deposit', 'withdraw'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); reset(); }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              mode === m ? 'bg-surface-3 text-text shadow-sm' : 'text-text-dim hover:text-text-secondary'
            }`}
          >
            {m === 'deposit' ? 'Deposit' : 'Withdraw'}
          </button>
        ))}
      </div>

      <div className="mb-5 flex-1">
        <div className="flex justify-between items-end mb-2">
          <label className="block text-text-dim text-xs font-medium uppercase tracking-wider">Amount</label>
          <div className="text-right">
            <span className="text-text-dim text-xs">
              {mode === 'deposit' ? 'Wallet Balance: ' : 'Max Withdrawable: '}
              <span className="text-text font-medium">
                {mode === 'deposit' ? Number(formatEther(balance)).toFixed(4) : Number(formatEther(maxWithdrawable)).toFixed(4)} MON
              </span>
            </span>
          </div>
        </div>
        <div className="relative">
          <input
            type="number" step="0.01" min="0" placeholder="0.00" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-text text-lg font-medium focus:outline-none focus:border-accent/50 transition-colors placeholder:text-text-dim/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button 
              onClick={handleMax}
              className="text-[10px] font-bold text-teal bg-teal/10 px-2 py-1 rounded hover:bg-teal/20 transition-colors"
            >
              MAX
            </button>
            <span className="text-text-dim text-sm font-medium">MON</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isPending || isConfirming || !amount || Number(amount) <= 0}
        className="w-full py-3.5 bg-teal hover:bg-teal/90 disabled:bg-surface-3 disabled:text-text-dim text-obsidian font-semibold rounded-xl transition-colors"
      >
        {isPending ? 'Confirm in wallet...' : isConfirming ? 'Confirming...' : mode === 'deposit' ? 'Deposit MON' : 'Withdraw MON'}
      </button>

      {isSuccess && hash && (
        <div className="mt-3 flex items-center justify-center gap-2 py-2 bg-green/[0.08] border border-green/20 rounded-lg">
          <span className="w-1.5 h-1.5 bg-green rounded-full" />
          <span className="text-green text-sm font-medium">Transaction confirmed.</span>
          <a href={`https://testnet.monadexplorer.com/tx/${hash}`} target="_blank" rel="noreferrer" className="text-green text-sm font-semibold underline hover:text-green/80 transition-colors">
            View on Explorer ↗
          </a>
        </div>
      )}
    </div>
  );
}
