import React from 'react';

export const ObscuraLogo: React.FC<{ className?: string, width?: number, height?: number }> = ({ className = '', width = 40, height = 40 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width, height }}>
      {/* Outer Metallic Ring */}
      <div className="absolute inset-0 rounded-full border-[3px] border-[#8a95a5] shadow-[inset_0_0_10px_rgba(0,0,0,0.8),0_4px_10px_rgba(0,0,0,0.5)] bg-gradient-to-br from-[#2c313a] to-[#1a1d24]"></div>
      
      {/* Glow Behind the Core */}
      <div className="absolute inset-0 m-auto w-3/4 h-3/4 bg-[#38BDF8] rounded-full blur-md opacity-40 animate-pulse"></div>
      
      {/* The Core / Network */}
      <div className="absolute inset-0 m-auto w-1/2 h-1/2 border border-[#38BDF8]/30 rounded-full flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-[#38BDF8] rounded-full shadow-[0_0_8px_#38BDF8]"></div>
        <div className="absolute w-full h-[1px] bg-[#38BDF8]/20 rotate-45"></div>
        <div className="absolute w-full h-[1px] bg-[#38BDF8]/20 rotate-[-45deg]"></div>
        <div className="absolute w-[1px] h-full bg-[#38BDF8]/20"></div>
        <div className="absolute w-full h-[1px] bg-[#38BDF8]/20"></div>
      </div>

      {/* Shutter Blades (Aperture) */}
      <svg className="absolute inset-0 w-full h-full drop-shadow-md text-[#6c7585]" viewBox="0 0 100 100">
        <g stroke="rgba(0,0,0,0.6)" strokeWidth="0.5" fill="currentColor">
          {/* Blade 1 */}
          <path d="M 50 10 C 65 10 78 18 85 30 L 60 40 L 40 18 Z" className="animate-aperture-blade-1 hover:fill-[#8a95a5] transition-colors duration-300"/>
          {/* Blade 2 */}
          <path d="M 85 30 C 92 42 92 58 85 70 L 60 60 L 78 40 Z" className="animate-aperture-blade-2 hover:fill-[#8a95a5] transition-colors duration-300"/>
          {/* Blade 3 */}
          <path d="M 85 70 C 78 82 65 90 50 90 L 40 60 L 60 82 Z" className="animate-aperture-blade-3 hover:fill-[#8a95a5] transition-colors duration-300"/>
          {/* Blade 4 */}
          <path d="M 50 90 C 35 90 22 82 15 70 L 40 60 L 60 82 Z" transform="rotate(180 50 50)" className="animate-aperture-blade-4 hover:fill-[#8a95a5] transition-colors duration-300"/>
          {/* Blade 5 */}
          <path d="M 85 30 C 92 42 92 58 85 70 L 60 60 L 78 40 Z" transform="rotate(180 50 50)" className="animate-aperture-blade-5 hover:fill-[#8a95a5] transition-colors duration-300"/>
          {/* Blade 6 */}
          <path d="M 50 10 C 65 10 78 18 85 30 L 60 40 L 40 18 Z" transform="rotate(180 50 50)" className="animate-aperture-blade-6 hover:fill-[#8a95a5] transition-colors duration-300"/>
        </g>
      </svg>

      {/* Keyholes */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
        <g fill="#1a1d24" stroke="#8a95a5" strokeWidth="0.5">
          {/* Example Keyhole on top-left blade */}
          <g transform="translate(30, 30) rotate(-45)">
            <circle cx="0" cy="0" r="3"/>
            <path d="M -1.5 2 L 1.5 2 L 2 7 L -2 7 Z"/>
          </g>
          {/* Keyhole on bottom blade */}
          <g transform="translate(50, 75) rotate(0)">
            <circle cx="0" cy="0" r="3"/>
            <path d="M -1.5 2 L 1.5 2 L 2 7 L -2 7 Z"/>
          </g>
          {/* Keyhole on top-right blade */}
          <g transform="translate(70, 30) rotate(45)">
            <circle cx="0" cy="0" r="3"/>
            <path d="M -1.5 2 L 1.5 2 L 2 7 L -2 7 Z"/>
          </g>
        </g>
      </svg>

      {/* Light Beam emitting to the right */}
      <div className="absolute top-1/2 left-1/2 w-[250%] h-8 bg-gradient-to-r from-[#38BDF8]/60 via-[#38BDF8]/10 to-transparent blur-md pointer-events-none transform origin-left animate-eye-scan">
        {/* Animated scanning light */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#fff]/30 to-transparent w-full h-full animate-beam-scan mix-blend-overlay"></div>
      </div>
      
      {/* Overlapping Light Beam 2 */}
      <div className="absolute top-1/2 left-1/2 w-[300%] h-3 bg-gradient-to-r from-[#38BDF8]/80 via-[#38BDF8]/20 to-transparent blur-sm pointer-events-none transform origin-left animate-eye-scan rotate-[-5deg]"></div>
      <div className="absolute top-1/2 left-1/2 w-[300%] h-3 bg-gradient-to-r from-[#38BDF8]/80 via-[#38BDF8]/20 to-transparent blur-sm pointer-events-none transform origin-left animate-eye-scan rotate-[5deg]"></div>
    </div>
  );
};
