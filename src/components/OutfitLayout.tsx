import React from 'react';
import { OutfitSelection } from '../types';
import { ClothingItemSVG } from './svg';

interface OutfitLayoutProps {
  selection: OutfitSelection;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export const OutfitLayout: React.FC<OutfitLayoutProps> = ({ 
  selection, 
  className = '',
  size = 'medium'
}) => {
  // Define size classes for responsive sizing - more compact
  const sizeClasses = {
    small: 'w-72 h-56', // More compact for flat lay
    medium: 'w-80 h-64',
    large: 'w-96 h-72'
  };

  // Get all items that have been selected
  const items = [
    { item: selection.jacket, category: 'jacket' },
    { item: selection.shirt, category: 'shirt' },
    { item: selection.undershirt, category: 'undershirt' },
    { item: selection.pants, category: 'pants' },
    { item: selection.shoes, category: 'shoes' },
    { item: selection.belt, category: 'belt' },
    { item: selection.watch, category: 'watch' }
  ].filter(({ item }) => item !== undefined);

  // Smart flat lay positioning - adapts based on available items and fills space efficiently
  const getFlatLayPosition = (category: string, index: number): React.CSSProperties => {
    // Check which items we have to optimize layout
    const hasJacket = items.some(({ category }) => category === 'jacket');
    const hasUndershirt = items.some(({ category }) => category === 'undershirt');
    const hasBelt = items.some(({ category }) => category === 'belt');
    const hasWatch = items.some(({ category }) => category === 'watch');
    
    const positions: Record<string, React.CSSProperties> = {
      // Left side - jacket (prominent position)
      jacket: {
        position: 'absolute',
        top: '5%',
        left: '3%',
        width: '45%',
        height: '60%',
        transform: 'rotate(-10deg)'
      },
      
      // Center-right - shirt (adjust based on undershirt presence)
      shirt: {
        position: 'absolute',
        top: hasUndershirt ? '8%' : '5%',
        right: hasUndershirt ? '25%' : '5%',
        width: hasUndershirt ? '28%' : '40%',
        height: hasUndershirt ? '40%' : '55%',
        transform: hasUndershirt ? 'rotate(5deg)' : 'rotate(-3deg)'
      },
      
      // Far right - undershirt (when present)
      undershirt: {
        position: 'absolute',
        top: '12%',
        right: '3%',
        width: '35%',
        height: '45%',
        transform: 'rotate(12deg)'
      },
      
      // Center-bottom - pants (larger, prominent)
      pants: {
        position: 'absolute',
        top: hasJacket ? '40%' : '25%',
        left: hasJacket ? '25%' : '15%',
        width: '45%',
        height: '50%',
        transform: 'rotate(-8deg)'
      },
      
      // Bottom - shoes (spread across bottom)
      shoes: {
        position: 'absolute',
        bottom: '5%',
        left: '50%',
        width: '50%',
        height: '30%',
        transform: 'translateX(-50%) rotate(2deg)'
      },
      
      // Mid-left - belt (larger, more visible)
      belt: {
        position: 'absolute',
        top: hasJacket ? '50%' : '35%',
        left: hasJacket ? '5%' : '8%',
        width: '40%',
        height: '20%',
        transform: 'rotate(-30deg)'
      },
      
      // Top-right corner - watch (visible but not intrusive)
      watch: {
        position: 'absolute',
        top: hasUndershirt ? '3%' : '8%',
        right: hasUndershirt ? '40%' : '15%',
        width: '20%',
        height: '25%',
        transform: 'rotate(18deg)'
      }
    };

    return positions[category] || {
      position: 'absolute',
      top: `${20 + (index * 15)}%`,
      left: `${20 + (index * 10)}%`,
      width: '20%',
      height: '20%'
    };
  };

  if (items.length === 0) {
    return (
      <div className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-600`}>
        <div className="text-center text-amber-600 dark:text-amber-400">
          <div className="text-2xl mb-2">👔</div>
          <div className="text-sm">No items selected</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${sizeClasses[size]} ${className} relative bg-gradient-to-br from-amber-50 via-amber-25 to-stone-100 dark:from-amber-900/10 dark:via-stone-800 dark:to-stone-900 rounded-lg border border-amber-200 dark:border-stone-700 overflow-hidden shadow-inner`}
      style={{ 
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(245, 158, 11, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(217, 119, 6, 0.1) 0%, transparent 50%),
          linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(217, 119, 6, 0.05) 100%)
        `
      }}
    >
      {/* Wood grain texture overlay */}
      <div className="absolute inset-0 opacity-20 dark:opacity-10">
        <svg width="100%" height="100%" className="w-full h-full">
          <defs>
            <pattern id="wood-grain" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
              <path d="M0,10 Q25,5 50,10 T100,10" stroke="rgba(120, 53, 15, 0.3)" strokeWidth="0.5" fill="none"/>
              <path d="M0,15 Q30,12 60,15 T100,15" stroke="rgba(120, 53, 15, 0.2)" strokeWidth="0.3" fill="none"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wood-grain)"/>
        </svg>
      </div>

      {/* Render clothing items in flat lay style */}
      {items.map(({ item, category }, index) => {
        if (!item) return null;
        
        const itemStyle = getFlatLayPosition(category, index);
        
        return (
          <div
            key={`${item.id}-${index}`}
            style={itemStyle}
            className="transition-all duration-300 hover:scale-105 hover:z-10 drop-shadow-md"
          >
            <ClothingItemSVG 
              item={item}
              className="w-full h-full filter drop-shadow-sm"
            />
          </div>
        );
      })}

      {/* Item count badge */}
      <div className="absolute bottom-3 right-3">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-700 dark:text-slate-300 text-xs px-3 py-1.5 rounded-full border border-amber-200 dark:border-slate-600 shadow-sm">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};