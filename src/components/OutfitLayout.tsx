import React from 'react';
import { OutfitSelection } from '../types';
import { ClothingItemDisplay } from './ClothingItemDisplay';

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
  // Define size classes for responsive sizing - using standard Tailwind classes
  const sizeClasses = {
    small: 'w-80 h-64', // 320px x 256px
    medium: 'w-96 h-80', // 384px x 320px  
    large: 'w-[28rem] h-96' // 448px x 384px (using arbitrary value for w-112 equivalent)
  };

  // Get all items that have been selected and have valid images
  const items = [
    { item: selection.jacket, category: 'jacket' },
    { item: selection.shirt, category: 'shirt' },
    { item: selection.undershirt, category: 'undershirt' },
    { item: selection.pants, category: 'pants' },
    { item: selection.shoes, category: 'shoes' },
    { item: selection.belt, category: 'belt' },
    { item: selection.watch, category: 'watch' }
  ].filter(({ item }) => {
    // Only include items that exist and have valid images
    return item && item.image && item.image.trim() !== '';
  });

  // Simplified flat lay positioning - better spacing and visibility
  const getFlatLayPosition = (category: string, index: number): React.CSSProperties => {
    const positions: Record<string, React.CSSProperties> = {
      // Left side - jacket
      jacket: {
        position: 'absolute',
        top: '5%',
        left: '5%',
        width: '40%',
        height: '50%',
        transform: 'rotate(-8deg)'
      },
      
      // Center-right - shirt
      shirt: {
        position: 'absolute',
        top: '8%',
        right: '15%',
        width: '35%',
        height: '45%',
        transform: 'rotate(3deg)'
      },
      
      // Far right - undershirt
      undershirt: {
        position: 'absolute',
        top: '12%',
        right: '5%',
        width: '30%',
        height: '40%',
        transform: 'rotate(8deg)'
      },
      
      // Center-bottom - pants
      pants: {
        position: 'absolute',
        top: '45%',
        left: '25%',
        width: '45%',
        height: '40%',
        transform: 'rotate(-5deg)'
      },
      
      // Bottom-right - shoes
      shoes: {
        position: 'absolute',
        bottom: '8%',
        right: '10%',
        width: '35%',
        height: '25%',
        transform: 'rotate(2deg)'
      },
      
      // Mid-left - belt
      belt: {
        position: 'absolute',
        top: '60%',
        left: '8%',
        width: '30%',
        height: '15%',
        transform: 'rotate(-25deg)'
      },
      
      // Mid-right - watch
      watch: {
        position: 'absolute',
        top: '50%',
        right: '25%',
        width: '18%',
        height: '20%',
        transform: 'rotate(15deg)'
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
          <div className="text-2xl mb-2">📷</div>
          <div className="text-sm">No items with images</div>
          <div className="text-xs mt-1 opacity-75">Add images to wardrobe items to see visual layout</div>
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
            className="transition-all drop-shadow-md"
          >
            <ClothingItemDisplay 
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
