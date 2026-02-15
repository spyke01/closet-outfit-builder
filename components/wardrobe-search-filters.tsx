'use client';

import React, { useState, useCallback, startTransition, useDeferredValue } from 'react';
import { Search, Tag, Plus, Filter, X } from 'lucide-react';




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

  const hasActiveFilters = Boolean(
    searchTerm ||
    selectedTags.size > 0 ||
    selectedCategories.size > 0 ||
    sortBy !== 'default'
  );
  const selectedCategoryNames = categories
    .filter(category => selectedCategories.has(category.id))
    .map(category => category.name);

  return (
    <div className="space-y-4">
      {/* Header with Add Item button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Wardrobe</h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} item{totalCount !== 1 ? 's' : ''} across {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2"
            aria-label={showAdvancedFilters ? 'Hide advanced filters' : 'Show advanced filters'}
            aria-expanded={showAdvancedFilters}
          >
            <Filter size={16} />
            More Filters
          </Button>
          
          <Link href="/wardrobe/items">
            <Button className="flex items-center gap-2">
              <Plus size={16} />
              Add Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and quick filters */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="relative lg:col-span-2">
            <label htmlFor="wardrobe-search" className="sr-only">Search items</label>
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              id="wardrobe-search"
              type="search"
              name="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search items across all categories..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-20 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] bg-card text-foreground placeholder:text-muted-foreground transition-colors [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
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
            <Tag size={16} className="text-muted-foreground flex-shrink-0" />
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
                  selectedTags.has(tag)
                    ? 'bg-primary text-primary-foreground border border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border border-border hover:bg-secondary/70 hover:border-foreground/25 hover:shadow-sm'
                } ${isFiltering ? 'opacity-75' : 'opacity-100'}`}
                disabled={isFiltering}
                aria-label={`Filter by ${tag}`}
                aria-pressed={selectedTags.has(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Active:</span>
            {searchTerm && (
              <button
                onClick={() => handleSearchChange('')}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-foreground hover:bg-secondary/70 hover:border-foreground/25 transition-colors"
                aria-label="Clear search filter"
              >
                Search: {searchTerm}
                <X size={14} />
              </button>
            )}
            {selectedTags.size > 0 && Array.from(selectedTags).map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag as CapsuleTagType)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-foreground hover:bg-secondary/70 hover:border-foreground/25 transition-colors"
                aria-label={`Remove ${tag} tag filter`}
              >
                Tag: {tag}
                <X size={14} />
              </button>
            ))}
            {selectedCategoryNames.map(name => (
              <button
                key={name}
                onClick={() => {
                  const category = categories.find(c => c.name === name);
                  if (category) onCategoryToggle(category.id);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-foreground hover:bg-secondary/70 hover:border-foreground/25 transition-colors"
                aria-label={`Remove ${name} category filter`}
              >
                Category: {name}
                <X size={14} />
              </button>
            ))}
            {sortBy !== 'default' && (
              <button
                onClick={() => onSortChange?.('default')}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-foreground hover:bg-secondary/70 hover:border-foreground/25 transition-colors"
                aria-label="Reset sort order"
              >
                Sort: {sortBy === 'name-asc' ? 'Name A-Z' : 'Name Z-A'}
                <X size={14} />
              </button>
            )}
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvancedFilters && (
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="wardrobe-sort" className="text-sm font-medium text-muted-foreground">
            Sort by
          </label>
          <select
            id="wardrobe-sort"
            value={sortBy}
            onChange={(e) => onSortChange?.(e.target.value as 'default' | 'name-asc' | 'name-desc')}
            className="h-10 min-w-[180px] px-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
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
      </div>
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
