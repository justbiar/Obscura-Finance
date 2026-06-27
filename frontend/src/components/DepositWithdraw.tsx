import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { LENDING_ADDRESS, LENDING_ABI } from '../config/contracts';

export function DepositWithdraw() {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

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
        <label className="block text-text-dim text-xs font-medium mb-2 uppercase tracking-wider">Amount</label>
        <div className="relative">
          <input
            type="number" step="0.01" min="0" placeholder="0.00" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-text text-lg font-medium focus:outline-none focus:border-accent/50 transition-colors placeholder:text-text-dim/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim text-sm font-medium">MON</span>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isPending || isConfirming || !amount || Number(amount) <= 0}
        className="w-full py-3.5 bg-teal hover:bg-teal/90 disabled:bg-surface-3 disabled:text-text-dim text-obsidian font-semibold rounded-xl transition-colors"
      >
        {isPending ? 'Confirm in wallet...' : isConfirming ? 'Confirming...' : mode === 'deposit' ? 'Deposit MON' : 'Withdraw MON'}
      </button>

      {isSuccess && (
        <div className="mt-3 flex items-center justify-center gap-2 py-2 bg-green/[0.08] border border-green/20 rounded-lg">
          <span className="w-1.5 h-1.5 bg-green rounded-full" />
          <span className="text-green text-sm font-medium">Transaction confirmed</span>
        </div>
      )}
    </div>
  );
}
