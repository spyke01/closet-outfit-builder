'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
import { WardrobeItem } from '@/lib/types/database';

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
        <p className="text-slate-500 dark:text-slate-400">No items found.</p>
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
              ? 'border-slate-800 dark:border-slate-400 bg-slate-50 dark:bg-slate-700 shadow-sm'
              : 'border-stone-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-md'
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
          {item.image_url && (
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-lg p-2 flex items-center justify-center flex-shrink-0">
              <Image
                src={item.image_url}
                alt={`${item.name}${item.brand ? ` by ${item.brand}` : ''}`}
                width={48}
                height={48}
                className="object-contain"
                loading="lazy"
                quality={80}
              />
            </div>
          )}
          
          {/* Item details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-slate-800 dark:text-slate-200 leading-tight truncate">
                  {formatItemName(item)}
                </h3>
                
                {item.color && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 truncate">
                    Color: {item.color}
                  </p>
                )}
                
                {item.material && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                    Material: {item.material}
                  </p>
                )}
              </div>
              
              {item.formality_score !== undefined && (
                <div className="flex-shrink-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
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
                    className="px-2 py-1 text-xs rounded-md bg-stone-100 dark:bg-slate-600 text-stone-600 dark:text-slate-300"
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