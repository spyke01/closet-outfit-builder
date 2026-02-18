'use client';

import React from 'react';
import Image from 'next/image';
import { WardrobeItem } from '@/lib/types/database';
import { CircleDashed, Loader2, Shirt, Watch, Zap } from 'lucide-react';




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

  // Get placeholder icon for category
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('watch')) return Watch;
    if (name.includes('belt')) return Zap;
    return Shirt;
  };

  // Render item with image or placeholder - fixed sizing
  const renderItem = (item: WardrobeItem) => {
    const IconComponent = getCategoryIcon(item.category?.name || '');
    const isClickable = interactive && onItemClick;
    
    return (
      <button
        type="button"
        key={item.id}
        className={`
          relative bg-card rounded-lg
          transition-transform duration-200 overflow-hidden
          ${isClickable ? 'cursor-pointer hover:scale-105 will-change-transform' : ''}
          w-full h-full max-w-[125px] max-h-[125px]
        `}
        style={{ aspectRatio: '1' }}
        onClick={() => isClickable && onItemClick(item)}
        onKeyDown={(event) => {
          if (!isClickable) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onItemClick(item);
          }
        }}
        disabled={!isClickable}
      >
        {item.image_url ? (
          <div className="relative w-full h-full">
            <Image
              src={item.image_url}
              alt={`${item.name}${item.brand ? ` by ${item.brand}` : ''} - ${item.category?.name || 'outfit item'}`}
              fill
              className="object-cover"
              loading="lazy"
              sizes="125px"
              quality={80}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            {item.bg_removal_status === 'processing' ? (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-[10px] font-medium">Generating...</span>
              </div>
            ) : !item.bg_removal_status || item.bg_removal_status === 'pending' ? (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <CircleDashed className="w-5 h-5" />
                <span className="text-[10px] font-medium">Pending</span>
              </div>
            ) : (
              <IconComponent className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
        )}
        
        {showLabels && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 min-w-0">
            <p className="text-white text-xs font-semibold truncate" title={item.name}>
              {item.name}
            </p>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full p-3">
        {/* Flexible Grid Layout - up to 3 rows, 2-3 columns for 8 categories */}
        <div className="h-full grid gap-2 place-items-center" style={{
          gridTemplateColumns: items.length <= 2 ? 'repeat(2, 1fr)' : 
                              items.length <= 6 ? 'repeat(3, 1fr)' : 
                              'repeat(3, 1fr)',
          gridTemplateRows: items.length <= 3 ? '1fr' :
                           items.length <= 6 ? 'repeat(2, 1fr)' :
                           'repeat(3, 1fr)'
        }}>
          {items.map((item) => renderItem(item))}
        </div>
      </div>
    </div>
  );
};
