import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import { useAccount } from 'wagmi';
import { ConnectWallet } from './components/ConnectWallet';
import { PoolInfo } from './components/PoolInfo';
import { UserPosition } from './components/UserPosition';
import { DepositWithdraw } from './components/DepositWithdraw';
import { ZKBorrow } from './components/ZKBorrow';
import { Repay } from './components/Repay';

function App() {
  const { address, isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-obsidian">
      {/* Ambient Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-accent/[0.04] rounded-full blur-[150px]" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-teal/[0.04] rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="border-b border-border/50">
          <div className="max-w-[1200px] mx-auto px-6 h-[72px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <span className="text-obsidian font-extrabold text-lg">O</span>
              </div>
              <div>
                <span className="text-text font-bold text-[17px] tracking-tight">Obscura</span>
                <span className="text-accent font-bold text-[17px] tracking-tight ml-1">Finance</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#pool" className="text-text-dim text-sm hover:text-text transition-colors">Pool</a>
              <a href="#borrow" className="text-text-dim text-sm hover:text-text transition-colors">Borrow</a>
              <a href="#how" className="text-text-dim text-sm hover:text-text transition-colors">How it Works</a>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-accent/[0.08] border border-accent/20 rounded-full">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                <span className="text-accent text-xs font-medium">Monad Testnet</span>
              </div>
              <ConnectWallet />
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="pt-20 pb-16 px-6">
          <div className="max-w-[1200px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/[0.08] border border-accent/20 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-accent rounded-full" />
              <span className="text-accent text-sm font-medium">Powered by Zero-Knowledge Proofs</span>
            </div>

            <h1 className="text-5xl md:text-[64px] font-extrabold leading-[1.08] tracking-tight mb-6">
              <span className="text-text">The Private Way</span>
              <br />
              <span className="text-accent">
                to Borrow On-Chain
              </span>
            </h1>

            <p className="text-text-secondary text-lg md:text-xl max-w-[600px] mx-auto mb-10 leading-relaxed">
              Prove your creditworthiness without revealing your identity.
              Borrow with 100% collateral ratio instead of 150%.
            </p>

            <div className="flex items-center justify-center gap-4">
              {!isConnected ? (
                <ConnectWallet />
              ) : (
                <a
                  href="#borrow"
                  className="px-8 py-3.5 bg-accent text-obsidian font-semibold rounded-xl hover:bg-accent-bright transition-colors glow-accent-strong"
                >
                  Start Borrowing
                </a>
              )}
              <a
                href="#how"
                className="px-8 py-3.5 border border-border-light text-text-secondary font-semibold rounded-xl hover:border-accent/50 hover:text-text transition-colors"
              >
                Learn More
              </a>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-14">
              {[
                { label: 'ZK-Verified Credit', color: 'text-accent' },
                { label: 'Fully Private', color: 'text-teal' },
                { label: 'Monad Parallel EVM', color: 'text-green' },
                { label: 'FHE Ready', color: 'text-accent' },
              ].map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${f.color.replace('text-', 'bg-')}`} />
                  <span className="text-text-secondary text-sm font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <main className="max-w-[1200px] mx-auto px-6 pb-20">
          {/* Pool Info */}
          <section id="pool" className="mb-8">
            <PoolInfo key={`pool-${address}`} />
          </section>

          {!isConnected ? (
            <section className="py-24 text-center">
              <div className="w-20 h-20 bg-surface-2 border border-border rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-text mb-3">Connect Your Wallet</h3>
              <p className="text-text-dim mb-8 max-w-md mx-auto">
                Connect with MetaMask to deposit collateral, borrow with ZK proofs, and manage your position.
              </p>
              <ConnectWallet />
            </section>
          ) : (
            <>
              <section className="mb-8">
                <UserPosition key={address} />
              </section>

              <section id="borrow" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <DepositWithdraw key={`dw-${address}`} />
                <ZKBorrow key={`zk-${address}`} />
                <Repay key={`rp-${address}`} />
              </section>
            </>
          )}

          {/* How it Works */}
          <section id="how" className="mt-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-text mb-3">How ZK Borrowing Works</h2>
              <p className="text-text-dim max-w-lg mx-auto">
                Four simple steps to get an undercollateralized loan with complete privacy.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {[
                { step: '01', title: 'Deposit Collateral', desc: 'Add MON to the lending pool as collateral for your future loans.', color: 'bg-teal/10', borderColor: 'border-teal/20', numColor: 'text-teal' },
                { step: '02', title: 'Register Commitment', desc: 'Submit a cryptographic hash of your secret. Your identity stays private.', color: 'bg-accent/10', borderColor: 'border-accent/20', numColor: 'text-accent' },
                { step: '03', title: 'Generate ZK Proof', desc: 'Prove your credit score meets the threshold — without revealing the actual score.', color: 'bg-green/10', borderColor: 'border-green/20', numColor: 'text-green' },
                { step: '04', title: 'Borrow at 100%', desc: 'Get 1:1 borrowing power. Other protocols require 120-150% collateral.', color: 'bg-accent/10', borderColor: 'border-accent/20', numColor: 'text-accent' },
              ].map((item) => (
                <div
                  key={item.step}
                  className={`bg-surface border ${item.borderColor} rounded-2xl p-6 hover:translate-y-[-2px] transition-transform`}
                >
                  <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                    <span className={`${item.numColor} font-bold text-sm`}>{item.step}</span>
                  </div>
                  <h3 className="text-text font-semibold text-base mb-2">{item.title}</h3>
                  <p className="text-text-dim text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Protocol Comparison */}
          <section className="mt-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-text mb-2">How We Compare</h2>
              <p className="text-text-dim text-sm">Deposit 10 MON as collateral — how much can you borrow?</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'MakerDAO', ratio: 150, ltv: 66, borrow: '6.66', color: 'text-text-secondary', border: 'border-border', bg: 'bg-surface' },
                { name: 'Aave', ratio: 125, ltv: 80, borrow: '8.00', color: 'text-text-secondary', border: 'border-border', bg: 'bg-surface' },
                { name: 'Compound', ratio: 120, ltv: 83, borrow: '8.33', color: 'text-text-secondary', border: 'border-border', bg: 'bg-surface' },
                { name: 'Obscura (ZK)', ratio: 100, ltv: 100, borrow: '10.00', color: 'text-accent', border: 'border-accent/30', bg: 'bg-surface' },
              ].map((p) => (
                <div key={p.name} className={`${p.bg} border ${p.border} rounded-2xl p-5 ${p.name === 'Obscura (ZK)' ? 'glow-accent' : ''}`}>
                  <p className={`text-sm font-semibold mb-4 ${p.color}`}>{p.name}</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-text-dim text-[10px] uppercase tracking-wider">Collateral Ratio</p>
                      <p className={`text-lg font-bold ${p.color}`}>{p.ratio}%</p>
                    </div>
                    <div>
                      <p className="text-text-dim text-[10px] uppercase tracking-wider">LTV</p>
                      <p className={`text-lg font-bold ${p.color}`}>{p.ltv}%</p>
                    </div>
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-text-dim text-[10px] uppercase tracking-wider">You Can Borrow</p>
                      <p className={`text-2xl font-extrabold ${p.color}`}>
                        {p.borrow} <span className="text-sm font-medium">MON</span>
                      </p>
                    </div>
                  </div>
                  {p.name === 'Obscura (ZK)' && (
                    <div className="mt-3 flex items-center gap-1.5 py-1.5 px-3 bg-accent/[0.08] rounded-lg">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                      <span className="text-accent text-[11px] font-medium">1:1 — Full collateral access</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface-2 rounded-xl p-4 text-center">
                <p className="text-text-dim text-xs">Privacy</p>
                <p className="text-text-secondary text-sm font-medium mt-1">None</p>
              </div>
              <div className="bg-surface-2 rounded-xl p-4 text-center">
                <p className="text-text-dim text-xs">Privacy</p>
                <p className="text-text-secondary text-sm font-medium mt-1">None</p>
              </div>
              <div className="bg-surface-2 rounded-xl p-4 text-center">
                <p className="text-text-dim text-xs">Privacy</p>
                <p className="text-text-secondary text-sm font-medium mt-1">None</p>
              </div>
              <div className="bg-surface-2 rounded-xl p-4 text-center border border-accent/20">
                <p className="text-text-dim text-xs">Privacy</p>
                <p className="text-accent text-sm font-semibold mt-1">ZK + FHE</p>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50">
          <div className="max-w-[1200px] mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
                <span className="text-obsidian font-bold text-[10px]">O</span>
              </div>
              <span className="text-text-dim text-sm">Obscura Finance — Monad Hackathon 2025</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-text-dim text-xs">Phase 1: ZK Lending</span>
              <span className="text-text-dim text-xs">Phase 2: FHE (Coming Soon)</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
