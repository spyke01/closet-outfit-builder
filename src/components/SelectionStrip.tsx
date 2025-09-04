import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { OutfitSelection, Category, WardrobeItem, GeneratedOutfit, categoryToKey } from '../types';
import { CategoryDropdown } from './CategoryDropdown';
import { OutfitList } from './OutfitList';
import { useOutfitEngine } from '../hooks/useOutfitEngine';

interface SelectionStripProps {
  selection: OutfitSelection;
  anchorItem: WardrobeItem | null;
  onSelectionChange: (category: Category, item: WardrobeItem | null) => void;
  onOutfitSelect: (outfit: GeneratedOutfit) => void;
}

export const SelectionStrip: React.FC<SelectionStripProps> = ({
  selection,
  anchorItem,
  onSelectionChange,
  onOutfitSelect
}) => {
  // Only show SelectionStrip when anchor item is present - move this check before any hooks
  if (!anchorItem) {
    return null;
  }

  const { getCompatibleItems, getFilteredOutfits, validatePartialSelection } = useOutfitEngine();
  const [loadingCategories, setLoadingCategories] = useState<Set<Category>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [debouncedSelection, setDebouncedSelection] = useState<OutfitSelection>(selection);
  const debounceTimeoutRef = useRef<number | null>(null);

  // Debounce selection changes for performance
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSelection(selection);
    }, 150); // 150ms debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [selection]);

  // Define the four main categories for dropdowns
  const categories: { category: Category; key: keyof OutfitSelection }[] = [
    { category: 'Jacket/Overshirt', key: 'jacket' },
    { category: 'Shirt', key: 'shirt' },
    { category: 'Pants', key: 'pants' },
    { category: 'Shoes', key: 'shoes' },
  ];

  // Enhanced selection change handler with progressive filtering and error handling
  const handleSelectionChange = useCallback(async (category: Category, item: WardrobeItem | null) => {
    try {
      setError(null);
      setLoadingCategories(prev => new Set(prev).add(category));

      // Create a test selection to validate before applying
      const testSelection = { ...selection };
      const key = category.toLowerCase().replace('/', '') as keyof OutfitSelection;
      (testSelection as any)[key] = item;

      // Validate the partial selection
      if (validatePartialSelection(testSelection)) {
        // Apply the selection change
        onSelectionChange(category, item);
      } else {
        // Set error message for invalid selection
        setError('This combination is not compatible. Please try a different selection.');
      }
    } catch (err) {
      setError('An error occurred while updating your selection. Please try again.');
      console.error('Selection change error:', err);
    } finally {
      // Remove loading state after a brief delay to show loading feedback
      setTimeout(() => {
        setLoadingCategories(prev => {
          const newSet = new Set(prev);
          newSet.delete(category);
          return newSet;
        });
      }, 200);
    }
  }, [selection, validatePartialSelection, onSelectionChange]);

  // Get filtered outfits based on debounced selection with error handling
  const filteredOutfits = useMemo(() => {
    try {
      // Ensure anchor item is included in the selection for outfit filtering
      let selectionWithAnchor = { ...debouncedSelection };
      if (anchorItem && !Object.values(debouncedSelection).some(item => item?.id === anchorItem.id)) {
        const anchorKey = categoryToKey(anchorItem.category);
        (selectionWithAnchor as any)[anchorKey] = anchorItem;
      }
      
      return getFilteredOutfits(selectionWithAnchor);
    } catch (err) {
      console.error('Error filtering outfits:', err);
      setError('Unable to load matching outfits. Please try refreshing the page.');
      return [];
    }
  }, [debouncedSelection, anchorItem, getFilteredOutfits]);

  // Memoize compatible items calculation for each category
  const compatibleItemsCache = useMemo(() => {
    const cache: Record<string, WardrobeItem[]> = {};
    
    // Ensure anchor item is included in the selection for compatibility checking
    let selectionWithAnchor = { ...debouncedSelection };
    if (anchorItem && !Object.values(debouncedSelection).some(item => item?.id === anchorItem.id)) {
      const anchorKey = categoryToKey(anchorItem.category);
      (selectionWithAnchor as any)[anchorKey] = anchorItem;
    }
    
    // Only log when anchor item changes to reduce noise
    if (anchorItem?.id === 'mac-coat-navy') {
      console.log('SelectionStrip - selectionWithAnchor:', selectionWithAnchor);
      console.log('SelectionStrip - anchorItem:', anchorItem);
    }
    
    categories.forEach(({ category }) => {
      try {
        const compatibleItems = getCompatibleItems(category, selectionWithAnchor);
        // Only log for jacket category to reduce noise
        if (category === 'Jacket/Overshirt') {
          console.log(`SelectionStrip - Compatible items for ${category}:`, compatibleItems.length, compatibleItems.map(i => i.name));
        }
        cache[category] = compatibleItems;
      } catch (err) {
        console.error(`Error getting compatible items for ${category}:`, err);
        cache[category] = [];
      }
    });
    return cache;
  }, [debouncedSelection, anchorItem, getCompatibleItems]);

  return (
    <div className="bg-white border-b border-stone-200 px-3 sm:px-6 py-3 sm:py-4">
      <div className="space-y-3 sm:space-y-4 relative">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 sm:px-4 py-2 sm:py-3" role="alert">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2 sm:ml-3">
                <p className="text-xs sm:text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-2 sm:pl-3">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex text-red-400 hover:text-red-600 min-h-[44px] min-w-[44px] items-center justify-center sm:min-h-0 sm:min-w-0"
                  aria-label="Dismiss error message"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Dropdowns - Mobile-First Responsive */}
        <div className="space-y-3 md:space-y-0">
          {/* Label */}
          <span className="block text-xs sm:text-sm font-medium text-slate-600">
            {anchorItem ? `Building from ${anchorItem.name}:` : 'Build Outfit:'}
          </span>
          
          {/* Dropdowns Container - Stacked on mobile, horizontal on tablet+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
            {categories.map(({ category, key }) => {
              const selectedItem = selection[key] as WardrobeItem | undefined;
              const availableItems = compatibleItemsCache[category] || [];
              // Lock the dropdown if this category matches the anchor item's category
              const isLocked = anchorItem && anchorItem.category === category;

              return (
                <CategoryDropdown
                  key={category}
                  category={category}
                  selectedItem={selectedItem || null}
                  availableItems={availableItems}
                  onSelect={(item) => handleSelectionChange(category, item)}
                  isLoading={loadingCategories.has(category)}
                  disabled={isLocked}
                  isLocked={isLocked}
                />
              );
            })}
          </div>
        </div>

        {/* Outfit List */}
        <OutfitList
          outfits={filteredOutfits}
          onOutfitSelect={onOutfitSelect}
        />
      </div>
    </div>
  );
};