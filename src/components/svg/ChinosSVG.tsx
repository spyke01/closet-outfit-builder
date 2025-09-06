import React from 'react';

interface ChinosSVGProps {
  color?: string;
  className?: string;
}

export const ChinosSVG: React.FC<ChinosSVGProps> = ({ 
  color = '#8b7355', 
  className = '' 
}) => {
  return (
    <svg
      viewBox="0 0 100 120"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Waistband */}
      <rect x="20" y="10" width="60" height="8" fill={color} stroke="#1f2937" strokeWidth="1" />
      {/* Belt loops */}
      <rect x="25" y="8" width="2" height="12" fill={color} stroke="#1f2937" strokeWidth="0.5" />
      <rect x="35" y="8" width="2" height="12" fill={color} stroke="#1f2937" strokeWidth="0.5" />
      <rect x="49" y="8" width="2" height="12" fill={color} stroke="#1f2937" strokeWidth="0.5" />
      <rect x="63" y="8" width="2" height="12" fill={color} stroke="#1f2937" strokeWidth="0.5" />
      <rect x="73" y="8" width="2" height="12" fill={color} stroke="#1f2937" strokeWidth="0.5" />
      
      {/* Left leg */}
      <path
        d="M20 18 L20 110 L25 115 L40 115 L45 110 L45 18 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Right leg */}
      <path
        d="M55 18 L55 110 L60 115 L75 115 L80 110 L80 18 Z"
        fill={color}
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Crotch seam */}
      <path
        d="M45 18 Q50 25 55 18"
        fill="none"
        stroke="#1f2937"
        strokeWidth="1"
      />
      {/* Left pocket */}
      <path
        d="M25 25 Q30 30 25 35"
        fill="none"
        stroke="#1f2937"
        strokeWidth="0.8"
      />
      {/* Right pocket */}
      <path
        d="M75 25 Q70 30 75 35"
        fill="none"
        stroke="#1f2937"
        strokeWidth="0.8"
      />
      {/* Left seam */}
      <line x1="20" y1="18" x2="25" y2="115" stroke="#6b5b47" strokeWidth="0.5" />
      {/* Right seam */}
      <line x1="80" y1="18" x2="75" y2="115" stroke="#6b5b47" strokeWidth="0.5" />
      {/* Inner seams */}
      <line x1="45" y1="25" x2="40" y2="115" stroke="#6b5b47" strokeWidth="0.5" />
      <line x1="55" y1="25" x2="60" y2="115" stroke="#6b5b47" strokeWidth="0.5" />
    </svg>
  );
};