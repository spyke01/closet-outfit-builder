import React from 'react';
import { extractColorsFromName } from '../utils/colorUtils';

interface ColorCircleProps {
  itemName: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const ColorCircle: React.FC<ColorCircleProps> = ({ 
  itemName, 
  size = 'sm',
  className = '' 
}) => {
  const colors = extractColorsFromName(itemName);
  
  if (colors.length === 0) return null;
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4'
  };
  
  const sizeClass = sizeClasses[size];
  
  // Single color - solid circle
  if (colors.length === 1) {
    return (
      <div 
        className={`${sizeClass} rounded-full border border-stone-300 flex-shrink-0 ${className}`}
        style={{ backgroundColor: colors[0] }}
        title={`Color: ${itemName}`}
      />
    );
  }
  
  // Two colors - split circle (left/right)
  if (colors.length === 2) {
    return (
      <div 
        className={`${sizeClass} rounded-full border border-stone-300 flex-shrink-0 overflow-hidden relative ${className}`}
        title={`Colors: ${itemName}`}
      >
        <div 
          className="absolute inset-0 w-1/2"
          style={{ backgroundColor: colors[0] }}
        />
        <div 
          className="absolute inset-0 left-1/2 w-1/2"
          style={{ backgroundColor: colors[1] }}
        />
      </div>
    );
  }
  
  // Three colors - split circle with gradient
  if (colors.length === 3) {
    const gradient = `linear-gradient(120deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`;
    return (
      <div 
        className={`${sizeClass} rounded-full border border-stone-300 flex-shrink-0 ${className}`}
        style={{ background: gradient }}
        title={`Colors: ${itemName}`}
      />
    );
  }
  
  // Four or more colors - radial gradient
  const gradient = `conic-gradient(${colors.map((color, index) => 
    `${color} ${(index * 360) / colors.length}deg ${((index + 1) * 360) / colors.length}deg`
  ).join(', ')})`;
  
  return (
    <div 
      className={`${sizeClass} rounded-full border border-stone-300 flex-shrink-0 ${className}`}
      style={{ background: gradient }}
      title={`Colors: ${itemName}`}
    />
  );
};