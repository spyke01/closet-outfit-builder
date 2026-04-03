'use client';

import React, { useState, useCallback, startTransition, useDeferredValue } from 'react';
import { Search, Plus, Filter } from 'lucide-react';




import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Capsule tags enum
const capsuleTags = ['Refined', 'Adventurer', 'Crossover', 'Shorts'] as const;
type CapsuleTagType = typeof capsuleTags[number];

interface WardrobeSearchFiltersProps {
  searchTerm: string;
  selectedTags: Set<string>;
  selectedCategories: Set<string>;
  categories: Array<{ id: string; name: string }>;
  onSearchChange: (value: string) => void;
  onTagToggle: (tag: string) => void;
  onCategoryToggle: (categoryId: string) => void;
  onClearAll: () => void;
  sortBy?: 'default' | 'name-asc' | 'name-desc';
  onSortChange?: (value: 'default' | 'name-asc' | 'name-desc') => void;
  itemCount: number;
  totalCount: number;
}

export const WardrobeSearchFilters: React.FC<WardrobeSearchFiltersProps> = ({
  searchTerm,
  selectedTags,
  selectedCategories,
  categories,
  onSearchChange,
  onTagToggle,
  onCategoryToggle,
  onClearAll,
  sortBy = 'default',
  onSortChange,
  itemCount,
  totalCount,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const getFilterTagStyle = (selected: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '7px 14px',
    borderRadius: 'var(--radius-pill)',
    border: selected ? '1px solid var(--accent)' : '1px solid var(--border-default)',
    background: selected ? 'var(--accent-muted)' : 'var(--bg-surface)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    fontSize: '0.76rem',
    fontWeight: 500,
    color: selected ? 'var(--accent)' : 'var(--text-2)',
    cursor: 'pointer',
    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
  });
  
  // Use deferred values for expensive filtering operations
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredSelectedTags = useDeferredValue(selectedTags);

  // Check if filtering is in progress (deferred values are behind)
  const isFiltering = searchTerm !== deferredSearchTerm || selectedTags !== deferredSelectedTags;

  // Optimized search handler with startTransition
  const handleSearchChange = useCallback((value: string) => {
    // Search input should update immediately for responsive typing.
    onSearchChange(value);
  }, [onSearchChange]);

  // Optimized tag toggle with startTransition
  const toggleTag = useCallback((tag: CapsuleTagType) => {
    startTransition(() => {
      onTagToggle(tag);
    });
  }, [onTagToggle]);

  return (
    <div className="app-section section-delay-1 space-y-5">
      {/* Header with Add Item button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-4xl font-normal tracking-[-0.03em] text-foreground">My Wardrobe</h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} item{totalCount !== 1 ? 's' : ''} across {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2 px-4 py-[9px] text-[0.79rem]"
            aria-label={showAdvancedFilters ? 'Hide advanced filters' : 'Show advanced filters'}
            aria-expanded={showAdvancedFilters}
          >
            <Filter size={16} />
            More Filters
          </Button>
          
          <Button asChild className="flex items-center gap-2 px-4 py-[9px] text-[0.82rem]">
            <Link href="/wardrobe/items" data-walkthrough-id="wardrobe-add-button">
              <Plus size={16} />
              Add Item
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and quick filters */}
      <div className="space-y-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 max-[980px]:grid-cols-1">
          <div className="relative flex-1">
            <label htmlFor="wardrobe-search" className="sr-only">Search items</label>
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[var(--text-3)]"
            />
            <input
              id="wardrobe-search"
              type="search"
              name="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search items across all categories..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] py-[11px] pl-10 pr-20 text-foreground backdrop-blur-[var(--blur-glass)] [-webkit-backdrop-filter:blur(var(--blur-glass))] placeholder:text-[var(--text-3)] [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
              aria-label="Search items across all categories"
            />
            {searchTerm && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <div className="inline-flex items-center gap-1 text-xs text-primary">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  Filtering…
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {capsuleTags.map(tag => (
              <button
                type="button"
                key={tag}
                onClick={() => toggleTag(tag)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleTag(tag);
                  }
                }}
                className={`filter-tag flex-shrink-0 focus-visible:outline-none ${selectedTags.has(tag) ? 'active' : ''} ${isFiltering ? 'opacity-75' : 'opacity-100'}`}
                style={getFilterTagStyle(selectedTags.has(tag))}
                disabled={isFiltering}
                aria-label={`Filter by ${tag}`}
                aria-pressed={selectedTags.has(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced filters */}
      {showAdvancedFilters && (
      <section className="space-y-4 border-t border-[var(--border-subtle)] pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="wardrobe-sort" className="text-sm font-medium text-muted-foreground">
            Sort by
          </label>
          <select
            id="wardrobe-sort"
            value={sortBy}
            onChange={(e) => onSortChange?.(e.target.value as 'default' | 'name-asc' | 'name-desc')}
            className="min-h-10 min-w-[180px] rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] pl-3 pr-10 text-foreground"
            aria-label="Sort wardrobe items"
          >
            <option value="default">Default</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
          </select>
          <Button variant="outline" size="default" className="h-10 px-4" onClick={onClearAll}>
            Clear Filters
          </Button>
        </div>

        <div className="flex-1">
          <label htmlFor="category-all" className="block text-sm font-medium text-muted-foreground mb-2">
            Categories
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <div className="flex items-center">
              <input
                id="category-all"
                type="checkbox"
                checked={selectedCategories.size === 0}
                onChange={() => {
                  categories.forEach(category => {
                    if (selectedCategories.has(category.id)) {
                      onCategoryToggle(category.id);
                    }
                  });
                }}
                className="h-4 w-4 text-muted-foreground focus:ring-ring border-border rounded"
              />
              <label htmlFor="category-all" className="ml-2 text-sm text-muted-foreground">
                All Categories
              </label>
            </div>
            {categories.map(category => (
              <div key={category.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`category-${category.id}`}
                  checked={selectedCategories.has(category.id)}
                  onChange={() => onCategoryToggle(category.id)}
                  className="h-4 w-4 text-muted-foreground focus:ring-ring border-border rounded"
                />
                <label htmlFor={`category-${category.id}`} className="ml-2 text-sm text-muted-foreground">
                  {category.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {itemCount} item{itemCount !== 1 ? 's' : ''} found
        {(searchTerm || selectedTags.size > 0 || selectedCategories.size > 0) && (
          <span className="ml-2 text-xs">
            ({totalCount} total)
          </span>
        )}
      </div>
    </div>
  );
};
