import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { WardrobeSearchFilters } from '../wardrobe-search-filters';
import { CategoryDropdown } from '../category-dropdown';
import type { WardrobeItem } from '@/lib/schemas';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Generator for valid UUIDs
const uuidArb = fc.string({ minLength: 36, maxLength: 36 }).map(() => 
  '550e8400-e29b-41d4-a716-' + Math.random().toString(16).substring(2, 14)
);

// Generator for valid wardrobe items
const wardrobeItemArb = fc.record({
  id: uuidArb,
  user_id: uuidArb,
  category_id: uuidArb,
  name: fc.string({ minLength: 1, maxLength: 50 }),
  brand: fc.option(fc.string({ maxLength: 30 })),
  color: fc.option(fc.string({ maxLength: 20 })),
  formality_score: fc.option(fc.integer({ min: 1, max: 10 })),
  capsule_tags: fc.option(fc.array(fc.constantFrom('Refined', 'Adventurer', 'Crossover', 'Shorts'))),
  season: fc.option(fc.array(fc.constantFrom('Spring', 'Summer', 'Fall', 'Winter', 'All'))),
  image_url: fc.option(fc.string()),
  active: fc.boolean(),
  created_at: fc.constant('2024-01-01T00:00:00Z'),
  updated_at: fc.constant('2024-01-01T00:00:00Z')
}) as fc.Arbitrary<WardrobeItem>;

// Generator for categories
const categoryArb = fc.record({
  id: uuidArb,
  name: fc.constantFrom('Jacket', 'Overshirt', 'Shirt', 'Pants', 'Shoes', 'Belt', 'Watch')
});

describe('Category Filtering Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Property 4: Category Filtering Consistency - WardrobeSearchFilters', () => {
    // Feature: category-split-jacket-overshirt, Property 4: Category Filtering Consistency
    fc.assert(
      fc.property(
        fc.array(categoryArb, { minLength: 1, maxLength: 10 }),
        fc.string({ maxLength: 20 }),
        fc.set(fc.string({ maxLength: 10 })),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (categories, searchTerm, selectedTags, itemCount, totalCount) => {
          const mockProps = {
            searchTerm,
            selectedTags,
            selectedCategories: new Set<string>(),
            categories,
            onSearchChange: vi.fn(),
            onTagToggle: vi.fn(),
            onCategoryToggle: vi.fn(),
            itemCount,
            totalCount,
          };

          const { unmount } = render(<WardrobeSearchFilters {...mockProps} />);

          // Property: Component should render without errors
          expect(screen.getByText('My Wardrobe')).toBeInTheDocument();
          
          // Property: Should show correct item counts
          expect(screen.getByText(`${itemCount} item${itemCount !== 1 ? 's' : ''} found`)).toBeInTheDocument();
          
          // Property: Should have filters button
          const filtersButton = screen.getByText('Filters');
          expect(filtersButton).toBeInTheDocument();
          
          // Property: No old "Jacket/Overshirt" category should exist anywhere
          const oldCategoryOption = screen.queryByText('Jacket/Overshirt');
          expect(oldCategoryOption).toBeFalsy();

          unmount();
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 4: Category Filtering Consistency - CategoryDropdown', () => {
    // Feature: category-split-jacket-overshirt, Property 4: Category Filtering Consistency
    fc.assert(
      fc.property(
        fc.constantFrom('Jacket', 'Overshirt'),
        fc.array(wardrobeItemArb, { minLength: 0, maxLength: 10 }),
        (categoryName, availableItems) => {
          const mockOnSelect = vi.fn();

          const { unmount } = render(
            <CategoryDropdown
              category={categoryName}
              selectedItem={null}
              availableItems={availableItems}
              onSelect={mockOnSelect}
            />
          );

          // Property: Category dropdown should display the correct category name
          const categoryButton = screen.getByRole('button', { name: `Select ${categoryName}` });
          expect(categoryButton).toBeTruthy();

          // Property: Dropdown should show correct placeholder text
          const placeholderText = screen.getByText(`Select ${categoryName}`);
          expect(placeholderText).toBeTruthy();

          // Property: When opened, dropdown should show available items or "No items available"
          fireEvent.click(categoryButton);
          
          if (availableItems.length === 0) {
            const noItemsText = screen.queryByText('No items available');
            expect(noItemsText).toBeTruthy();
          } else {
            // Should show clear selection option
            const clearOption = screen.queryByText('Clear selection');
            expect(clearOption).toBeTruthy();
          }

          unmount();
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 4: Category Selection Independence', () => {
    // Feature: category-split-jacket-overshirt, Property 4: Category Filtering Consistency
    fc.assert(
      fc.property(
        fc.array(wardrobeItemArb, { minLength: 1, maxLength: 5 }),
        fc.array(wardrobeItemArb, { minLength: 1, maxLength: 5 }),
        (jacketItems, overshirtItems) => {
          const mockOnSelect = vi.fn();

          // Test Jacket dropdown
          const { unmount: unmountJacket } = render(
            <CategoryDropdown
              category="Jacket"
              selectedItem={null}
              availableItems={jacketItems}
              onSelect={mockOnSelect}
            />
          );

          const jacketButton = screen.getByRole('button', { name: 'Select Jacket' });
          fireEvent.click(jacketButton);

          // Should show jacket items
          const clearOption = screen.getByText('Clear selection');
          expect(clearOption).toBeTruthy();

          unmountJacket();

          // Test Overshirt dropdown independently
          const { unmount: unmountOvershirt } = render(
            <CategoryDropdown
              category="Overshirt"
              selectedItem={null}
              availableItems={overshirtItems}
              onSelect={mockOnSelect}
            />
          );

          const overshirtButton = screen.getByRole('button', { name: 'Select Overshirt' });
          fireEvent.click(overshirtButton);

          // Should show overshirt items
          const clearOptionOvershirt = screen.getByText('Clear selection');
          expect(clearOptionOvershirt).toBeTruthy();

          unmountOvershirt();
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 4: Category Filter State Consistency', () => {
    // Feature: category-split-jacket-overshirt, Property 4: Category Filtering Consistency
    fc.assert(
      fc.property(
        fc.array(categoryArb, { minLength: 2, maxLength: 7 }),
        fc.oneof(fc.constant('all'), fc.string()),
        (categories, selectedCategory) => {
          const mockProps = {
            searchTerm: '',
            selectedTags: new Set<string>(),
            selectedCategories: new Set<string>(),
            categories,
            onSearchChange: vi.fn(),
            onTagToggle: vi.fn(),
            onCategoryToggle: vi.fn(),
            itemCount: 10,
            totalCount: 15,
          };

          const { unmount } = render(<WardrobeSearchFilters {...mockProps} />);

          // Property: Component should render without errors
          expect(screen.getByText('My Wardrobe')).toBeInTheDocument();
          
          // Property: Should have filters functionality
          const filtersButton = screen.getByText('Filters');
          expect(filtersButton).toBeInTheDocument();
          
          // Property: Should show correct counts
          expect(screen.getByText('10 items found')).toBeInTheDocument();
          
          // Property: Should not show old combined category anywhere
          const oldCategory = screen.queryByText('Jacket/Overshirt');
          expect(oldCategory).toBeFalsy();

          unmount();
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});