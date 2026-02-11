'use client';

import React, { useState, useMemo, useCallback, startTransition } from 'react';
import Image from 'next/image';
import { useCategories } from '@/lib/hooks/use-categories';
import { useWardrobeItems } from '@/lib/hooks/use-wardrobe-items';
import { ItemsList } from '@/components/items-list';
import { WardrobeSearchFiltersWithErrorBoundary as WardrobeSearchFilters } from '@/components/dynamic/wardrobe-search-filters-dynamic';
import { Button } from '@/components/ui/button';
import { Grid, List } from 'lucide-react';


import { WardrobeItem } from '@/lib/types/database';

export function WardrobePageClient() {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Fetch data using hooks
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useCategories();
  const { data: items = [], isLoading: itemsLoading, error: itemsError } = useWardrobeItems();

  // Filter items by search term, tags, and categories
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by tags
    if (selectedTags.size > 0) {
      filtered = filtered.filter(item =>
        item.capsule_tags?.some((tag: string) => selectedTags.has(tag))
      );
    }

    // Filter by categories (if any are selected)
    if (selectedCategories.size > 0) {
      filtered = filtered.filter(item => selectedCategories.has(item.category_id));
    }

    return filtered;
  }, [items, searchTerm, selectedTags, selectedCategories]);

  // Group items by category for display
  const itemsByCategory = useMemo(() => {
    const grouped = new Map<string, WardrobeItem[]>();
    
    categories.forEach(category => {
      const categoryItems = filteredItems.filter(item => item.category_id === category.id);
      grouped.set(category.id, categoryItems);
    });
    
    return grouped;
  }, [filteredItems, categories]);

  const handleItemSelect = useCallback((item: WardrobeItem) => {
    // Navigate to item detail page
    window.location.href = `/wardrobe/items/${item.id}`;
  }, []);



  // Search and filter handlers
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => {
      setSearchTerm(value);
    });
  }, []);

  const handleTagToggle = useCallback((tag: string) => {
    startTransition(() => {
      setSelectedTags(prev => {
        const newTags = new Set(prev);
        if (newTags.has(tag)) {
          newTags.delete(tag);
        } else {
          newTags.add(tag);
        }
        return newTags;
      });
    });
  }, []);

  const handleCategoryToggle = useCallback((categoryId: string) => {
    startTransition(() => {
      setSelectedCategories(prev => {
        const newCategories = new Set(prev);
        if (newCategories.has(categoryId)) {
          newCategories.delete(categoryId);
        } else {
          newCategories.add(categoryId);
        }
        return newCategories;
      });
    });
  }, []);

  if (categoriesError || itemsError) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-600 mb-2">Error Loading Wardrobe</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {categoriesError?.message || itemsError?.message || 'Unknown error occurred'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (categoriesLoading || itemsLoading) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading wardrobe...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-6">
      <div className="flex flex-col gap-6">
        {/* Unified Search and Filters */}
        <WardrobeSearchFilters
          searchTerm={searchTerm}
          selectedTags={selectedTags}
          selectedCategories={selectedCategories}
          categories={categories}
          onSearchChange={handleSearchChange}
          onTagToggle={handleTagToggle}
          onCategoryToggle={handleCategoryToggle}
          itemCount={filteredItems.length}
          totalCount={items.length}
        />

        {/* View Mode Toggle */}
        <div className="flex justify-end">
          <div className="flex border border-stone-300 dark:border-slate-600 rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid size={16} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List size={16} />
            </Button>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'grid' ? (
          // Grid View
          selectedCategories.size === 0 ? (
            // Show all categories with their items
            <div className="space-y-8">
              {categories.map(category => {
                const categoryItems = itemsByCategory.get(category.id) || [];
                
                if (categoryItems.length === 0) return null;
                
                return (
                  <div key={category.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                        {category.name}
                      </h2>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {/* Grid without search/filters since they're now at the top */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                      {categoryItems.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleItemSelect(item)}
                          className="border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-sm overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-md active:scale-95"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleItemSelect(item);
                            }
                          }}
                          aria-label={`Select ${item.brand ? `${item.brand} ${item.name}` : item.name} for outfit building`}
                        >
                          {/* Image section */}
                          {item.image_url && (
                            <div className="relative w-full h-48 bg-gray-50 dark:bg-slate-700">
                              <Image
                                src={item.image_url}
                                alt={`${item.brand ? `${item.brand} ${item.name}` : item.name} - ${category.name}`}
                                fill
                                className="object-contain p-4"
                                loading="lazy"
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                quality={85}
                              />
                            </div>
                          )}
                          
                          {/* Item info */}
                          <div className="p-3 border-t border-gray-200 dark:border-slate-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{category.name}</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 mb-2">
                              {item.brand ? `${item.brand} ${item.name}` : item.name}
                            </p>
                            
                            {item.capsule_tags && item.capsule_tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.capsule_tags.slice(0, 3).map(tag => (
                                  <span
                                    key={tag}
                                    className="px-2 py-1 text-xs rounded-md bg-stone-100 dark:bg-slate-600 text-stone-600 dark:text-slate-300 truncate"
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
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Show selected categories in grid - group by category if multiple selected
            selectedCategories.size === 1 ? (
              // Single category selected - show as flat grid
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {filteredItems.map(item => {
                  const category = categories.find(c => c.id === item.category_id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemSelect(item)}
                      className="border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-sm overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-md active:scale-95"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleItemSelect(item);
                        }
                      }}
                      aria-label={`Select ${item.brand ? `${item.brand} ${item.name}` : item.name} for outfit building`}
                    >
                      {/* Image section */}
                      {item.image_url && (
                        <div className="relative w-full h-48 bg-gray-50 dark:bg-slate-700">
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-contain p-4"
                            loading="lazy"
                            sizes="(max-width: 640px) 100vw, 50vw"
                          />
                        </div>
                      )}
                      
                      {/* Item info */}
                      <div className="p-3 border-t border-gray-200 dark:border-slate-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{category?.name || 'Item'}</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 mb-2">
                          {item.brand ? `${item.brand} ${item.name}` : item.name}
                        </p>
                        
                        {item.capsule_tags && item.capsule_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.capsule_tags.slice(0, 3).map((tag: string) => (
                              <span
                                key={tag}
                                className="px-2 py-1 text-xs rounded-md bg-stone-100 dark:bg-slate-600 text-stone-600 dark:text-slate-300"
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
                    </div>
                  );
                })}
              </div>
            ) : (
              // Multiple categories selected - show grouped by category
              <div className="space-y-8">
                {categories
                  .filter(category => selectedCategories.has(category.id))
                  .map(category => {
                    const categoryItems = itemsByCategory.get(category.id) || [];
                    
                    if (categoryItems.length === 0) return null;
                    
                    return (
                      <div key={category.id} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                            {category.name}
                          </h2>
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                          {categoryItems.map(item => (
                            <div
                              key={item.id}
                              onClick={() => handleItemSelect(item)}
                              className="border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-sm overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-md active:scale-95"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleItemSelect(item);
                                }
                              }}
                              aria-label={`Select ${item.brand ? `${item.brand} ${item.name}` : item.name} for outfit building`}
                            >
                              {/* Image section */}
                              {item.image_url && (
                                <div className="relative w-full h-48 bg-gray-50 dark:bg-slate-700">
                                  <Image
                                    src={item.image_url}
                                    alt={item.name}
                                    fill
                                    className="object-contain p-4"
                                    loading="lazy"
                                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                  />
                                </div>
                              )}
                              
                              {/* Item info */}
                              <div className="p-3 border-t border-gray-200 dark:border-slate-700">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{category.name}</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 mb-2">
                                  {item.brand ? `${item.brand} ${item.name}` : item.name}
                                </p>
                                
                                {item.capsule_tags && item.capsule_tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.capsule_tags.slice(0, 3).map(tag => (
                                      <span
                                        key={tag}
                                        className="px-2 py-1 text-xs rounded-md bg-stone-100 dark:bg-slate-600 text-stone-600 dark:text-slate-300"
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
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )
          )
        ) : (
          // List View
          selectedCategories.size === 0 ? (
            // Show all categories with their items in list view
            <div className="space-y-8">
              {categories.map(category => {
                const categoryItems = itemsByCategory.get(category.id) || [];
                
                if (categoryItems.length === 0) return null;
                
                return (
                  <div key={category.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                        {category.name}
                      </h2>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <ItemsList
                      items={categoryItems}
                      onItemSelect={handleItemSelect}
                      showBrand={true}
                    />
                  </div>
                );
              })}
            </div>
          ) : selectedCategories.size === 1 ? (
            // Single category selected - show as flat list
            <ItemsList
              items={filteredItems}
              onItemSelect={handleItemSelect}
              showBrand={true}
            />
          ) : (
            // Multiple categories selected - show grouped by category in list view
            <div className="space-y-8">
              {categories
                .filter(category => selectedCategories.has(category.id))
                .map(category => {
                  const categoryItems = itemsByCategory.get(category.id) || [];
                  
                  if (categoryItems.length === 0) return null;
                  
                  return (
                    <div key={category.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                          {category.name}
                        </h2>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      <ItemsList
                        items={categoryItems}
                        onItemSelect={handleItemSelect}
                        showBrand={true}
                      />
                    </div>
                  );
                })}
            </div>
          )
        )}

        {/* Empty states */}
        {categories.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No categories found
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Categories will be automatically created when you add your first items.
            </p>
          </div>
        )}

        {filteredItems.length === 0 && categories.length > 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No items found
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {searchTerm || selectedTags.size > 0 || selectedCategories.size > 0
                ? 'Try adjusting your search criteria or filters.'
                : 'Start building your wardrobe by adding your first items.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}