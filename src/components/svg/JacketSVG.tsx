import React from 'react';

interface JacketSVGProps {
  color?: string;
  className?: string;
}

export const JacketSVG: React.FC<JacketSVGProps> = ({ 
  color = '#374151', 
  className = '' 
}) => {
  return (
    <svg
      viewBox="0 0 100 120"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Jacket body */}
      <path
        d="M20 40 L20 110 L80 110 L80 40 L75 35 L70 30 L65 25 L60 22 L50 20 L40 22 L35 25 L30 30 L25 35 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Left lapel */}
      <path
        d="M20 40 L30 45 L35 50 L40 55 L45 50 L50 45 L50 40 L45 35 L40 30 L35 25 L30 30 L25 35 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Right lapel */}
      <path
        d="M80 40 L70 45 L65 50 L60 55 L55 50 L50 45 L50 40 L55 35 L60 30 L65 25 L70 30 L75 35 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Left sleeve */}
      <path
        d="M20 40 L15 45 L10 50 L8 60 L10 70 L15 75 L20 70 L20 60 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Right sleeve */}
      <path
        d="M80 40 L85 45 L90 50 L92 60 L90 70 L85 75 L80 70 L80 60 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Buttons */}
      <circle cx="50" cy="55" r="2" fill="#1f2937" />
      <circle cx="50" cy="65" r="2" fill="#1f2937" />
      <circle cx="50" cy="75" r="2" fill="#1f2937" />
    </svg>
  );
};