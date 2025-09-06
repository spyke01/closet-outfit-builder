import React from 'react';

interface LongSleeveSVGProps {
  color?: string;
  className?: string;
}

export const LongSleeveSVG: React.FC<LongSleeveSVGProps> = ({ 
  color = '#e2e8f0', 
  className = '' 
}) => {
  return (
    <svg
      viewBox="0 0 100 110"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shirt body */}
      <path
        d="M25 35 L25 105 L75 105 L75 35 L70 30 L65 25 L60 22 L55 20 L50 19 L45 20 L40 22 L35 25 L30 30 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Collar */}
      <path
        d="M40 22 L35 18 L40 15 L50 15 L60 15 L65 18 L60 22 Q55 25 50 25 Q45 25 40 22"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Left long sleeve */}
      <path
        d="M25 35 L15 40 L8 45 L5 55 L3 65 L5 75 L8 80 L15 82 L25 80 L25 70 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Right long sleeve */}
      <path
        d="M75 35 L85 40 L92 45 L95 55 L97 65 L95 75 L92 80 L85 82 L75 80 L75 70 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Button placket */}
      <line x1="50" y1="25" x2="50" y2="105" stroke="#1f2937" strokeWidth="1" />
      {/* Buttons */}
      <circle cx="50" cy="35" r="1.5" fill="#1f2937" />
      <circle cx="50" cy="45" r="1.5" fill="#1f2937" />
      <circle cx="50" cy="55" r="1.5" fill="#1f2937" />
      <circle cx="50" cy="65" r="1.5" fill="#1f2937" />
      <circle cx="50" cy="75" r="1.5" fill="#1f2937" />
      <circle cx="50" cy="85" r="1.5" fill="#1f2937" />
      <circle cx="50" cy="95" r="1.5" fill="#1f2937" />
      {/* Cuffs */}
      <rect x="3" y="78" width="12" height="4" fill={color} stroke="#1f2937" strokeWidth="0.5" />
      <rect x="85" y="78" width="12" height="4" fill={color} stroke="#1f2937" strokeWidth="0.5" />
    </svg>
  );
};