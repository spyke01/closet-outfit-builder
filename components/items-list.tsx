'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
import { WardrobeItem } from '@/lib/types/database';
import { CircleDashed, Loader2, Shirt } from 'lucide-react';

interface ItemsListProps {
  items: WardrobeItem[];
  selectedItem?: WardrobeItem;
  onItemSelect: (item: WardrobeItem) => void;
  showBrand?: boolean;
}

export const ItemsList = React.memo<ItemsListProps>(({
  items,
  selectedItem,
  onItemSelect,
  showBrand = true,
}) => {
  const handleItemSelect = useCallback((item: WardrobeItem) => {
    onItemSelect(item);
  }, [onItemSelect]);

  const formatItemName = useCallback((item: WardrobeItem): string => {
    if (showBrand && item.brand) {
      return `${item.brand} ${item.name}`;
    }
    return item.name;
  }, [showBrand]);

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No items found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div
          key={item.id}
          onClick={() => handleItemSelect(item)}
          className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-[border-color,background-color,box-shadow] duration-200 cursor-pointer touch-manipulation ${
            selectedItem?.id === item.id
              ? 'border-border bg-muted shadow-sm'
              : 'border-border bg-card hover:border-border hover:shadow-md'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleItemSelect(item);
            }
          }}
          aria-label={`Select ${formatItemName(item)} for outfit building`}
        >
          {/* Image */}
          <div className="w-16 h-16 bg-muted rounded-lg p-2 flex items-center justify-center flex-shrink-0">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={`${item.name}${item.brand ? ` by ${item.brand}` : ''}`}
                width={48}
                height={48}
                className="object-contain"
                loading="lazy"
                quality={80}
              />
            ) : item.bg_removal_status === 'processing' ? (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : !item.bg_removal_status || item.bg_removal_status === 'pending' ? (
              <CircleDashed className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Shirt className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          
          {/* Item details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-foreground leading-tight truncate">
                  {formatItemName(item)}
                </h3>
                
                {item.color && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    Color: {item.color}
                  </p>
                )}
                
                {item.material && (
                  <p className="text-sm text-muted-foreground truncate">
                    Material: {item.material}
                  </p>
                )}
              </div>
              
              {item.formality_score !== undefined && (
                <div className="flex-shrink-0">
                  <span className="text-xs text-muted-foreground">
                    Formality: {item.formality_score}/10
                  </span>
                </div>
              )}
            </div>

            {item.capsule_tags && item.capsule_tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.capsule_tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

ItemsList.displayName = 'ItemsList';
