import React from 'react';

interface TrenchCoatSVGProps {
  color?: string;
  className?: string;
}

export const TrenchCoatSVG: React.FC<TrenchCoatSVGProps> = ({ 
  color = '#8b7355', 
  className = '' 
}) => {
  return (
    <svg
      viewBox="0 0 100 130"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Trench coat body */}
      <path
        d="M18 45 L18 120 L82 120 L82 45 L78 40 L72 35 L65 30 L58 25 L50 22 L42 25 L35 30 L28 35 L22 40 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Belt */}
      <rect x="18" y="70" width="64" height="4" fill="#654321" />
      {/* Belt buckle */}
      <rect x="46" y="69" width="8" height="6" fill="#c0c0c0" stroke="#1f2937" strokeWidth="0.5" />
      {/* Left lapel */}
      <path
        d="M18 45 L28 50 L32 55 L38 60 L42 55 L48 50 L48 45 L42 40 L38 35 L35 30 L28 35 L22 40 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Right lapel */}
      <path
        d="M82 45 L72 50 L68 55 L62 60 L58 55 L52 50 L52 45 L58 40 L62 35 L65 30 L72 35 L78 40 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Left sleeve */}
      <path
        d="M18 45 L12 50 L8 55 L6 65 L8 75 L12 80 L18 75 L18 65 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Right sleeve */}
      <path
        d="M82 45 L88 50 L92 55 L94 65 L92 75 L88 80 L82 75 L82 65 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Double-breasted buttons */}
      <circle cx="42" cy="55" r="1.5" fill="#1f2937" />
      <circle cx="42" cy="62" r="1.5" fill="#1f2937" />
      <circle cx="58" cy="55" r="1.5" fill="#1f2937" />
      <circle cx="58" cy="62" r="1.5" fill="#1f2937" />
      {/* Shoulder epaulettes */}
      <rect x="25" y="35" width="12" height="3" fill={color} stroke="#1f2937" strokeWidth="0.5" />
      <rect x="63" y="35" width="12" height="3" fill={color} stroke="#1f2937" strokeWidth="0.5" />
    </svg>
  );
};