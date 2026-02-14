import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock Next.js dynamic import
vi.mock('next/dynamic', () => ({
  default: (importFn: () => Promise<unknown>, options?: unknown) => {
    const DynamicComponent = React.lazy(importFn);
    
    if (options?.loading) {
      const DynamicLoadingWrapper = (props: unknown) => (
        <React.Suspense fallback={options.loading()}>
          <DynamicComponent {...props} />
        </React.Suspense>
      );
      DynamicLoadingWrapper.displayName = 'DynamicLoadingWrapper';
      return DynamicLoadingWrapper;
    }
    
    return DynamicComponent;
  }
}));

describe('Dynamic Component Imports', () => {
  it('should load OutfitDisplayDynamic with loading state', async () => {
    const { OutfitDisplayDynamic } = await import('../outfit-display-dynamic');
    
    render(
      <OutfitDisplayDynamic
        selection={{}}
        onRandomize={() => {}}
      />
    );

    // Should show loading state initially
    expect(screen.getByText('Loading Outfit Display...')).toBeInTheDocument();
  });

  it('should load ImageUploadDynamic with loading state', async () => {
    const { ImageUploadDynamic } = await import('../image-upload-dynamic');
    
    render(
      <ImageUploadDynamic
        onUpload={() => {}}
      />
    );

    // Should show loading state initially
    expect(screen.getByText('Loading Image Upload...')).toBeInTheDocument();
  });

  it('should load ItemsGridDynamic with loading state', async () => {
    const { ItemsGridDynamic } = await import('../items-grid-dynamic');
    
    render(
      <ItemsGridDynamic
        category="test"
        items={[]}
        onItemSelect={() => {}}
      />
    );

    // Should show loading skeleton initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should load WardrobeSearchFiltersDynamic with loading state', async () => {
    const { WardrobeSearchFiltersDynamic } = await import('../wardrobe-search-filters-dynamic');
    
    render(
      <WardrobeSearchFiltersDynamic
        searchTerm=""
        selectedTags={new Set()}
        selectedCategories={new Set()}
        categories={[]}
        onSearchChange={() => {}}
        onTagToggle={() => {}}
        onCategoryToggle={() => {}}
        onClearAll={() => {}}
        itemCount={0}
        totalCount={0}
      />
    );

    // Should show loading state initially
    expect(screen.getByText('Loading search filters...')).toBeInTheDocument();
  });

  it('should handle error boundaries correctly', async () => {
    const { OutfitDisplayWithErrorBoundary } = await import('../outfit-display-dynamic');
    
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <OutfitDisplayWithErrorBoundary
        selection={{}}
        onRandomize={() => {}}
        onError={(error) => {
          throw error; // Simulate error in component
        }}
      />
    );

    // Should render without crashing
    expect(screen.getByText('Loading Outfit Display...')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('should export all dynamic components from index', async () => {
    const dynamicExports = await import('../index');
    
    expect(dynamicExports.OutfitDisplayDynamic).toBeDefined();
    expect(dynamicExports.OutfitDisplayWithErrorBoundary).toBeDefined();
    expect(dynamicExports.ImageUploadDynamic).toBeDefined();
    expect(dynamicExports.ImageUploadWithErrorBoundary).toBeDefined();
    expect(dynamicExports.ItemsGridDynamic).toBeDefined();
    expect(dynamicExports.ItemsGridWithErrorBoundary).toBeDefined();
    expect(dynamicExports.WardrobeSearchFiltersDynamic).toBeDefined();
    expect(dynamicExports.WardrobeSearchFiltersWithErrorBoundary).toBeDefined();
  });
});
