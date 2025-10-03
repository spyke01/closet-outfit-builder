import React, { useState, useMemo, useCallback, startTransition, useDeferredValue } from 'react';
import { Search, Tag } from 'lucide-react';
import { WardrobeItem, Category, CapsuleTag } from '../types';
import { ColorCircle } from './ColorCircle';
import { useSettings } from '../contexts/SettingsContext';
import { formatItemName } from '../utils/itemUtils';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';

interface OptimizedItemsGridProps {
  category: Category;
  items: WardrobeItem[];
  selectedItem?: WardrobeItem;
  onItemSelect: (item: WardrobeItem) => void;
}

const capsuleTags: CapsuleTag[] = ['Refined', 'Adventurer', 'Crossover', 'Shorts'];

export const OptimizedItemsGrid: React.FC<OptimizedItemsGridProps> = ({
  category,
  items,
  selectedItem,
  onItemSelect
}) => {
  const { settings } = useSettings();
  const { measureInteraction, recordCustomMetric } = usePerformanceMonitoring();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<CapsuleTag>>(new Set());

  // Use deferred values for expensive filtering operations
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredSelectedTags = useDeferredValue(selectedTags);

  // Memoized filtering with performance tracking
  const filteredItems = useMemo(() => {
    const startTime = performance.now();
    
    const result = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(deferredSearchTerm.toLowerCase());
      const matchesTags = deferredSelectedTags.size === 0 ||
        item.capsuleTags?.some(tag => deferredSelectedTags.has(tag));
      return matchesSearch && matchesTags;
    });
    
    const endTime = performance.now();
    recordCustomMetric('searchResponseTime', endTime - startTime);
    
    return result;
  }, [items, deferredSearchTerm, deferredSelectedTags, recordCustomMetric]);

  // Check if filtering is in progress (deferred values are behind)
  const isFiltering = useMemo(() => {
    return searchTerm !== deferredSearchTerm || selectedTags !== deferredSelectedTags;
  }, [searchTerm, deferredSearchTerm, selectedTags, deferredSelectedTags]);

  // Optimized search handler with startTransition
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => {
      setSearchTerm(value);
    });
  }, []);

  // Optimized tag toggle with startTransition
  const toggleTag = useCallback((tag: CapsuleTag) => {
    measureInteraction('tag-toggle', () => {
      startTransition(() => {
        setSelectedTags(prevTags => {
          const newTags = new Set(prevTags);
          if (newTags.has(tag)) {
            newTags.delete(tag);
          } else {
            newTags.add(tag);
          }
          return newTags;
        });
      });
    });
  }, [measureInteraction]);

  // Optimized item selection handler
  const handleItemSelect = useCallback((item: WardrobeItem) => {
    measureInteraction('item-select', () => {
      startTransition(() => {
        onItemSelect(item);
      });
    });
  }, [onItemSelect, measureInteraction]);

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg sm:text-xl font-light text-slate-800 dark:text-slate-200">
              Choose {category}
            </h2>
            {isFiltering && (
              <div className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
                Filtering...
              </div>
            )}
          </div>

          {/* Mobile-first responsive controls */}
          <div className="space-y-3 sm:space-y-4">
            {/* Search bar - full width on mobile */}
            <div className="relative w-full">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent min-h-[44px] bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 transition-colors"
              />
            </div>

            {/* Filter tags - wrap on mobile */}
            <div className="flex flex-wrap items-center gap-2">
              <Tag size={16} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />
              {capsuleTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] flex-shrink-0 ${
                    selectedTags.has(tag)
                      ? 'bg-slate-800 dark:bg-slate-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow-sm'
                  } ${isFiltering ? 'opacity-75' : 'opacity-100'}`}
                  disabled={isFiltering}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
          {(searchTerm || selectedTags.size > 0) && (
            <span className="ml-2 text-xs">
              ({items.length} total)
            </span>
          )}
        </div>

        {/* Responsive grid - 2 cols on mobile, up to 6 on larger screens */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 transition-opacity duration-200 ${
          isFiltering ? 'opacity-75' : 'opacity-100'
        }`}>
          {filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => handleItemSelect(item)}
              className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 min-h-[80px] cursor-pointer touch-manipulation ${
                selectedItem?.id === item.id
                  ? 'border-slate-800 dark:border-slate-400 bg-slate-50 dark:bg-slate-700 shadow-sm'
                  : 'border-stone-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-md active:scale-95'
              } ${isFiltering ? 'pointer-events-none' : ''}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleItemSelect(item);
                }
              }}
              aria-label={`Select ${formatItemName(item, settings.showBrand)} for outfit building`}
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-2">
                  <ColorCircle itemName={item.name} size="md" />
                  <h3 className="font-medium text-slate-800 dark:text-slate-200 leading-tight text-sm sm:text-base">
                    {formatItemName(item, settings.showBrand)}
                  </h3>
                </div>

                {item.capsuleTags && (
                  <div className="flex flex-wrap gap-1">
                    {item.capsuleTags.map(tag => (
                      <span
                        key={tag}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          selectedTags.has(tag)
                            ? 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200'
                            : 'bg-stone-100 dark:bg-slate-600 text-stone-600 dark:text-slate-300'
                        }`}
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

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
              {searchTerm || selectedTags.size > 0 
                ? 'No items found matching your criteria.' 
                : 'No items available in this category.'}
            </p>
            {(searchTerm || selectedTags.size > 0) && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Try adjusting your search or removing some filters.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};