import React from 'react';

interface DiverWatchSVGProps {
  color?: string;
  className?: string;
}

export const DiverWatchSVG: React.FC<DiverWatchSVGProps> = ({ 
  color = '#1f2937', 
  className = '' 
}) => {
  return (
    <svg
      viewBox="0 0 60 80"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Watch band top */}
      <path
        d="M18 10 Q30 5 42 10 L42 25 Q30 20 18 25 Z"
        fill="#1f2937"
        stroke="#374151"
        strokeWidth="0.5"
      />
      {/* Watch band bottom */}
      <path
        d="M18 55 Q30 60 42 55 L42 70 Q30 75 18 70 Z"
        fill="#1f2937"
        stroke="#374151"
        strokeWidth="0.5"
      />
      {/* Watch case - larger and more robust */}
      <circle cx="30" cy="40" r="17" fill={color} stroke="#374151" strokeWidth="1.5" />
      {/* Rotating bezel */}
      <circle cx="30" cy="40" r="15" fill="none" stroke="#6b7280" strokeWidth="1" />
      {/* Bezel markers */}
      <rect x="29" y="26" width="2" height="3" fill="#ef4444" />
      <rect x="29" y="51" width="2" height="3" fill="#6b7280" />
      <rect x="44" y="39" width="3" height="2" fill="#6b7280" />
      <rect x="13" y="39" width="3" height="2" fill="#6b7280" />
      {/* Watch face */}
      <circle cx="30" cy="40" r="12" fill="#000000" stroke="#374151" strokeWidth="0.5" />
      {/* Luminous hour markers */}
      <rect x="29" y="30" width="2" height="4" fill="#10b981" />
      <rect x="29" y="46" width="2" height="4" fill="#10b981" />
      <rect x="38" y="39" width="4" height="2" fill="#10b981" />
      <rect x="18" y="39" width="4" height="2" fill="#10b981" />
      {/* Additional markers */}
      <circle cx="35" cy="33" r="1" fill="#10b981" />
      <circle cx="25" cy="33" r="1" fill="#10b981" />
      <circle cx="35" cy="47" r="1" fill="#10b981" />
      <circle cx="25" cy="47" r="1" fill="#10b981" />
      {/* Watch hands - luminous */}
      <line x1="30" y1="40" x2="30" y2="32" stroke="#10b981" strokeWidth="2" />
      <line x1="30" y1="40" x2="36" y2="40" stroke="#10b981" strokeWidth="1.5" />
      <line x1="30" y1="40" x2="30" y2="46" stroke="#ef4444" strokeWidth="1" />
      {/* Center dot */}
      <circle cx="30" cy="40" r="1.5" fill="#10b981" />
      {/* Crown and pushers */}
      <rect x="46" y="36" width="4" height="3" fill={color} stroke="#374151" strokeWidth="0.5" />
      <rect x="46" y="41" width="3" height="2" fill={color} stroke="#374151" strokeWidth="0.5" />
      <rect x="46" y="45" width="3" height="2" fill={color} stroke="#374151" strokeWidth="0.5" />
      {/* Band texture */}
      <rect x="20" y="12" width="20" height="1" fill="#374151" />
      <rect x="20" y="15" width="20" height="1" fill="#374151" />
      <rect x="20" y="18" width="20" height="1" fill="#374151" />
      <rect x="20" y="62" width="20" height="1" fill="#374151" />
      <rect x="20" y="65" width="20" height="1" fill="#374151" />
      <rect x="20" y="68" width="20" height="1" fill="#374151" />
    </svg>
  );
};