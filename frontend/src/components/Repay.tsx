import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { LENDING_ADDRESS, LENDING_ABI } from '../config/contracts';

export function Repay() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: debt } = useReadContract({
    address: LENDING_ADDRESS, abi: LENDING_ABI, functionName: 'debt',
    args: address ? [address] : undefined,
    query: { refetchInterval: 4000 },
  });

  if (!isConnected) return null;

  const debtAmount = debt as bigint | undefined;
  const hasDebt = debtAmount !== undefined && debtAmount > 0n;

  const handleRepay = () => {
    if (!amount || Number(amount) <= 0) return;
    writeContract({ address: LENDING_ADDRESS, abi: LENDING_ABI, functionName: 'repay', value: parseEther(amount) });
  };

  const handleRepayFull = () => {
    if (!debtAmount || debtAmount === 0n) return;
    writeContract({ address: LENDING_ADDRESS, abi: LENDING_ABI, functionName: 'repay', value: debtAmount });
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-accent-dim/10 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-dim">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-text">Repay</h2>
      </div>

      {!hasDebt ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-surface-2 rounded-xl p-6 text-center w-full">
            <div className="w-10 h-10 bg-surface-3 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dim">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-text-dim text-sm">No outstanding debt</p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-accent-dim/[0.08] border border-accent-dim/20 rounded-xl p-4 mb-5">
            <p className="text-text-dim text-xs uppercase tracking-wider mb-1">Outstanding Debt</p>
            <p className="text-accent text-xl font-bold">
              {Number(formatEther(debtAmount)).toFixed(4)}
              <span className="text-accent/60 text-sm font-medium ml-1">MON</span>
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-text-dim text-xs font-medium mb-2 uppercase tracking-wider">Repay Amount</label>
            <div className="relative">
              <input
                type="number" step="0.01" min="0" placeholder="0.00" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-text text-lg font-medium focus:outline-none focus:border-accent/50 transition-colors placeholder:text-text-dim/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim text-sm font-medium">MON</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleRepay}
              disabled={isPending || isConfirming || !amount || Number(amount) <= 0}
              className="flex-1 py-3.5 bg-accent hover:bg-accent-bright disabled:bg-surface-3 disabled:text-text-dim text-obsidian font-semibold rounded-xl transition-colors"
            >
              {isPending ? 'Confirm...' : isConfirming ? 'Confirming...' : 'Repay'}
            </button>
            <button onClick={handleRepayFull} disabled={isPending || isConfirming}
              className="py-3.5 px-5 border border-accent/30 hover:bg-accent/10 text-accent font-semibold rounded-xl transition-colors"
            >
              Max
            </button>
          </div>

          {isSuccess && (
            <div className="mt-3 flex items-center justify-center gap-2 py-2 bg-green/[0.08] border border-green/20 rounded-lg">
              <span className="w-1.5 h-1.5 bg-green rounded-full" />
              <span className="text-green text-sm font-medium">Repayment confirmed</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
