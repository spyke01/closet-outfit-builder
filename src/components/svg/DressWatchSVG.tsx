import React from 'react';

interface DressWatchSVGProps {
  color?: string;
  className?: string;
}

export const DressWatchSVG: React.FC<DressWatchSVGProps> = ({ 
  color = '#c0c0c0', 
  className = '' 
}) => {
  return (
    <svg
      viewBox="0 0 60 80"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Watch band top */}
      <path
        d="M20 10 Q30 5 40 10 L40 25 Q30 20 20 25 Z"
        fill="#2d1810"
        stroke="#1f2937"
        strokeWidth="0.5"
      />
      {/* Watch band bottom */}
      <path
        d="M20 55 Q30 60 40 55 L40 70 Q30 75 20 70 Z"
        fill="#2d1810"
        stroke="#1f2937"
        strokeWidth="0.5"
      />
      {/* Watch case */}
      <circle cx="30" cy="40" r="15" fill={color} stroke="#1f2937" strokeWidth="1" />
      {/* Watch face */}
      <circle cx="30" cy="40" r="12" fill="#ffffff" stroke="#1f2937" strokeWidth="0.5" />
      {/* Hour markers */}
      <circle cx="30" cy="30" r="0.8" fill="#1f2937" />
      <circle cx="38" cy="40" r="0.8" fill="#1f2937" />
      <circle cx="30" cy="50" r="0.8" fill="#1f2937" />
      <circle cx="22" cy="40" r="0.8" fill="#1f2937" />
      {/* Watch hands */}
      <line x1="30" y1="40" x2="30" y2="33" stroke="#1f2937" strokeWidth="1.5" />
      <line x1="30" y1="40" x2="35" y2="40" stroke="#1f2937" strokeWidth="1" />
      {/* Center dot */}
      <circle cx="30" cy="40" r="1" fill="#1f2937" />
      {/* Crown */}
      <rect x="44" y="38" width="3" height="4" fill={color} stroke="#1f2937" strokeWidth="0.5" />
      {/* Band stitching */}
      <line x1="22" y1="15" x2="22" y2="65" stroke="#8b4513" strokeWidth="0.3" strokeDasharray="1,1" />
      <line x1="38" y1="15" x2="38" y2="65" stroke="#8b4513" strokeWidth="0.3" strokeDasharray="1,1" />
    </svg>
  );
};