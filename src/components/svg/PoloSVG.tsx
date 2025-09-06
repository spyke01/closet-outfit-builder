import React from 'react';

interface PoloSVGProps {
  color?: string;
  className?: string;
}

export const PoloSVG: React.FC<PoloSVGProps> = ({ 
  color = '#3b82f6', 
  className = '' 
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Polo body */}
      <path
        d="M25 35 L25 95 L75 95 L75 35 L70 30 L65 25 L60 22 L55 20 L50 19 L45 20 L40 22 L35 25 L30 30 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Polo collar - more structured than t-shirt */}
      <path
        d="M38 22 L35 18 L38 15 L42 12 L50 12 L58 12 L62 15 L65 18 L62 22 L58 25 L55 28 L50 30 L45 28 L42 25 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Collar fold line */}
      <path
        d="M42 15 L50 18 L58 15"
        fill="none"
        stroke="#1f2937"
        strokeWidth="0.8"
      />
      {/* Left sleeve */}
      <path
        d="M25 35 L15 40 L10 45 L12 55 L17 58 L25 55 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Right sleeve */}
      <path
        d="M75 35 L85 40 L90 45 L88 55 L83 58 L75 55 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Polo placket */}
      <path
        d="M45 30 L45 50 L55 50 L55 30"
        fill="none"
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Polo buttons */}
      <circle cx="50" cy="35" r="1.5" fill="#1f2937" />
      <circle cx="50" cy="42" r="1.5" fill="#1f2937" />
    </svg>
  );
};