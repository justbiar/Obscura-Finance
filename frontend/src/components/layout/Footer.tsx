import { ObscuraLogo } from '../ObscuraLogo';

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto bg-obsidian">
      <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ObscuraLogo width={28} height={28} />
          <div className="flex flex-col justify-center leading-none">
            <span className="text-[15px] font-black tracking-wide bg-gradient-to-b from-[#ffffff] via-[#a5cbf5] to-[#246bbd] text-transparent bg-clip-text">
              OBSCURA
            </span>
            <span className="text-[8px] font-bold text-[#38bdf8] tracking-[0.25em] pl-0.5 mt-0.5">
              FINANCE
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <a href="https://docs.obscura.finance" target="_blank" rel="noreferrer" className="text-text-dim hover:text-text text-sm transition-colors">
            Documentation
          </a>
          <a href="https://twitter.com/obscurafinance" target="_blank" rel="noreferrer" className="text-text-dim hover:text-text text-sm transition-colors">
            Twitter
          </a>
          <a href="https://github.com/obscura-finance" target="_blank" rel="noreferrer" className="text-text-dim hover:text-text text-sm transition-colors">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
