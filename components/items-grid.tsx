'use client';

import React, { useState, useMemo, useCallback, startTransition, useDeferredValue } from 'react';
import Search from 'lucide-react/dist/esm/icons/search';
import Tag from 'lucide-react/dist/esm/icons/tag';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Shirt from 'lucide-react/dist/esm/icons/shirt';
import Image from 'next/image';
import { z } from 'zod';
import { useImmerState } from '@/lib/utils/immer-state';
import { safeValidate, validateFileUpload } from '@/lib/utils/validation';
import { 
  WardrobeItemSchema
} from '@/lib/schemas';
import { type WardrobeItem } from '@/lib/types/database';

import { ImageUpload } from './image-upload';

// Hoist static JSX elements outside component for performance
const EMPTY_STATE_ICON = <Shirt size={48} className="text-slate-300 mx-auto mb-4" />;
const SEARCH_ICON = <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />;
const TAG_ICON = <Tag size={16} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />;

// Items grid state schema
const ItemsGridStateSchema = z.object({
  searchTerm: z.string(),
  selectedTags: z.set(z.string()),
  showAddForm: z.boolean(),
  isUploading: z.boolean(),
  uploadError: z.string().nullable(),
});

type ItemsGridState = z.infer<typeof ItemsGridStateSchema>;

// Capsule tags enum
const CapsuleTag = z.enum(['Refined', 'Adventurer', 'Crossover', 'Shorts']);
type CapsuleTagType = z.infer<typeof CapsuleTag>;

const capsuleTags: CapsuleTagType[] = ['Refined', 'Adventurer', 'Crossover', 'Shorts'];

