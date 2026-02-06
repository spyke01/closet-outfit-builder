'use client';

import React, { useState, useMemo } from 'react';
import { useWardrobeItems } from '@/lib/hooks/use-wardrobe-items';
import { useCategories } from '@/lib/hooks/use-categories';
import { ItemsGridWithErrorBoundary as ItemsGrid } from '@/components/dynamic/items-grid-dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Filter, 
  Search,
  AlertCircle,
  Shirt
} from 'lucide-react';
import { WardrobeItem } from '@/lib/types/database';
import { NavigationButtons } from '@/components/navigation-buttons';
import Link from 'next/link';

interface AnchorCategoryPageClientProps {
  categoryName: string;
}

export function AnchorCategoryPageClient({ categoryName }: AnchorCategoryPageClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'brand'>('newest');

  // Fetch data
  const { data: items = [], isLoading: itemsLoading, error: itemsError } = useWardrobeItems();
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useCategories();

  // Find the category
  const category = useMemo(() => {
    return categories.find(cat => 
      cat.name.toLowerCase() === categoryName.toLowerCase()
    );
  }, [categories, categoryName]);

  // Filter items by category
  const categoryItems = useMemo(() => {
    if (!category) return [];
    
    let filtered = items.filter(item => 
      item.category_id === category.id && item.active
    );

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.color?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'brand':
          return (a.brand || '').localeCompare(b.brand || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [items, category, searchTerm, sortBy]);

  const handleItemSelect = (item: WardrobeItem | null) => {
    if (!item) return; // Handle null case
    // Navigate to the filtered outfit building interface
    window.location.href = `/anchor/${encodeURIComponent(categoryName)}/${item.id}`;
  };

  if (itemsLoading || categoriesLoading) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading anchor items...</p>
          </div>
        </div>
      </div>
    );
  }

  if (itemsError || categoriesError) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load data: {itemsError?.message || categoriesError?.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Category &quot;{categoryName}&quot; not found.
          </AlertDescription>
        </Alert>
        <NavigationButtons 
          backTo={{ href: '/wardrobe', label: 'Back to Wardrobe' }}
          className="mt-4"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-6">
      <div className="flex flex-col gap-6">
        {/* Navigation */}
        <NavigationButtons 
          backTo={{ href: '/wardrobe', label: 'Back to Wardrobe' }}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Anchor: {categoryName}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Select an anchor item to build outfits around
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter size={16} />
              Filters
            </Button>
          </div>
        </div>

        {/* Description */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shirt className="h-5 w-5 text-slate-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Anchor-Based Outfit Building
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Choose a {categoryName.toLowerCase()} item as your anchor piece. We&apos;ll help you find 
                  compatible items from other categories to create complete outfits that work well together.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Search */}
        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Search Items
                  </label>
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name, brand, color..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'name' | 'brand')}
                    className="w-full px-3 py-2 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name">Name</option>
                    <option value="brand">Brand</option>
                  </select>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setSortBy('newest');
                    }}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {categoryItems.length} {categoryName.toLowerCase()} item{categoryItems.length !== 1 ? 's' : ''} available
            {searchTerm && (
              <span className="ml-2">
                (filtered from {items.filter(item => item.category_id === category.id && item.active).length} total)
              </span>
            )}
          </p>
        </div>

        {/* Items Grid */}
        {categoryItems.length === 0 ? (
          <div className="text-center py-12">
            {items.filter(item => item.category_id === category.id && item.active).length === 0 ? (
              <>
                <Shirt className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  No {categoryName.toLowerCase()} items yet
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Add some {categoryName.toLowerCase()} items to your wardrobe to use as anchor pieces.
                </p>
                <Link href="/wardrobe/items">
                  <Button>
                    Add {categoryName} Items
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  No items match your search
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Try adjusting your search terms or filters.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSearchTerm('')}
                >
                  Clear Search
                </Button>
              </>
            )}
          </div>
        ) : (
          <ItemsGrid
            category={categoryName}
            items={categoryItems}
            onItemSelect={handleItemSelect}
          />
        )}
      </div>
    </div>
  );
}