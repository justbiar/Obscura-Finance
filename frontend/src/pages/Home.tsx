import { useAccount } from 'wagmi';
import { Link } from 'react-router-dom';
import { ConnectWallet } from '../components/ConnectWallet';

export function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="pt-24 pb-20 px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-2 border border-border rounded-full mb-8">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_#38bdf8]" />
            <span className="text-text-secondary text-sm font-medium tracking-wide">Institutional Grade ZK Lending</span>
          </div>

          <h1 className="text-5xl md:text-[72px] font-extrabold leading-[1.05] tracking-tight mb-8">
            <span className="text-text">The Private Way</span>
            <br />
            <span className="bg-gradient-to-r from-accent via-accent-bright to-accent-dim text-transparent bg-clip-text">
              to Borrow On-Chain
            </span>
          </h1>

          <p className="text-text-dim text-lg md:text-xl max-w-[650px] mx-auto mb-12 leading-relaxed">
            Prove your creditworthiness without revealing your identity.
            Get dynamic undercollateralized loans powered by Zero-Knowledge proofs.
          </p>

          <div className="flex items-center justify-center gap-4">
            {!isConnected ? (
              <ConnectWallet />
            ) : (
              <Link
                to="/borrow"
                className="px-8 py-3.5 bg-accent text-obsidian font-semibold rounded-xl hover:bg-accent-bright transition-colors shadow-[0_0_20px_rgba(56,189,248,0.2)] hover:shadow-[0_0_30px_rgba(56,189,248,0.4)]"
              >
                Access Markets
              </Link>
            )}
            <a
              href="#how"
              className="px-8 py-3.5 bg-surface-2 border border-border text-text-secondary font-semibold rounded-xl hover:border-border-light hover:text-text transition-colors"
            >
              Learn More
            </a>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-16">
            {[
              { label: 'ZK-Verified Credit', color: 'bg-accent' },
              { label: 'Dynamic LTV up to 100%', color: 'bg-teal' },
              { label: 'Monad Parallel EVM', color: 'bg-green' },
              { label: 'Institutional Ready', color: 'bg-text-secondary' },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2.5 px-5 py-3 bg-surface border border-border rounded-xl"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${f.color} shadow-[0_0_5px_currentColor]`} />
                <span className="text-text-secondary text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Protocol Comparison */}
      <section className="py-20 bg-surface border-y border-border">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-text mb-3">Market Efficiency</h2>
            <p className="text-text-dim">Deposit 10 MON as collateral — how much can you borrow?</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-4 font-semibold text-text-secondary w-1/4">Protocol</th>
                  <th className="pb-4 font-semibold text-text-secondary w-1/4">Collateral Ratio</th>
                  <th className="pb-4 font-semibold text-text-secondary w-1/4">Max LTV</th>
                  <th className="pb-4 font-semibold text-text-secondary w-1/4">You Can Borrow</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'MakerDAO', ratio: '150%', ltv: '66%', borrow: '6.66 MON', isObscura: false },
                  { name: 'Aave', ratio: '125%', ltv: '80%', borrow: '8.00 MON', isObscura: false },
                  { name: 'Compound', ratio: '120%', ltv: '83%', borrow: '8.33 MON', isObscura: false },
                  { name: 'Obscura (ZK)', ratio: '100% - 120%', ltv: '83% - 100%', borrow: '8.33 - 10.00 MON', isObscura: true },
                ].map((p) => (
                  <tr key={p.name} className={`border-b border-border/50 ${p.isObscura ? 'bg-accent/[0.02]' : ''}`}>
                    <td className={`py-5 font-semibold ${p.isObscura ? 'text-accent' : 'text-text'}`}>
                      {p.name}
                      {p.isObscura && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">DYNAMIC</span>}
                    </td>
                    <td className="py-5 text-text-dim">{p.ratio}</td>
                    <td className="py-5 text-text-dim">{p.ltv}</td>
                    <td className={`py-5 font-bold ${p.isObscura ? 'text-accent' : 'text-text'}`}>{p.borrow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how" className="py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text mb-4">How ZK Borrowing Works</h2>
            <p className="text-text-dim max-w-xl mx-auto text-lg">
              Four simple steps to get an undercollateralized loan with complete privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Supply', desc: 'Deposit MON to the lending pool to act as your collateral base.' },
              { step: '02', title: 'Commitment', desc: 'Submit a cryptographic hash. Your on-chain identity stays perfectly private.' },
              { step: '03', title: 'ZK Proof', desc: 'Generate a local proof showing your credit score meets our threshold.' },
              { step: '04', title: 'Borrow', desc: 'Access 1:1 borrowing power dynamically based on your verified health score.' },
            ].map((item) => (
              <div key={item.step} className="bg-surface-2 border border-border rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-text transform translate-x-4 -translate-y-4 group-hover:text-accent transition-colors">
                  {item.step}
                </div>
                <div className="relative z-10">
                  <h3 className="text-text font-bold text-lg mb-3 mt-4">{item.title}</h3>
                  <p className="text-text-dim text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
