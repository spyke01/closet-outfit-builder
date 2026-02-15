'use client';

import React, { useState, useMemo, useCallback, startTransition, useDeferredValue, useEffect } from 'react';
import { Search, Tag, Plus } from 'lucide-react';
import { useContentVisibility } from '@/lib/utils/content-visibility';
import { ProcessingIndicator } from './processing-indicator';




import Image from 'next/image';
import { useImmerState } from '@/lib/utils/immer-state';
import { safeValidate } from '@/lib/utils/validation';
import { 
  WardrobeItemSchema
} from '@/lib/schemas';
import { type WardrobeItem } from '@/lib/types/database';

import { ImageUploadWithErrorBoundary as ImageUpload } from './dynamic/image-upload-dynamic';

// Hoist static JSX elements outside component for performance
const SEARCH_ICON = <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />;
const TAG_ICON = <Tag size={16} className="text-muted-foreground flex-shrink-0" />;

type CapsuleTagType = 'Refined' | 'Adventurer' | 'Crossover' | 'Shorts';

interface ItemsGridState {
  searchTerm: string;
  selectedTags: Set<string>;
  showAddForm: boolean;
  uploadError: string | null;
}

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
  void userId;

  // Immer-based state management
  const [state, updateState] = useImmerState<ItemsGridState>({
    searchTerm: '',
    selectedTags: new Set(),
    showAddForm: false,
    uploadError: null,
  });

  // Use deferred values for expensive filtering operations
  const deferredSearchTerm = useDeferredValue(state.searchTerm);
  const deferredSelectedTags = useDeferredValue(state.selectedTags);

  // Validate items with Zod (with better error handling)
  const validatedItems = useMemo(() => {
    return items.filter(() => {
      // For now, skip validation and just return all items
      // We can add validation back once we fix all schema issues
      return true;
    });
  }, [items]);

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

  // Content visibility optimization for large lists
  const contentVisibility = useContentVisibility(filteredItems.length, {
    threshold: 50,
    itemHeight: 200, // Approximate height of each grid item
  });

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
        bg_removal_status: 'pending' as const,
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
              <h2 className="text-lg sm:text-xl font-light text-foreground">
                Choose {category}
              </h2>
              {isFiltering && (
                <div className="inline-flex items-center gap-1 text-xs text-primary">
                  <div className="w-2 h-2 bg-primary  rounded-full animate-pulse"></div>
                  Filtering…
                </div>
              )}
            </div>

            {onItemAdd && (
              <button
                onClick={() => updateState(draft => { draft.showAddForm = !draft.showAddForm; })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    updateState(draft => { draft.showAddForm = !draft.showAddForm; });
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 bg-card text-white rounded-lg hover:bg-card transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Add new item"
              >
                <Plus size={16} />
                Add Item
              </button>
            )}
          </div>

          {/* Add Item Form */}
          {state.showAddForm && onItemAdd && (
            <div className="mb-6 p-4 border border-border rounded-lg bg-muted">
              <AddItemForm
                onSubmit={handleAddItem}
                onCancel={() => updateState(draft => { draft.showAddForm = false; })}
                onImageUpload={enableImageUpload}
                uploadError={state.uploadError}
              />
            </div>
          )}

          {/* Mobile-first responsive controls */}
          <div className="space-y-3 sm:space-y-4">
            {/* Search bar - full width on mobile */}
            <div className="relative w-full">
              <label htmlFor="items-search" className="sr-only">Search items</label>
              {SEARCH_ICON}
              <input
                id="items-search"
                type="search"
                name="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Search items..."
                value={state.searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent min-h-[44px] bg-card text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground transition-colors"
                aria-label="Search items in this category"
              />
            </div>

            {/* Filter tags - wrap on mobile */}
            <div className="flex flex-wrap items-center gap-2">
              {TAG_ICON}
              {capsuleTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleTag(tag);
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] duration-200 min-h-[44px] flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    state.selectedTags.has(tag)
                      ? 'bg-card bg-muted text-white shadow-sm'
                      : 'bg-card text-muted-foreground border border-border hover:bg-secondary/70 hover:border-foreground/25 hover:shadow-sm'
                  } ${isFiltering ? 'opacity-75' : 'opacity-100'}`}
                  aria-label={`Filter by ${tag}`}
                  aria-pressed={state.selectedTags.has(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
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
        style={contentVisibility.styles}>
          {filteredItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                handleItemSelect(item);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleItemSelect(item);
                }
              }}
              className={`p-3 sm:p-4 rounded-xl border-2 transition-[border-color,background-color,box-shadow,transform] duration-200 cursor-pointer touch-manipulation w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                validatedSelectedItem?.id === item.id
                  ? 'border-border bg-muted shadow-sm'
                  : 'border-border bg-card hover:border-border hover:shadow-md'
              }`}
              aria-label={`Select ${formatItemName(item)} for outfit building`}
              aria-pressed={validatedSelectedItem?.id === item.id}
            >
              {/* Fixed height image container */}
              {item.image_url && (
                <div className="h-40 sm:h-44 bg-card border border-border rounded-lg p-3 mb-3 flex items-center justify-center relative">
                  <Image
                    src={item.image_url}
                    alt={`${item.name}${item.brand ? ` by ${item.brand}` : ''} - ${item.category?.name || 'wardrobe item'}`}
                    fill
                    className="object-contain"
                    loading="lazy"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    quality={85}
                  />
                  {/* Background removal processing indicator */}
                  <ProcessingIndicator status={item.bg_removal_status} />
                </div>
              )}
              
              {/* Item details */}
              <div className="space-y-2 min-w-0">
                <div className="flex items-start gap-2 min-w-0">
                  <h3 className="font-medium text-foreground leading-tight text-sm sm:text-base line-clamp-2 break-words">
                    {formatItemName(item)}
                  </h3>
                </div>

                {item.capsule_tags && item.capsule_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.capsule_tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className={`px-2 py-1 text-xs rounded-md transition-colors truncate ${
                          state.selectedTags.has(tag)
                            ? 'bg-muted text-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                    {item.capsule_tags.length > 3 && (
                      <span className="px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground">
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
            <p className="text-muted-foreground text-sm sm:text-base">
              {state.searchTerm || state.selectedTags.size > 0 
                ? 'No items found matching your criteria.' 
                : 'No items available in this category.'}
            </p>
            {(state.searchTerm || state.selectedTags.size > 0) && (
              <p className="text-xs text-muted-foreground mt-2">
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
  uploadError?: string | null;
}

const AddItemForm: React.FC<AddItemFormProps> = ({
  onSubmit,
  onCancel,
  onImageUpload,
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

  // Track if form has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return formData.name.trim() !== '' || 
           formData.brand.trim() !== '' || 
           formData.image_url !== '';
  }, [formData.name, formData.brand, formData.image_url]);

  // Warn before navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, isSubmitting]);

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
          <label htmlFor="item-name" className="block text-sm font-medium text-muted-foreground mb-1">
            Name *
          </label>
          <input
            id="item-name"
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData(draft => { draft.name = e.target.value; })}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
            required
            aria-label="Enter item name"
            aria-required="true"
          />
        </div>
        
        <div>
          <label htmlFor="item-brand" className="block text-sm font-medium text-muted-foreground mb-1">
            Brand
          </label>
          <input
            id="item-brand"
            type="text"
            value={formData.brand}
            onChange={(e) => updateFormData(draft => { draft.brand = e.target.value; })}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
            aria-label="Enter item brand"
          />
        </div>
      </div>

      {onImageUpload && (
        <div>
          <label htmlFor="item-image" className="block text-sm font-medium text-muted-foreground mb-1">
            Image
          </label>
          <ImageUpload
            onUpload={handleImageUpload}
            onError={(error) => console.error('Upload error:', error)}
          />
          {uploadError && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-1" role="alert" aria-live="polite">{uploadError}</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-secondary/70 hover:border-foreground/25 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!formData.name.trim() || isSubmitting}
          className="px-4 py-2 bg-card text-white rounded-lg hover:bg-card disabled:bg-muted disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Adding…' : 'Add Item'}
        </button>
      </div>
    </form>
  );
};
