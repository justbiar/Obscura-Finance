import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center group ${className}`}>
      {/* Animated Glow Background */}
      <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl group-hover:bg-accent/40 group-hover:blur-2xl transition-all duration-700 animate-pulse"></div>
      
      {/* Light Beam Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 w-[200%] h-4 bg-gradient-to-r from-accent/0 via-accent/40 to-transparent rotate-[-15deg] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-sm mix-blend-screen"></div>

      {/* Eye Scan Light Overlay */}
      <div className="absolute top-[40%] left-0 w-full h-4 bg-gradient-to-r from-transparent via-[#38BDF8]/40 to-transparent blur-md pointer-events-none transform origin-left animate-eye-scan mix-blend-screen"></div>

      {/* Logo Image */}
      <div className="relative w-full h-full z-10 transition-transform duration-700 hover:scale-105" style={{ animation: 'camera-open 1.5s ease-out forwards' }}>
        <img 
          src="/logo.png" 
          alt="Obscura Finance Logo" 
          className="w-full h-full object-contain drop-shadow-2xl"
          onError={(e) => {
            // Fallback if image is not found
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = '<div class="w-full h-full bg-obsidian flex items-center justify-center text-accent font-extrabold text-xl rounded-full">O</div>';
          }}
        />
      </div>
    </div>
  );
};