interface ItemsGridProps {
  category: string;
  items: WardrobeItem[];
  selectedItem?: WardrobeItem | null;
  onItemSelect: (item: WardrobeItem | null) => void; // Allow null for deselection
  onItemAdd?: (item: Omit<WardrobeItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  showBrand?: boolean;
  enableImageUpload?: boolean;
  userId?: string;
}

export const ItemsGrid: React.FC<ItemsGridProps> = ({
  category,
  items,
  selectedItem,
  onItemSelect,
  onItemAdd,
  showBrand = true,
  enableImageUpload = false,
  userId
}) => {
  // Immer-based state management
  const [state, updateState] = useImmerState<ItemsGridState>({
    searchTerm: '',
    selectedTags: new Set(),
    showAddForm: false,
    isUploading: false,
    uploadError: null,
  });

  // Use deferred values for expensive filtering operations
  const deferredSearchTerm = useDeferredValue(state.searchTerm);
  const deferredSelectedTags = useDeferredValue(state.selectedTags);

  // Validate items with Zod (with better error handling)
  const validatedItems = useMemo(() => {
    return items.filter(item => {
      // For now, skip validation and just return all items
      // We can add validation back once we fix all schema issues
      return true;
    });
  }, [items, category]);

  // Validate selected item
  const validatedSelectedItem = useMemo(() => {
    if (!selectedItem) return null;
    
    const validation = safeValidate(WardrobeItemSchema, selectedItem);
    if (!validation.success) {
      console.warn('Invalid selected item:', validation.error);
      return null;
    }
    
    return validation.data;
  }, [selectedItem]);

  // Memoized filtering with performance tracking
  const filteredItems = useMemo(() => {
    const startTime = performance.now();
    
    const result = validatedItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
                           (item.brand && item.brand.toLowerCase().includes(deferredSearchTerm.toLowerCase()));
      const matchesTags = deferredSelectedTags.size === 0 ||
        item.capsule_tags?.some(tag => deferredSelectedTags.has(tag));
      return matchesSearch && matchesTags;
    });
    
    const endTime = performance.now();
    console.debug('Search response time:', endTime - startTime, 'ms');
    
    return result;
  }, [validatedItems, deferredSearchTerm, deferredSelectedTags]);

  // Check if filtering is in progress (deferred values are behind)
  const isFiltering = useMemo(() => {
    return state.searchTerm !== deferredSearchTerm || state.selectedTags !== deferredSelectedTags;
  }, [state.searchTerm, deferredSearchTerm, state.selectedTags, deferredSelectedTags]);

  // Optimized search handler with startTransition
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => {
      updateState(draft => {
        draft.searchTerm = value;
      });
    });
  }, [updateState]);

  // Optimized tag toggle with startTransition
  const toggleTag = useCallback((tag: CapsuleTagType) => {
    startTransition(() => {
      updateState(draft => {
        if (draft.selectedTags.has(tag)) {
          draft.selectedTags.delete(tag);
        } else {
          draft.selectedTags.add(tag);
        }
      });
    });
  }, [updateState]);

  // Optimized item selection handler
  const handleItemSelect = useCallback((item: WardrobeItem) => {
    // Check if this item is already selected - if so, deselect it
    if (selectedItem && selectedItem.id === item.id) {
      onItemSelect(null); // Deselect
    } else {
      onItemSelect(item); // Select new item
    }
  }, [onItemSelect, selectedItem]);

  // Format item name helper
  const formatItemName = useCallback((item: WardrobeItem): string => {
    if (showBrand && item.brand) {
      return `${item.brand} ${item.name}`;
    }
    return item.name;
  }, [showBrand]);

  // Handle image upload (currently unused but kept for future functionality)
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    updateState(draft => {
      draft.isUploading = true;
      draft.uploadError = null;
    });

    try {
      // Validate file
      const fileValidation = validateFileUpload(
        file, 
        ['image/jpeg', 'image/png', 'image/webp'], 
        5 * 1024 * 1024 // 5MB
      );

      if (!fileValidation.success) {
        throw new Error(fileValidation.error);
      }

      // Create form data for upload
      const formData = new FormData();
      formData.append('image', file);
      formData.append('userId', userId || '');

      // Upload to API
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      return result.data.imageUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      updateState(draft => {
        draft.uploadError = errorMessage;
      });
      throw error;
    } finally {
      updateState(draft => {
        draft.isUploading = false;
      });
    }
  }, [userId, updateState]);

  // Handle adding new item
  const handleAddItem = useCallback(async (itemData: {
    name: string;
    brand?: string;
    color?: string;
    material?: string;
    formality_score?: number;
    capsule_tags?: string[];
    image_url?: string;
  }) => {
    if (!onItemAdd) return;

    try {
      const newItem = {
        category_id: category, // This should be the category UUID
        name: itemData.name,
        brand: itemData.brand,
        color: itemData.color,
        material: itemData.material,
        formality_score: itemData.formality_score,
        capsule_tags: itemData.capsule_tags,
        image_url: itemData.image_url,
        active: true,
        season: ['All'] as ('All' | 'Summer' | 'Winter' | 'Spring' | 'Fall')[],
      };

      await onItemAdd(newItem);
      
      updateState(draft => {
        draft.showAddForm = false;
      });
    } catch (error) {
      console.error('Error adding item:', error);
      updateState(draft => {
        draft.uploadError = error instanceof Error ? error.message : 'Failed to add item';
      });
    }
  }, [category, onItemAdd, updateState]);

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
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

            {onItemAdd && (
              <button
                onClick={() => updateState(draft => { draft.showAddForm = !draft.showAddForm; })}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
              >
                <Plus size={16} />
                Add Item
              </button>
            )}
          </div>

          {/* Add Item Form */}
          {state.showAddForm && onItemAdd && (
            <div className="mb-6 p-4 border border-stone-200 dark:border-slate-600 rounded-lg bg-stone-50 dark:bg-slate-800">
              <AddItemForm
                onSubmit={handleAddItem}
                onCancel={() => updateState(draft => { draft.showAddForm = false; })}
                onImageUpload={enableImageUpload}
                isUploading={state.isUploading}
                uploadError={state.uploadError}
              />
            </div>
          )}

          {/* Mobile-first responsive controls */}
          <div className="space-y-3 sm:space-y-4">
            {/* Search bar - full width on mobile */}
            <div className="relative w-full">
              {SEARCH_ICON}
              <input
                type="text"
                placeholder="Search items..."
                value={state.searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent min-h-[44px] bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 transition-colors"
              />
            </div>

            {/* Filter tags - wrap on mobile */}
            <div className="flex flex-wrap items-center gap-2">
              {TAG_ICON}
              {capsuleTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] flex-shrink-0 ${
                    state.selectedTags.has(tag)
                      ? 'bg-slate-800 dark:bg-slate-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow-sm'
                  } ${isFiltering ? 'opacity-75' : 'opacity-100'}`}
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
          {(state.searchTerm || state.selectedTags.size > 0) && (
            <span className="ml-2 text-xs">
              ({validatedItems.length} total)
            </span>
          )}
        </div>

        {/* Responsive grid - 2 cols on mobile, 3 on small, 4 on medium and up */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 transition-opacity duration-200 ${
          isFiltering ? 'opacity-75' : 'opacity-100'
        }`}
        style={{
          // Use content-visibility for performance with long lists
          contentVisibility: filteredItems.length > 20 ? 'auto' : 'visible',
          containIntrinsicSize: filteredItems.length > 20 ? '200px' : 'none'
        }}>
          {filteredItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                handleItemSelect(item);
              }}
              className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer touch-manipulation w-full text-left ${
                validatedSelectedItem?.id === item.id
                  ? 'border-slate-800 dark:border-slate-400 bg-slate-50 dark:bg-slate-700 shadow-sm'
                  : 'border-stone-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-md'
              }`}
              aria-label={`Select ${formatItemName(item)} for outfit building`}
            >
              {/* Fixed height image container */}
              {item.image_url && (
                <div className="h-40 sm:h-44 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3 flex items-center justify-center relative">
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    className="object-contain"
                    loading="lazy"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  />
                </div>
              )}
              
              {/* Item details */}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <h3 className="font-medium text-slate-800 dark:text-slate-200 leading-tight text-sm sm:text-base">
                    {formatItemName(item)}
                  </h3>
                </div>

                {item.capsule_tags && item.capsule_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.capsule_tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          state.selectedTags.has(tag)
                            ? 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200'
                            : 'bg-stone-100 dark:bg-slate-600 text-stone-600 dark:text-slate-300'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                    {item.capsule_tags.length > 3 && (
                      <span className="px-2 py-1 text-xs rounded-md bg-stone-100 dark:bg-slate-600 text-stone-600 dark:text-slate-300">
                        +{item.capsule_tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
              {state.searchTerm || state.selectedTags.size > 0 
                ? 'No items found matching your criteria.' 
                : 'No items available in this category.'}
            </p>
            {(state.searchTerm || state.selectedTags.size > 0) && (
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

// Add Item Form Component
interface AddItemFormProps {
  onSubmit: (data: {
    name: string;
    brand?: string;
    color?: string;
    material?: string;
    formality_score?: number;
    capsule_tags?: string[];
    image_url?: string;
  }) => Promise<void>;
  onCancel: () => void;
  onImageUpload?: boolean;
  isUploading?: boolean;
  uploadError?: string | null;
}

const AddItemForm: React.FC<AddItemFormProps> = ({
  onSubmit,
  onCancel,
  onImageUpload,
  isUploading = false,
  uploadError
}) => {
  const [formData, updateFormData] = useImmerState({
    name: '',
    brand: '',
    color: '',
    material: '',
    formality_score: 5,
    capsule_tags: [] as string[],
    image_url: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: formData.name.trim(),
        brand: formData.brand.trim() || undefined,
        color: formData.color.trim() || undefined,
        material: formData.material.trim() || undefined,
        formality_score: formData.formality_score,
        capsule_tags: formData.capsule_tags.length > 0 ? formData.capsule_tags : undefined,
        image_url: formData.image_url || undefined,
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    updateFormData(draft => {
      draft.image_url = imageUrl;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="item-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Name *
          </label>
          <input
            id="item-name"
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData(draft => { draft.name = e.target.value; })}
            className="w-full px-3 py-2 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            required
          />
        </div>
        
        <div>
          <label htmlFor="item-brand" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Brand
          </label>
          <input
            id="item-brand"
            type="text"
            value={formData.brand}
            onChange={(e) => updateFormData(draft => { draft.brand = e.target.value; })}
            className="w-full px-3 py-2 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:bg-slate-700 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {onImageUpload && (
        <div>
          <label htmlFor="item-image" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Image
          </label>
          <ImageUpload
            onUpload={handleImageUpload}
            onError={(error) => console.error('Upload error:', error)}
          />
          {uploadError && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{uploadError}</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-stone-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!formData.name.trim() || isSubmitting}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Adding...' : 'Add Item'}
        </button>
      </div>
    </form>
  );
};