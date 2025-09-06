import React from 'react';

interface SneakersSVGProps {
  color?: string;
  className?: string;
}

export const SneakersSVG: React.FC<SneakersSVGProps> = ({ 
  color = '#ffffff', 
  className = '' 
}) => {
  return (
    <svg
      viewBox="0 0 100 40"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left sneaker upper */}
      <path
        d="M5 25 Q5 12 18 12 L35 12 Q42 12 44 18 L44 25 Q44 28 38 30 L18 30 Q5 28 5 25"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Left sneaker sole */}
      <ellipse cx="25" cy="30" rx="22" ry="4" fill="#1f2937" />
      {/* Left sneaker midsole */}
      <ellipse cx="25" cy="29" rx="20" ry="2" fill="#e5e7eb" />
      {/* Left sneaker toe cap */}
      <path
        d="M18 15 Q25 12 32 15 Q28 18 25 18 Q22 18 18 15"
        fill="#e5e7eb"
        stroke="#1f2937"
        strokeWidth="0.5"
      />
      {/* Left sneaker laces */}
      <line x1="22" y1="15" x2="28" y2="15" stroke="#1f2937" strokeWidth="1" />
      <line x1="20" y1="18" x2="30" y2="18" stroke="#1f2937" strokeWidth="1" />
      <line x1="22" y1="21" x2="28" y2="21" stroke="#1f2937" strokeWidth="1" />
      
      {/* Right sneaker upper */}
      <path
        d="M56 25 Q56 12 69 12 L86 12 Q93 12 95 18 L95 25 Q95 28 89 30 L69 30 Q56 28 56 25"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Right sneaker sole */}
      <ellipse cx="76" cy="30" rx="22" ry="4" fill="#1f2937" />
      {/* Right sneaker midsole */}
      <ellipse cx="76" cy="29" rx="20" ry="2" fill="#e5e7eb" />
      {/* Right sneaker toe cap */}
      <path
        d="M69 15 Q76 12 83 15 Q79 18 76 18 Q73 18 69 15"
        fill="#e5e7eb"
        stroke="#1f2937"
        strokeWidth="0.5"
      />
      {/* Right sneaker laces */}
      <line x1="73" y1="15" x2="79" y2="15" stroke="#1f2937" strokeWidth="1" />
      <line x1="71" y1="18" x2="81" y2="18" stroke="#1f2937" strokeWidth="1" />
      <line x1="73" y1="21" x2="79" y2="21" stroke="#1f2937" strokeWidth="1" />
    </svg>
  );
};