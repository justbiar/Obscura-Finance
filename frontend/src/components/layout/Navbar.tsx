import { Link, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ConnectWallet } from '../ConnectWallet';
import { ObscuraLogo } from '../ObscuraLogo';

export function Navbar() {
  const { isConnected } = useAccount();
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/pool', label: 'Pools' },
    { path: '/lend', label: 'Lend' },
    { path: '/borrow', label: 'Borrow' },
    { path: '/profile', label: 'Profile' },
  ];

  return (
    <nav className="border-b border-border/50 bg-obsidian/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-6 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 group">
            <ObscuraLogo width={40} height={40} />
            <div className="flex flex-col justify-center leading-none mt-1">
              <span className="text-[20px] font-black tracking-wide bg-gradient-to-b from-[#ffffff] via-[#a5cbf5] to-[#246bbd] text-transparent bg-clip-text drop-shadow-sm group-hover:brightness-125 transition-all" style={{ WebkitTextStroke: '0.5px rgba(255,255,255,0.1)' }}>
                OBSCURA
              </span>
              <span className="text-[10px] font-bold text-[#38bdf8] tracking-[0.25em] pl-0.5">
                FINANCE
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => {
              // Only show restricted pages if connected, except Home and Pools
              if (!isConnected && ['/lend', '/borrow', '/profile'].includes(link.path)) return null;
              
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-surface-2 text-text border border-border' 
                      : 'text-text-dim hover:text-text hover:bg-surface'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-border rounded-lg">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            <span className="text-text-secondary text-xs font-medium">Monad Testnet</span>
          </div>
          <ConnectWallet />
        </div>
      </div>
    </nav>
  );
}
