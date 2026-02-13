'use client';

import React from 'react';
import Image from 'next/image';
import { WardrobeItem } from '@/lib/types/database';
import { Shirt, Watch, Zap } from 'lucide-react';




interface OutfitSimpleLayoutProps {
  items: WardrobeItem[];
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export const OutfitSimpleLayout: React.FC<OutfitSimpleLayoutProps> = ({ 
  items, 
  className = '',
  size = 'medium'
}) => {
  // Define default size classes - will be overridden by className if provided
  const defaultSizeClasses = {
    small: 'w-64 h-48', // 256px x 192px
    medium: 'w-80 h-64', // 320px x 256px  
    large: 'w-96 h-80' // 384px x 320px
  };

  // Use default size only if no size-related classes are provided in className
  const shouldUseDefaultSize = !className.includes('w-') && !className.includes('h-');
  const sizeClass = shouldUseDefaultSize ? defaultSizeClasses[size] : '';

  // Convert items array to selection-like object for positioning
  const itemsByCategory = React.useMemo(() => {
    const categorized: { [key: string]: WardrobeItem } = {};
    
    items.forEach(item => {
      if (item.category?.name) {
        const categoryKey = item.category.name.toLowerCase();
        // Map category names to standard keys
        if (categoryKey.includes('jacket')) {
          categorized.jacket = item;
        } else if (categoryKey.includes('overshirt')) {
          categorized.overshirt = item;
        } else if (categoryKey === 'shirt') {
          categorized.shirt = item;
        } else if (categoryKey === 'undershirt') {
          categorized.undershirt = item;
        } else if (categoryKey === 'pants') {
          categorized.pants = item;
        } else if (categoryKey === 'shoes') {
          categorized.shoes = item;
        } else if (categoryKey === 'belt') {
          categorized.belt = item;
        } else if (categoryKey === 'watch') {
          categorized.watch = item;
        }
      }
    });
    
    return categorized;
  }, [items]);

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'jacket':
      case 'shirt':
      case 'undershirt':
      case 'pants':
        return <Shirt className="w-4 h-4" />;
      case 'watch':
        return <Watch className="w-4 h-4" />;
      case 'shoes':
      case 'belt':
        return <Zap className="w-4 h-4" />;
      default:
        return <Shirt className="w-4 h-4" />;
    }
  };

  // Flat lay positioning for placeholders
  const getFlatLayPosition = (category: string, index: number): React.CSSProperties => {
    const positions: Record<string, React.CSSProperties> = {
      // Top left - jacket
      jacket: {
        position: 'absolute',
        top: '5%',
        left: '5%',
        width: '45%',
        height: '50%',
        transform: 'rotate(-8deg)',
        zIndex: 1
      },
      
      // Top center-left - overshirt
      overshirt: {
        position: 'absolute',
        top: '8%',
        left: '12%',
        width: '42%',
        height: '48%',
        transform: 'rotate(-5deg)',
        zIndex: 2
      },
      
      // Top right - shirt
      shirt: {
        position: 'absolute',
        top: '5%',
        right: '8%',
        width: '40%',
        height: '48%',
        transform: 'rotate(5deg)',
        zIndex: 2
      },
      
      // Center bottom - pants
      pants: {
        position: 'absolute',
        top: '45%',
        left: '15%',
        width: '35%',
        height: '50%',
        transform: 'rotate(-2deg)',
        zIndex: 1
      },
      
      // Bottom left - belt
      belt: {
        position: 'absolute',
        bottom: '25%',
        left: '5%',
        width: '30%',
        height: '12%',
        transform: 'rotate(-25deg)',
        zIndex: 3
      },
      
      // Center right - watch
      watch: {
        position: 'absolute',
        top: '35%',
        right: '8%',
        width: '20%',
        height: '20%',
        transform: 'rotate(20deg)',
        zIndex: 4
      },
      
      // Bottom right - shoes
      shoes: {
        position: 'absolute',
        bottom: '8%',
        right: '10%',
        width: '40%',
        height: '28%',
        transform: 'rotate(3deg)',
        zIndex: 2
      },
      
      // Far right - undershirt (if present)
      undershirt: {
        position: 'absolute',
        top: '12%',
        right: '3%',
        width: '35%',
        height: '40%',
        transform: 'rotate(12deg)',
        zIndex: 1
      }
    };

    return positions[category] || {
      position: 'absolute',
      top: `${20 + (index * 15)}%`,
      left: `${20 + (index * 10)}%`,
      width: '25%',
      height: '25%',
      transform: `rotate(${(index * 8) - 4}deg)`,
      zIndex: index + 1
    };
  };

  if (items.length === 0) {
    return (
      <div className={`${sizeClass} ${className} flex items-center justify-center bg-gradient-to-br from-card via-muted to-card rounded-lg border-2 border-dashed border-border`}>
        <div className="text-center text-muted-foreground">
          <div className="text-2xl mb-2">👔</div>
          <div className="text-sm">No items</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${sizeClass} ${className} relative bg-gradient-to-br from-card via-muted to-card rounded-lg border border-border overflow-hidden`}
    >
      {/* Render clothing item placeholders */}
      {Object.entries(itemsByCategory).map(([category, item], index) => {
        const itemStyle = getFlatLayPosition(category, index);
        
        return (
          <div
            key={`${item.id}-${category}`}
            style={itemStyle}
            className="transition-transform duration-300 hover:scale-105 will-change-transform"
          >
            <div className="w-full h-full relative">
              {item.image_url ? (
                <div className="relative w-full h-full">
                  <Image
                    src={item.image_url}
                    alt={`${item.name}${item.brand ? ` by ${item.brand}` : ''}`}
                    fill
                    className="object-contain filter drop-shadow-sm"
                    sizes="(max-width: 768px) 25vw, (max-width: 1200px) 20vw, 15vw"
                    loading="lazy"
                    quality={85}
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center border-2 border-border shadow-sm">
                  <div className="text-muted-foreground">
                    {getCategoryIcon(category)}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Item count badge */}
      <div className="absolute bottom-2 right-2">
        <div className="bg-card/90 backdrop-blur-sm text-muted-foreground text-xs px-2 py-1 rounded-full border border-border shadow-sm">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};
