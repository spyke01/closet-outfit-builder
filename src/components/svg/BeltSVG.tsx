import React from 'react';

interface BeltSVGProps {
  color?: string;
  className?: string;
}

export const BeltSVG: React.FC<BeltSVGProps> = ({ 
  color = '#8b4513', 
  className = '' 
}) => {
  return (
    <svg
      viewBox="0 0 100 20"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Belt strap */}
      <rect x="5" y="8" width="90" height="4" fill={color} stroke="#1f2937" strokeWidth="0.5" />
      {/* Belt holes */}
      <circle cx="15" cy="10" r="1" fill="#1f2937" />
      <circle cx="20" cy="10" r="1" fill="#1f2937" />
      <circle cx="25" cy="10" r="1" fill="#1f2937" />
      <circle cx="30" cy="10" r="1" fill="#1f2937" />
      <circle cx="35" cy="10" r="1" fill="#1f2937" />
      {/* Belt buckle */}
      <rect x="45" y="6" width="10" height="8" fill="#c0c0c0" stroke="#1f2937" strokeWidth="1" />
      {/* Buckle prong */}
      <line x1="50" y1="10" x2="42" y2="10" stroke="#1f2937" strokeWidth="1" />
      {/* Buckle frame */}
      <rect x="46" y="7" width="8" height="6" fill="none" stroke="#1f2937" strokeWidth="0.8" />
      {/* Belt tip */}
      <path
        d="M85 8 L95 8 Q97 10 95 12 L85 12 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="0.5"
      />
      {/* Stitching details */}
      <line x1="7" y1="9" x2="83" y2="9" stroke="#654321" strokeWidth="0.3" strokeDasharray="1,1" />
      <line x1="7" y1="11" x2="83" y2="11" stroke="#654321" strokeWidth="0.3" strokeDasharray="1,1" />
    </svg>
  );
};