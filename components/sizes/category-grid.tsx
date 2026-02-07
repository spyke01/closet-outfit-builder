'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Plus from 'lucide-react/dist/esm/icons/plus';
import type { SizeCategory, StandardSize, BrandSize } from '@/lib/types/sizes';

export interface CategoryGridProps {
  categories: SizeCategory[];
  standardSizes?: StandardSize[];
  brandSizes?: BrandSize[];
  onAddCategory?: () => void;
}

/**
 * CategoryGrid Component
 * 
 * Displays a responsive grid of category tiles with size information.
 * 
 * Features:
 * - Responsive grid: 2 columns (mobile), 3 columns (tablet), 4 columns (desktop)
 * - Shows category name, size count, and "varies by brand" indicator
 * - Uses Map for O(1) category lookups
 * - Content-visibility optimization for large grids (50+ categories)
 * - "Add category" tile as final tile
 * - Empty state when no categories exist
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 1.3, 12.1
 */
export function CategoryGrid({
  categories,
  standardSizes = [],
  brandSizes = [],
  onAddCategory,
}: CategoryGridProps) {
  // Calculate size counts and variations for each category
  const categoryData = useMemo(() => {
    const standardSizesByCategory = new Map<string, StandardSize>();
    const brandSizesByCategory = new Map<string, BrandSize[]>();

    // Group standard sizes by category
    standardSizes.forEach((size) => {
      standardSizesByCategory.set(size.category_id, size);
    });

    // Group brand sizes by category
    brandSizes.forEach((size) => {
      const existing = brandSizesByCategory.get(size.category_id) || [];
      brandSizesByCategory.set(size.category_id, [...existing, size]);
    });

    // Calculate metadata for each category
    return categories.map((category) => {
      const standardSize = standardSizesByCategory.get(category.id);
      const categoryBrandSizes = brandSizesByCategory.get(category.id) || [];

      // Count total sizes (standard + brand sizes)
      const sizeCount = (standardSize ? 1 : 0) + categoryBrandSizes.length;

      // Check if brand sizes vary from standard size
      const hasVariations =
        standardSize &&
        categoryBrandSizes.some(
          (brandSize) => brandSize.size !== standardSize.primary_size
        );

      return {
        category,
        sizeCount,
        hasVariations: Boolean(hasVariations),
      };
    });
  }, [categories, standardSizes, brandSizes]);

  // Empty state when no categories exist
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
          <Plus className="h-12 w-12 text-gray-400" aria-hidden="true" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          No categories yet
        </h3>
        <p className="mb-6 max-w-sm text-sm text-gray-600 dark:text-gray-400">
          Get started by adding your first clothing category to track your sizes
        </p>
        <button
          onClick={onAddCategory}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
          aria-label="Add new clothing category"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Add Category
        </button>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
      role="list"
      aria-label="Clothing categories"
    >
      {categoryData.map(({ category, sizeCount, hasVariations }) => (
        <Link
          key={category.id}
          href={`/sizes/${category.id}`}
          className="group relative flex min-h-[120px] flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-blue-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-400"
          style={{
            contentVisibility: categories.length > 50 ? 'auto' : undefined,
            containIntrinsicSize: categories.length > 50 ? '0 120px' : undefined,
          }}
          role="listitem"
          aria-label={`View ${category.name} details`}
        >
          {/* Category icon (if available) */}
          {category.icon && (
            <div className="mb-2 text-2xl" aria-hidden="true">
              {category.icon}
            </div>
          )}

          {/* Category name */}
          <h3 className="mb-2 text-base font-semibold text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
            {category.name}
          </h3>

          {/* Size count and variations indicator */}
          <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
            <span>
              {sizeCount === 0 && 'No sizes saved'}
              {sizeCount === 1 && '1 size'}
              {sizeCount > 1 && `${sizeCount} sizes`}
            </span>
            {hasVariations && (
              <span className="text-xs text-blue-600 dark:text-blue-400">
                Varies by brand
              </span>
            )}
          </div>
        </Link>
      ))}

      {/* Add category tile */}
      <button
        onClick={onAddCategory}
        className="group relative flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 transition-all hover:border-blue-500 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:border-blue-400 dark:hover:bg-blue-900/20"
        style={{
          contentVisibility: categories.length > 50 ? 'auto' : undefined,
          containIntrinsicSize: categories.length > 50 ? '0 120px' : undefined,
        }}
        aria-label="Add new clothing category"
      >
        <Plus
          className="h-8 w-8 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400">
          Add Category
        </span>
      </button>
    </div>
  );
}
