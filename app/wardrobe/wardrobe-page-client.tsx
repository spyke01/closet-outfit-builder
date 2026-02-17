'use client';

import React, { useState, useMemo, useCallback, startTransition, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useCategories } from '@/lib/hooks/use-categories';
import { useWardrobeItems } from '@/lib/hooks/use-wardrobe-items';
import { useGenerateWardrobeItemImage } from '@/lib/hooks/use-wardrobe-item-image-generation';
import { useWardrobeRealtime } from '@/lib/hooks/use-realtime-wardrobe';
import { ItemsList } from '@/components/items-list';
import { WardrobeSearchFiltersWithErrorBoundary as WardrobeSearchFilters } from '@/components/dynamic/wardrobe-search-filters-dynamic';
import { Button } from '@/components/ui/button';
import { CircleDashed, Grid, List, Loader2, Shirt } from 'lucide-react';


import { WardrobeItem } from '@/lib/types/database';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function WardrobePageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'default' | 'name-asc' | 'name-desc'>('default');
  const activeAutogenId = useRef<string | null>(null);
  const staleKickoffRunning = useRef(false);
  const staleKickoffAttempted = useRef<Set<string>>(new Set());

  // Fetch data using hooks
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useCategories();
  const { data: items = [], isLoading: itemsLoading, error: itemsError } = useWardrobeItems();
  const { generateAsync } = useGenerateWardrobeItemImage();

  // Enable real-time updates for background removal status and image_url changes
  useWardrobeRealtime();

  const updateQueryParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParamsKey);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParamsKey]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    const q = params.get('q') ?? '';
    const tagsParam = params.get('tags') ?? '';
    const categoriesParam = params.get('categories') ?? '';
    const viewParam = params.get('view');
    const sortParam = params.get('sort');

    const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : [];
    const categoryIds = categoriesParam ? categoriesParam.split(',').filter(Boolean) : [];

    setSearchTerm(prev => (prev === q ? prev : q));
    setSelectedTags(new Set(tags));
    setSelectedCategories(new Set(categoryIds));
    setViewMode(viewParam === 'list' ? 'list' : 'grid');
    setSortBy(sortParam === 'name-asc' || sortParam === 'name-desc' ? sortParam : 'default');
  }, [searchParamsKey]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    const autogenId = params.get('autogen');
    if (!autogenId) return;
    if (activeAutogenId.current === autogenId) return;

    activeAutogenId.current = autogenId;
    void generateAsync({ wardrobe_item_id: autogenId })
      .catch(() => {
        // Keep UX stable; item card state will reflect failures via realtime/query refresh.
      })
      .finally(() => {
        updateQueryParams({ autogen: null });
        activeAutogenId.current = null;
      });
  }, [searchParamsKey, generateAsync, updateQueryParams]);

  useEffect(() => {
    if (staleKickoffRunning.current || items.length === 0) return;

    const now = Date.now();
    const STALE_PENDING_MS = 60_000;
    const MAX_KICKOFFS_PER_PASS = 2;

    const stalePendingItems = items
      .filter((item) => {
        if (staleKickoffAttempted.current.has(item.id)) return false;
        if (item.image_url) return false;
        if (item.bg_removal_status !== 'pending') return false;
        if (item.bg_removal_started_at) return false;
        if (!item.color) return false;
        const createdAtTs = new Date(item.created_at).getTime();
        if (!Number.isFinite(createdAtTs)) return false;
        return now - createdAtTs >= STALE_PENDING_MS;
      })
      .slice(0, MAX_KICKOFFS_PER_PASS);

    if (stalePendingItems.length === 0) return;

    staleKickoffRunning.current = true;
    void (async () => {
      for (const item of stalePendingItems) {
        staleKickoffAttempted.current.add(item.id);
        try {
          await generateAsync({ wardrobe_item_id: item.id });
        } catch {
          // Leave status/UI handling to generation action + realtime/query updates.
        }
      }
    })().finally(() => {
      staleKickoffRunning.current = false;
    });
  }, [items, generateAsync]);

  // Debounce URL sync for search to keep typing responsive.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(searchParamsKey);
      const currentQuery = params.get('q') ?? '';
      if (currentQuery !== searchTerm) {
        updateQueryParams({ q: searchTerm || null });
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm, searchParamsKey, updateQueryParams]);

  // Filter items by search term, tags, and categories
  const filteredItems = useMemo(() => {
    let filtered = [...items];

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

    if (sortBy === 'name-asc') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name-desc') {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    }

    return filtered;
  }, [items, searchTerm, selectedTags, selectedCategories, sortBy]);

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
    setSearchTerm(value);
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
        const serialized = Array.from(newTags).sort().join(',');
        updateQueryParams({ tags: serialized || null });
        return newTags;
      });
    });
  }, [updateQueryParams]);

  const handleCategoryToggle = useCallback((categoryId: string) => {
    startTransition(() => {
      setSelectedCategories(prev => {
        const newCategories = new Set(prev);
        if (newCategories.has(categoryId)) {
          newCategories.delete(categoryId);
        } else {
          newCategories.add(categoryId);
        }
        const serialized = Array.from(newCategories).sort().join(',');
        updateQueryParams({ categories: serialized || null });
        return newCategories;
      });
    });
  }, [updateQueryParams]);

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedTags(new Set());
    setSelectedCategories(new Set());
    setSortBy('default');
    updateQueryParams({ q: null, tags: null, categories: null, sort: null });
  }, [updateQueryParams]);

  const handleSortChange = useCallback((value: 'default' | 'name-asc' | 'name-desc') => {
    setSortBy(value);
    updateQueryParams({ sort: value === 'default' ? null : value });
  }, [updateQueryParams]);

  const renderImageSection = useCallback((item: WardrobeItem, alt: string, sizes: string) => {
    if (item.image_url) {
      return (
        <div className="relative w-full h-48 bg-card">
          <Image
            src={item.image_url}
            alt={alt}
            fill
            className="object-contain p-4"
            loading="lazy"
            sizes={sizes}
            quality={85}
          />
        </div>
      );
    }

    const status = item.bg_removal_status;
    const isPending = !status || status === 'pending';
    const isProcessing = status === 'processing';

    return (
      <div className="relative w-full h-48 bg-muted/30 border-b border-border flex items-center justify-center">
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs font-medium">Generating image...</span>
          </div>
        ) : isPending ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <CircleDashed className="h-5 w-5" />
            <span className="text-xs font-medium">Pending image generation</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Shirt className="h-5 w-5" />
            <span className="text-xs font-medium">No image</span>
          </div>
        )}
      </div>
    );
  }, []);

  if (categoriesError || itemsError) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-600 mb-2">Error Loading Wardrobe</h3>
            <p className="text-muted-foreground mb-4">
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading wardrobe...</p>
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
          onClearAll={clearAllFilters}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          itemCount={filteredItems.length}
          totalCount={items.length}
        />

        {/* View Mode Toggle */}
        <div className="flex justify-end">
          <div className="flex border border-border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setViewMode('grid');
                updateQueryParams({ view: null });
              }}
              className="rounded-r-none"
            >
              <Grid size={16} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setViewMode('list');
                updateQueryParams({ view: 'list' });
              }}
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
                      <h2 className="text-xl font-semibold text-foreground">
                        {category.name}
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {/* Grid without search/filters since they're now at the top */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                      {categoryItems.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleItemSelect(item)}
                          className="border border-border rounded-lg bg-card shadow-sm overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-md active:scale-95"
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
                          {renderImageSection(
                            item,
                            `${item.brand ? `${item.brand} ${item.name}` : item.name} - ${category.name}`,
                            "(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                          )}
                          
                          {/* Item info */}
                          <div className="p-3 border-t border-border">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{category.name}</p>
                            <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
                              {item.brand ? `${item.brand} ${item.name}` : item.name}
                            </p>
                            
                            {item.capsule_tags && item.capsule_tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.capsule_tags.slice(0, 3).map(tag => (
                                  <span
                                    key={tag}
                                    className="px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground truncate"
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
                      className="border border-border rounded-lg bg-card shadow-sm overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-md active:scale-95"
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
                      {renderImageSection(
                        item,
                        item.name,
                        "(max-width: 640px) 100vw, 50vw"
                      )}
                      
                      {/* Item info */}
                      <div className="p-3 border-t border-border">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{category?.name || 'Item'}</p>
                        <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
                          {item.brand ? `${item.brand} ${item.name}` : item.name}
                        </p>
                        
                        {item.capsule_tags && item.capsule_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.capsule_tags.slice(0, 3).map((tag: string) => (
                              <span
                                key={tag}
                                className="px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground"
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
                          <h2 className="text-xl font-semibold text-foreground">
                            {category.name}
                          </h2>
                          <span className="text-sm text-muted-foreground">
                            {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                          {categoryItems.map(item => (
                            <div
                              key={item.id}
                              onClick={() => handleItemSelect(item)}
                              className="border border-border rounded-lg bg-card shadow-sm overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-md active:scale-95"
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
                              {renderImageSection(
                                item,
                                item.name,
                                "(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                              )}
                              
                              {/* Item info */}
                              <div className="p-3 border-t border-border">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{category.name}</p>
                                <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
                                  {item.brand ? `${item.brand} ${item.name}` : item.name}
                                </p>
                                
                                {item.capsule_tags && item.capsule_tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.capsule_tags.slice(0, 3).map(tag => (
                                      <span
                                        key={tag}
                                        className="px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground"
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
                      <h2 className="text-xl font-semibold text-foreground">
                        {category.name}
                      </h2>
                      <span className="text-sm text-muted-foreground">
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
                        <h2 className="text-xl font-semibold text-foreground">
                          {category.name}
                        </h2>
                        <span className="text-sm text-muted-foreground">
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
            <h3 className="text-lg font-medium text-foreground mb-2">
              No categories found
            </h3>
            <p className="text-muted-foreground mb-4">
              Categories will be automatically created when you add your first items.
            </p>
          </div>
        )}

        {filteredItems.length === 0 && categories.length > 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">
              No items found
            </h3>
            <p className="text-muted-foreground mb-4">
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
