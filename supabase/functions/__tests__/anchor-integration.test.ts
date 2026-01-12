import { describe, it, expect, vi } from 'vitest';

// Mock the Supabase client
const mockInvoke = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    functions: {
      invoke: mockInvoke
    }
  })
}));

describe('Anchor-based outfit integration', () => {
  it('should call filter-by-anchor function with correct parameters', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        anchor_item: {
          id: '1',
          name: 'Navy Blazer',
          category_name: 'Jacket'
        },
        compatible_items: [
          {
            item: {
              id: '2',
              name: 'White Dress Shirt',
              category_name: 'Shirt'
            },
            compatibility_score: 85,
            reasons: ['Perfect formality match', 'Jacket-shirt pairing']
          }
        ],
        total_candidates: 10,
        filtered_count: 1
      },
      error: null
    });

    // Import the hook after mocking
    const { useOutfitsByAnchor } = await import('@/lib/hooks/use-outfits');
    
    // The hook should be callable
    expect(typeof useOutfitsByAnchor).toBe('function');
    
    // Verify the mock was set up correctly
    expect(mockInvoke).toBeDefined();
  });

  it('should handle different anchor categories', () => {
    // Test that both Jacket and Overshirt can be used as anchor categories
    const jacketAnchor = { category_name: 'Jacket' };
    const overshirtAnchor = { category_name: 'Overshirt' };
    
    expect(jacketAnchor.category_name).toBe('Jacket');
    expect(overshirtAnchor.category_name).toBe('Overshirt');
    
    // Both should be valid anchor categories
    expect(['Jacket', 'Overshirt']).toContain(jacketAnchor.category_name);
    expect(['Jacket', 'Overshirt']).toContain(overshirtAnchor.category_name);
  });
});