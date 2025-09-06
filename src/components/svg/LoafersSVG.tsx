import React from 'react';

interface LoafersSVGProps {
  color?: string;
  className?: string;
}

export const LoafersSVG: React.FC<LoafersSVGProps> = ({ 
  color = '#8b4513', 
  className = '' 
}) => {
  return (
    <svg
      viewBox="0 0 100 40"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left shoe */}
      <path
        d="M5 25 Q5 15 15 15 L35 15 Q40 15 42 20 L42 25 Q42 30 35 32 L15 32 Q5 30 5 25"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Left shoe sole */}
      <ellipse cx="25" cy="32" rx="20" ry="3" fill="#2d1810" />
      {/* Left shoe strap detail */}
      <path
        d="M15 20 Q25 18 35 20"
        fill="none"
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Left shoe buckle/ornament */}
      <rect x="22" y="18" width="6" height="4" fill="#c0c0c0" stroke="#1f2937" strokeWidth="0.5" />
      
      {/* Right shoe */}
      <path
        d="M58 25 Q58 15 68 15 L88 15 Q93 15 95 20 L95 25 Q95 30 88 32 L68 32 Q58 30 58 25"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Right shoe sole */}
      <ellipse cx="78" cy="32" rx="20" ry="3" fill="#2d1810" />
      {/* Right shoe strap detail */}
      <path
        d="M68 20 Q78 18 88 20"
        fill="none"
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Right shoe buckle/ornament */}
      <rect x="75" y="18" width="6" height="4" fill="#c0c0c0" stroke="#1f2937" strokeWidth="0.5" />
    </svg>
  );
};