'use client';

import React from 'react';
import { WardrobeItem } from '@/lib/types/database';

interface OutfitVisualLayoutProps {
  items: WardrobeItem[];
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export const OutfitVisualLayout: React.FC<OutfitVisualLayoutProps> = ({ 
  items, 
  className = '',
  size = 'medium'
}) => {
  // Define size classes for responsive sizing
  const sizeClasses = {
    small: 'w-64 h-48', // 256px x 192px
    medium: 'w-80 h-64', // 320px x 256px  
    large: 'w-96 h-80' // 384px x 320px
  };

  // Convert items array to selection-like object for positioning
  const itemsByCategory = React.useMemo(() => {
    const categorized: { [key: string]: WardrobeItem } = {};
    
    items.forEach(item => {
      if (item.category?.name) {
        const categoryKey = item.category.name.toLowerCase();
        // Map category names to standard keys - be more flexible with matching
        if (categoryKey.includes('jacket') || categoryKey.includes('blazer')) {
          categorized.jacket = item;
        } else if (categoryKey.includes('overshirt')) {
          categorized.overshirt = item;
        } else if (categoryKey.includes('shirt') && !categoryKey.includes('under')) {
          categorized.shirt = item;
        } else if (categoryKey.includes('undershirt') || categoryKey.includes('under')) {
          categorized.undershirt = item;
        } else if (categoryKey.includes('pants') || categoryKey.includes('trouser') || categoryKey.includes('jean')) {
          categorized.pants = item;
        } else if (categoryKey.includes('shoe') || categoryKey.includes('boot') || categoryKey.includes('sneaker')) {
          categorized.shoes = item;
        } else if (categoryKey.includes('belt')) {
          categorized.belt = item;
        } else if (categoryKey.includes('watch')) {
          categorized.watch = item;
        } else {
          // Fallback - use the category name as-is for unknown categories
          categorized[categoryKey] = item;
        }
      }
    });
    
    return categorized;
  }, [items]);

  // Get items that have valid images
  const validItems = React.useMemo(() => {
    const valid = Object.entries(itemsByCategory)
      .filter(([_, item]) => item && item.image_url && item.image_url.trim() !== '')
      .map(([category, item]) => ({ category, item }));
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('OutfitVisualLayout Debug:', {
        totalItems: items.length,
        categorizedItems: Object.keys(itemsByCategory).length,
        validItemsCount: valid.length,
        itemsByCategory,
        validItemsData: valid
      });
    }
    
    return valid;
  }, [itemsByCategory, items]);

  // Flat lay positioning - optimized for the layout shown in the image
  const getFlatLayPosition = (category: string, index: number): React.CSSProperties => {
    const positions: Record<string, React.CSSProperties> = {
      // Top left - jacket
      jacket: {
        position: 'absolute',
        top: '8%',
        left: '8%',
        width: '35%',
        height: '45%',
        transform: 'rotate(-12deg)',
        zIndex: 1
      },
      
      // Top center-left - overshirt (layered over jacket area)
      overshirt: {
        position: 'absolute',
        top: '12%',
        left: '15%',
        width: '32%',
        height: '40%',
        transform: 'rotate(-8deg)',
        zIndex: 2
      },
      
      // Top right - shirt
      shirt: {
        position: 'absolute',
        top: '5%',
        right: '15%',
        width: '32%',
        height: '42%',
        transform: 'rotate(8deg)',
        zIndex: 2
      },
      
      // Center bottom - pants
      pants: {
        position: 'absolute',
        top: '45%',
        left: '20%',
        width: '25%',
        height: '45%',
        transform: 'rotate(-3deg)',
        zIndex: 1
      },
      
      // Bottom left - belt
      belt: {
        position: 'absolute',
        bottom: '25%',
        left: '5%',
        width: '25%',
        height: '12%',
        transform: 'rotate(-35deg)',
        zIndex: 3
      },
      
      // Center right - watch
      watch: {
        position: 'absolute',
        top: '35%',
        right: '8%',
        width: '15%',
        height: '18%',
        transform: 'rotate(25deg)',
        zIndex: 4
      },
      
      // Bottom right - shoes
      shoes: {
        position: 'absolute',
        bottom: '8%',
        right: '12%',
        width: '32%',
        height: '22%',
        transform: 'rotate(5deg)',
        zIndex: 2
      },
      
      // Far right - undershirt (if present)
      undershirt: {
        position: 'absolute',
        top: '12%',
        right: '5%',
        width: '28%',
        height: '38%',
        transform: 'rotate(15deg)',
        zIndex: 1
      }
    };

    // Fallback positioning for unknown categories
    const fallbackPosition = {
      position: 'absolute' as const,
      top: `${15 + (index * 20)}%`,
      left: `${15 + (index * 15)}%`,
      width: '20%',
      height: '20%',
      transform: `rotate(${(index * 10) - 5}deg)`,
      zIndex: index + 1
    };

    return positions[category] || fallbackPosition;
  };

  if (validItems.length === 0) {
    // Show a simple item count if we have items but no images
    if (items.length > 0) {
      return (
        <div className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg border border-slate-200 dark:border-slate-600`}>
          <div className="text-center text-slate-600 dark:text-slate-400">
            <div className="text-3xl mb-2">👔</div>
            <div className="text-sm font-medium">{items.length} Items</div>
            <div className="text-xs mt-1 opacity-75">Add images to see layout</div>
          </div>
        </div>
      );
    }
    
    // Show empty state if no items at all
    return (
      <div className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600`}>
        <div className="text-center text-slate-500 dark:text-slate-400">
          <div className="text-2xl mb-2">📷</div>
          <div className="text-sm">No items</div>
          <div className="text-xs mt-1 opacity-75">Create an outfit to see items</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${sizeClasses[size]} ${className} relative bg-gradient-to-br from-slate-50 via-slate-25 to-stone-100 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner`}
      style={{ 
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(148, 163, 184, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(100, 116, 139, 0.1) 0%, transparent 50%),
          linear-gradient(135deg, rgba(148, 163, 184, 0.05) 0%, rgba(100, 116, 139, 0.05) 100%)
        `
      }}
    >
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-10 dark:opacity-5">
        <svg width="100%" height="100%" className="w-full h-full">
          <defs>
            <pattern id="fabric-texture" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="1" fill="rgba(100, 116, 139, 0.3)"/>
              <circle cx="15" cy="15" r="0.5" fill="rgba(100, 116, 139, 0.2)"/>
              <circle cx="45" cy="45" r="0.5" fill="rgba(100, 116, 139, 0.2)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#fabric-texture)"/>
        </svg>
      </div>

      {/* Render clothing items in flat lay style */}
      {validItems.map(({ category, item }, index) => {
        const itemStyle = getFlatLayPosition(category, index);
        
        return (
          <div
            key={`${item.id}-${category}`}
            style={itemStyle}
            className="transition-all duration-300 hover:scale-105 drop-shadow-md hover:drop-shadow-lg"
          >
            <div className="w-full h-full relative group">
              <img
                src={item.image_url!}
                alt={item.name}
                className="w-full h-full object-contain filter drop-shadow-sm"
                style={{
                  filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))'
                }}
              />
              
              {/* Hover tooltip */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                {item.name}
                {item.brand && ` • ${item.brand}`}
              </div>
            </div>
          </div>
        );
      })}

      {/* Item count badge */}
      <div className="absolute bottom-2 right-2">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-700 dark:text-slate-300 text-xs px-2 py-1 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm">
          {validItems.length} item{validItems.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};