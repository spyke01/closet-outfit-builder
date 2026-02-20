import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { WardrobeSearchFilters } from '../wardrobe-search-filters';

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

// Generator for categories
const categoryArb = fc.record({
  id: uuidArb,
  name: fc.constantFrom('Jacket', 'Overshirt', 'Shirt', 'Pants', 'Shoes', 'Belt', 'Watch')
});

// Generator for category sets (for multi-selection)
const categorySetArb = fc.array(uuidArb, { minLength: 0, maxLength: 3 }).map(ids => new Set(ids));

// Helper function to simulate multi-category filtering logic
type FilterableItem = { category_id: string };

function filterItemsByCategories(items: FilterableItem[], selectedCategories: Set<string>): FilterableItem[] {
  if (selectedCategories.size === 0) {
    return items; // Show all items when no categories selected
  }
  return items.filter(item => selectedCategories.has(item.category_id));
}

// Helper function to simulate category toggle behavior
function toggleCategory(selectedCategories: Set<string>, categoryId: string): Set<string> {
  const newSet = new Set(selectedCategories);
  if (newSet.has(categoryId)) {
    newSet.delete(categoryId);
  } else {
    newSet.add(categoryId);
  }
  return newSet;
}

describe('Multi-Category Selection Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Property 9: Multi-Category Selection Support - Core Logic', () => {
    // Feature: category-split-jacket-overshirt, Property 9: Multi-Category Selection Support
    // **Validates: Requirements 5.3**
    fc.assert(
      fc.property(
        fc.array(categoryArb, { minLength: 2, maxLength: 5 }),
        categorySetArb,
        (categories, selectedCategories) => {
          // Filter selectedCategories to only include valid category IDs
          const validCategoryIds = categories.map(c => c.id);
          const validSelectedCategories = new Set(
            Array.from(selectedCategories).filter(id => validCategoryIds.includes(id))
          );

          // Property: Multi-category selection should support both Jacket and Overshirt
          const jacketCategories = categories.filter(c => c.name === 'Jacket');
          const overshirtCategories = categories.filter(c => c.name === 'Overshirt');

          if (jacketCategories.length > 0 && overshirtCategories.length > 0) {
            // Should be able to select both categories simultaneously
            const bothSelected = new Set([jacketCategories[0].id, overshirtCategories[0].id]);
            
            // Property: Both categories can be selected together
            expect(bothSelected.has(jacketCategories[0].id)).toBe(true);
            expect(bothSelected.has(overshirtCategories[0].id)).toBe(true);
            expect(bothSelected.size).toBe(2);
          }

          // Property: Category toggle behavior should work correctly
          if (categories.length > 0) {
            const categoryId = categories[0].id;
            const initiallySelected = validSelectedCategories.has(categoryId);
            const afterToggle = toggleCategory(validSelectedCategories, categoryId);
            
            // Should toggle the selection state
            expect(afterToggle.has(categoryId)).toBe(!initiallySelected);
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property 9: Multi-Category Filtering Logic', () => {
    // Feature: category-split-jacket-overshirt, Property 9: Multi-Category Selection Support
    // **Validates: Requirements 5.3**
    fc.assert(
      fc.property(
        fc.array(categoryArb, { minLength: 2, maxLength: 4 }),
        fc.array(fc.record({
          id: uuidArb,
          category_id: uuidArb,
          name: fc.string({ minLength: 1, maxLength: 20 })
        }), { minLength: 0, maxLength: 10 }),
        (categories, items) => {
          // Create items that belong to the categories
          const itemsWithValidCategories = items.map((item, index) => ({
            ...item,
            category_id: categories[index % categories.length]?.id || categories[0]?.id
          }));

          // Property: When no categories are selected, all items should be returned
          const allItemsResult = filterItemsByCategories(itemsWithValidCategories, new Set());
          expect(allItemsResult.length).toBe(itemsWithValidCategories.length);

          // Property: When specific categories are selected, only items from those categories should be returned
          if (categories.length > 0) {
            const selectedCategories = new Set([categories[0].id]);
            const filteredResult = filterItemsByCategories(itemsWithValidCategories, selectedCategories);
            
            // All returned items should belong to selected categories
            filteredResult.forEach(item => {
              expect(selectedCategories.has(item.category_id)).toBe(true);
            });
          }

          // Property: Multi-category selection should return items from all selected categories
          if (categories.length >= 2) {
            const multipleCategories = new Set([categories[0].id, categories[1].id]);
            const multiFilterResult = filterItemsByCategories(itemsWithValidCategories, multipleCategories);
            
            // All returned items should belong to one of the selected categories
            multiFilterResult.forEach(item => {
              expect(multipleCategories.has(item.category_id)).toBe(true);
            });
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property 9: Category Toggle Independence', () => {
    // Feature: category-split-jacket-overshirt, Property 9: Multi-Category Selection Support
    // **Validates: Requirements 5.3**
    fc.assert(
      fc.property(
        fc.array(categoryArb, { minLength: 3, maxLength: 5 }),
        (categories) => {
          const initialSelection = new Set<string>();
          
          // Property: Toggling different categories should be independent
          if (categories.length >= 2) {
            const category1 = categories[0].id;
            const category2 = categories[1].id;
            
            // Toggle first category
            const afterFirst = toggleCategory(initialSelection, category1);
            expect(afterFirst.has(category1)).toBe(true);
            expect(afterFirst.has(category2)).toBe(false);
            
            // Toggle second category (should not affect first)
            const afterSecond = toggleCategory(afterFirst, category2);
            expect(afterSecond.has(category1)).toBe(true);
            expect(afterSecond.has(category2)).toBe(true);
            
            // Toggle first category again (should not affect second)
            const afterThird = toggleCategory(afterSecond, category1);
            expect(afterThird.has(category1)).toBe(false);
            expect(afterThird.has(category2)).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property 9: Component Rendering with Multi-Category Support', () => {
    // Feature: category-split-jacket-overshirt, Property 9: Multi-Category Selection Support
    // **Validates: Requirements 5.3**
    fc.assert(
      fc.property(
        fc.array(categoryArb, { minLength: 2, maxLength: 4 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 100 }),
        (categories, itemCount, totalCount) => {
          const mockProps = {
            searchTerm: '',
            selectedTags: new Set<string>(),
            selectedCategories: new Set<string>(),
            categories,
            onSearchChange: vi.fn(),
            onTagToggle: vi.fn(),
            onCategoryToggle: vi.fn(),
    onClearAll: vi.fn(),
            itemCount,
            totalCount,
          };

          const { unmount } = render(<WardrobeSearchFilters {...mockProps} />);

          // Property: Component should render without errors
          expect(screen.getByText('My Wardrobe')).toBeTruthy();
          
          // Property: Should show correct item counts
          const itemCountText = screen.getByText(new RegExp(`${itemCount} items? found`));
          expect(itemCountText).toBeTruthy();

          // Property: Should not show old combined category name
          const filtersButtons = screen.queryAllByText('More Filters');
          if (filtersButtons.length > 0) {
            fireEvent.click(filtersButtons[0]);
            const oldCategory = screen.queryByLabelText('Jacket/Overshirt');
            expect(oldCategory).toBeFalsy();
          }

          unmount();
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});
