import React from 'react';

interface TShirtSVGProps {
  color?: string;
  className?: string;
}

export const TShirtSVG: React.FC<TShirtSVGProps> = ({ 
  color = '#ffffff', 
  className = '' 
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* T-shirt body */}
      <path
        d="M25 35 L25 95 L75 95 L75 35 L70 30 L65 25 L60 22 L55 20 L50 19 L45 20 L40 22 L35 25 L30 30 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Neckline */}
      <path
        d="M40 22 Q50 15 60 22 Q55 25 50 25 Q45 25 40 22"
        fill="none"
        stroke="#1f2937"
        strokeWidth="1"
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
    </svg>
  );
};