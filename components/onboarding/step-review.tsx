'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react/dist/esm/icons';
import type { GeneratedWardrobeItem } from '@/lib/types/onboarding';

interface StepReviewProps {
  items: GeneratedWardrobeItem[];
  onUpdateItems: (items: GeneratedWardrobeItem[]) => void;
  itemCapEnabled: boolean;
  onToggleItemCap: (enabled: boolean) => void;
}

export function StepReview({
  items,
  onUpdateItems,
  itemCapEnabled,
  onToggleItemCap,
}: StepReviewProps) {
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set(items.map(item => item.id)));

  const handleRemoveItem = useCallback((itemId: string) => {
    onUpdateItems(items.filter(item => item.id !== itemId));
  }, [items, onUpdateItems]);

  const handleImageLoad = useCallback((itemId: string) => {
    setLoadingImages(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  const handleImageError = useCallback((itemId: string) => {
    setLoadingImages(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  const itemsByCategory = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, GeneratedWardrobeItem[]>);
  }, [items]);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">Review your wardrobe</h2>
        <p className="text-muted-foreground">
          Preview the items that will be created. You can remove any items before finalizing.
        </p>
      </header>

      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800">
        <div>
          <p className="font-semibold text-blue-900 dark:text-blue-100">
            {items.length} items will be created
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {Object.keys(itemsByCategory).length} categories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={itemCapEnabled}
              onChange={(e) => onToggleItemCap(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
              id="item-cap-toggle"
              aria-describedby="item-cap-description"
            />
            <span className="text-sm text-blue-900 dark:text-blue-100" id="item-cap-description">
              Limit to 50 items
            </span>
          </label>
        </div>
      </div>

      <section className="space-y-6" aria-label="Wardrobe items by category">
        {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold mb-3 text-foreground">
              {category} ({categoryItems.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {categoryItems.map((item, index) => (
                <div
                  key={item.id}
                  className="relative group border border-gray-300 rounded-lg overflow-hidden bg-white dark:border-gray-600 dark:bg-gray-800"
                >
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="absolute top-2 right-2 z-10 p-1.5 min-w-[32px] min-h-[32px] bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 touch-manipulation"
                    aria-label={`Remove ${item.name}`}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>

                  <div className="aspect-square relative bg-gray-100 dark:bg-gray-700">
                    {item.image_url ? (
                      <>
                        {loadingImages.has(item.id) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 animate-pulse">
                            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin dark:border-gray-600 dark:border-t-blue-400"></div>
                          </div>
                        )}
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                          priority={index < 10}
                          loading={index < 10 ? 'eager' : 'lazy'}
                          onLoad={() => handleImageLoad(item.id)}
                          onError={() => handleImageError(item.id)}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl text-gray-400 dark:text-gray-500" aria-hidden="true">👕</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="text-sm font-medium text-foreground truncate" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.subcategory}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        Formality: {item.formality_score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {items.length === 0 && (
        <div className="text-center py-12" role="status">
          <p className="text-lg text-muted-foreground">
            No items to display. Please go back and make selections.
          </p>
        </div>
      )}
    </div>
  );
}
