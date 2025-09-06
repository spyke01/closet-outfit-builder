import React from 'react';

interface MacCoatSVGProps {
  color?: string;
  className?: string;
}

export const MacCoatSVG: React.FC<MacCoatSVGProps> = ({ 
  color = '#2d3748', 
  className = '' 
}) => {
  return (
    <svg
      viewBox="0 0 100 125"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Mac coat body - more streamlined than trench */}
      <path
        d="M22 42 L22 115 L78 115 L78 42 L74 38 L68 34 L62 30 L56 27 L50 25 L44 27 L38 30 L32 34 L26 38 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Minimal collar */}
      <path
        d="M22 42 L30 46 L34 50 L40 54 L44 50 L50 46 L50 42 L44 38 L40 34 L38 30 L32 34 L26 38 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      <path
        d="M78 42 L70 46 L66 50 L60 54 L56 50 L50 46 L50 42 L56 38 L60 34 L62 30 L68 34 L74 38 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Left sleeve */}
      <path
        d="M22 42 L16 47 L12 52 L10 62 L12 72 L16 77 L22 72 L22 62 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Right sleeve */}
      <path
        d="M78 42 L84 47 L88 52 L90 62 L88 72 L84 77 L78 72 L78 62 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Simple button closure */}
      <circle cx="50" cy="55" r="2" fill="#1f2937" />
      <circle cx="50" cy="65" r="2" fill="#1f2937" />
      <circle cx="50" cy="75" r="2" fill="#1f2937" />
      <circle cx="50" cy="85" r="2" fill="#1f2937" />
      {/* Subtle seam lines */}
      <line x1="22" y1="50" x2="22" y2="115" stroke="#1a202c" strokeWidth="0.5" />
      <line x1="78" y1="50" x2="78" y2="115" stroke="#1a202c" strokeWidth="0.5" />
    </svg>
  );
};