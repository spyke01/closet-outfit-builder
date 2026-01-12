'use client';

import React, { useMemo } from 'react';
import { WardrobeItem } from '@/lib/types/database';
import { Shirt, Watch, Zap } from 'lucide-react';

interface OutfitGridLayoutProps {
  items: WardrobeItem[];
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  interactive?: boolean;
  onItemClick?: (item: WardrobeItem) => void;
}

export const OutfitGridLayout: React.FC<OutfitGridLayoutProps> = ({ 
  items, 
  className = '',
  size = 'medium',
  showLabels = false,
  interactive = false,
  onItemClick
}) => {
  // Define size classes for responsive sizing - updated for proper card layout
  const sizeClasses = {
    small: 'w-full h-full', 
    medium: 'w-full h-full',  
    large: 'w-full h-full'
  };

  // Organize items by category for structured layout
  const organizedItems = useMemo(() => {
    const categorized = {
      tops: [] as WardrobeItem[],
      bottoms: [] as WardrobeItem[],
      shoes: [] as WardrobeItem[],
      accessories: [] as WardrobeItem[]
    };
    
    items.forEach(item => {
      if (!item.category?.name) return;
      
      const categoryKey = item.category.name.toLowerCase();
      
      if (categoryKey.includes('jacket') || categoryKey.includes('overshirt') || 
          categoryKey.includes('shirt') || categoryKey.includes('blazer')) {
        categorized.tops.push(item);
      } else if (categoryKey.includes('pants') || categoryKey.includes('trouser') || 
                 categoryKey.includes('jean') || categoryKey.includes('short')) {
        categorized.bottoms.push(item);
      } else if (categoryKey.includes('shoe') || categoryKey.includes('boot') || 
                 categoryKey.includes('sneaker')) {
        categorized.shoes.push(item);
      } else {
        categorized.accessories.push(item);
      }
    });
    
    return categorized;
  }, [items]);

  // Get placeholder icon for category
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('watch')) return Watch;
    if (name.includes('belt')) return Zap;
    return Shirt;
  };

  // Render item with image or placeholder - fixed sizing
  const renderItem = (item: WardrobeItem, index: number) => {
    const IconComponent = getCategoryIcon(item.category?.name || '');
    const isClickable = interactive && onItemClick;
    
    return (
      <div
        key={item.id}
        className={`
          relative bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700
          shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden
          ${isClickable ? 'cursor-pointer hover:scale-105' : ''}
          w-full h-full max-w-[125px] max-h-[125px]
        `}
        style={{ aspectRatio: '1' }}
        onClick={() => isClickable && onItemClick(item)}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-700">
            <IconComponent className="w-8 h-8 text-slate-400" />
          </div>
        )}
        
        {showLabels && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <p className="text-white text-xs font-medium truncate">
              {item.name}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Calculate grid layout based on item count and size
  const getGridLayout = () => {
    const totalItems = items.length;
    
    if (totalItems <= 2) {
      return 'grid-cols-2';
    } else if (totalItems <= 4) {
      return 'grid-cols-2';
    } else if (totalItems <= 6) {
      return 'grid-cols-3';
    } else {
      return 'grid-cols-4';
    }
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
        {/* Flexible Grid Layout - up to 3 rows, 2-3 columns for 8 categories */}
        <div className="h-full grid gap-2 place-items-center" style={{
          gridTemplateColumns: items.length <= 2 ? 'repeat(2, 1fr)' : 
                              items.length <= 6 ? 'repeat(3, 1fr)' : 
                              'repeat(3, 1fr)',
          gridTemplateRows: items.length <= 3 ? '1fr' :
                           items.length <= 6 ? 'repeat(2, 1fr)' :
                           'repeat(3, 1fr)'
        }}>
          {items.map((item, index) => renderItem(item, index))}
        </div>
      </div>
    </div>
  );
};