'use client';

import React, { useState, useCallback, startTransition, useDeferredValue } from 'react';
import { Search, Tag, Plus, Filter } from 'lucide-react';




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
  itemCount,
  totalCount,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  
  // Use deferred values for expensive filtering operations
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredSelectedTags = useDeferredValue(selectedTags);

  // Check if filtering is in progress (deferred values are behind)
  const isFiltering = searchTerm !== deferredSearchTerm || selectedTags !== deferredSelectedTags;

  // Optimized search handler with startTransition
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => {
      onSearchChange(value);
    });
  }, [onSearchChange]);

  // Optimized tag toggle with startTransition
  const toggleTag = useCallback((tag: CapsuleTagType) => {
    startTransition(() => {
      onTagToggle(tag);
    });
  }, [onTagToggle]);

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
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
            aria-label={showFilters ? 'Hide filters' : 'Show filters'}
            aria-expanded={showFilters}
          >
            <Filter size={16} />
            Filters
          </Button>
          
          <Link href="/wardrobe/items">
            <Button className="flex items-center gap-2">
              <Plus size={16} />
              Add Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      {showFilters && (
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative w-full">
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
            className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent min-h-[44px] bg-card text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground transition-colors"
            aria-label="Search items across all categories"
          />
          {searchTerm && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="inline-flex items-center gap-1 text-xs text-primary">
                <div className="w-2 h-2 bg-primary  rounded-full animate-pulse"></div>
                Filtering…
              </div>
            </div>
          )}
        </div>

        {/* Category filters */}
        <div className="flex-1">
          <label htmlFor="category-all" className="block text-sm font-medium text-muted-foreground mb-2">
            Categories
          </label>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                id="category-all"
                type="checkbox"
                checked={selectedCategories.size === 0}
                onChange={() => {
                  // Clear all selections to show all categories
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

        {/* Filter tags */}
        <div className="flex flex-wrap items-center gap-2">
          <Tag size={16} className="text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground mr-2">Tags:</span>
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
                  : 'bg-card text-muted-foreground border border-border hover:bg-muted hover:shadow-sm'
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
