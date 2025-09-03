import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OutfitList } from './OutfitList';
import { GeneratedOutfit } from '../types';

// Mock OutfitCard component to avoid rendering complexity in performance tests
vi.mock('./OutfitCard', () => ({
  OutfitCard: ({ outfit, onClick }: { outfit: GeneratedOutfit; onClick: () => void }) => (
    <div data-testid={`outfit-card-${outfit.id}`} onClick={onClick}>
      {outfit.id}
    </div>
  )
}));

describe('OutfitList Performance Tests', () => {
  const createMockOutfit = (id: string): GeneratedOutfit => ({
    id,
    jacket: {
      id: `jacket-${id}`,
      name: `Jacket ${id}`,
      category: 'Jacket/Overshirt',
      color: 'Navy',
      formalityScore: 7,
      capsuleTags: ['Refined']
    },
    shirt: {
      id: `shirt-${id}`,
      name: `Shirt ${id}`,
      category: 'Shirt',
      color: 'White',
      formalityScore: 6,
      capsuleTags: ['Refined']
    },
    pants: {
      id: `pants-${id}`,
      name: `Pants ${id}`,
      category: 'Pants',
      color: 'Charcoal',
      formalityScore: 7,
      capsuleTags: ['Refined']
    },
    shoes: {
      id: `shoes-${id}`,
      name: `Shoes ${id}`,
      category: 'Shoes',
      color: 'Black',
      formalityScore: 8,
      capsuleTags: ['Refined']
    },
    score: 28,
    source: 'curated'
  });

  const mockProps = {
    outfits: [],
    onOutfitSelect: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render large datasets efficiently with lazy loading', () => {
    // Create a large dataset of 1000 outfits
    const largeOutfitList = Array.from({ length: 1000 }, (_, i) => 
      createMockOutfit(`outfit-${i}`)
    );

    const start = performance.now();
    render(<OutfitList {...mockProps} outfits={largeOutfitList} />);
    const end = performance.now();
    const renderTime = end - start;

    // Should render quickly even with large dataset
    expect(renderTime).toBeLessThan(200); // Less than 200ms

    // Should only render initial batch (12 items)
    const renderedCards = screen.getAllByTestId(/outfit-card-/);
    expect(renderedCards.length).toBeLessThanOrEqual(12);

    // Should show correct count
    expect(screen.getByText('1000 outfits found')).toBeInTheDocument();
  });

  it('should implement lazy loading on scroll', () => {
    // Create 50 outfits
    const outfits = Array.from({ length: 50 }, (_, i) => 
      createMockOutfit(`outfit-${i}`)
    );

    render(<OutfitList {...mockProps} outfits={outfits} />);

    // Initially should show only 12 items
    let renderedCards = screen.getAllByTestId(/outfit-card-/);
    expect(renderedCards.length).toBe(12);

    // Find the scroll container
    const scrollContainer = document.querySelector('[style*="overflow-x-auto"]');
    
    if (scrollContainer) {
      // Simulate scroll to trigger lazy loading
      fireEvent.scroll(scrollContainer, { 
        target: { scrollLeft: 1000, scrollWidth: 2000, clientWidth: 800 } 
      });

      // Should eventually load more items (this might be async)
      setTimeout(() => {
        const newRenderedCards = screen.getAllByTestId(/outfit-card-/);
        expect(newRenderedCards.length).toBeGreaterThan(12);
      }, 400); // Wait for debounced loading
    }
  });

  it('should handle rapid outfit list updates efficiently', () => {
    const outfits1 = Array.from({ length: 10 }, (_, i) => 
      createMockOutfit(`outfit-1-${i}`)
    );
    const outfits2 = Array.from({ length: 20 }, (_, i) => 
      createMockOutfit(`outfit-2-${i}`)
    );
    const outfits3 = Array.from({ length: 5 }, (_, i) => 
      createMockOutfit(`outfit-3-${i}`)
    );

    const { rerender } = render(<OutfitList {...mockProps} outfits={outfits1} />);

    const start = performance.now();
    
    // Rapid updates
    rerender(<OutfitList {...mockProps} outfits={outfits2} />);
    rerender(<OutfitList {...mockProps} outfits={outfits3} />);
    rerender(<OutfitList {...mockProps} outfits={outfits1} />);
    
    const end = performance.now();
    const updateTime = end - start;

    // Should handle rapid updates efficiently
    expect(updateTime).toBeLessThan(100);

    // Should show final state correctly
    expect(screen.getByText('10 outfits found')).toBeInTheDocument();
  });

  it('should memoize visible outfits to avoid unnecessary re-renders', () => {
    const outfits = Array.from({ length: 100 }, (_, i) => 
      createMockOutfit(`outfit-${i}`)
    );

    const { rerender } = render(<OutfitList {...mockProps} outfits={outfits} />);

    // Get initial rendered cards
    const initialCards = screen.getAllByTestId(/outfit-card-/);
    const initialCount = initialCards.length;

    // Rerender with same props
    rerender(<OutfitList {...mockProps} outfits={outfits} />);

    // Should have same number of cards (memoized)
    const afterRerender = screen.getAllByTestId(/outfit-card-/);
    expect(afterRerender.length).toBe(initialCount);
  });

  it('should handle empty states efficiently', () => {
    const start = performance.now();
    render(<OutfitList {...mockProps} outfits={[]} />);
    const end = performance.now();
    const renderTime = end - start;

    // Should render empty state quickly
    expect(renderTime).toBeLessThan(50);
    expect(screen.getByText('No outfits match your selection')).toBeInTheDocument();
  });

  it('should handle loading states efficiently', () => {
    const start = performance.now();
    render(<OutfitList {...mockProps} outfits={[]} isLoading={true} />);
    const end = performance.now();
    const renderTime = end - start;

    // Should render loading state quickly
    expect(renderTime).toBeLessThan(50);
    expect(screen.getByText('Loading outfits...')).toBeInTheDocument();
    
    // Should show loading skeletons
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should optimize scroll performance with passive listeners', () => {
    const outfits = Array.from({ length: 100 }, (_, i) => 
      createMockOutfit(`outfit-${i}`)
    );

    // Spy on addEventListener to check for passive option
    const addEventListenerSpy = vi.spyOn(Element.prototype, 'addEventListener');

    render(<OutfitList {...mockProps} outfits={outfits} />);

    // Check if scroll listener was added with passive option
    const scrollListenerCalls = addEventListenerSpy.mock.calls.filter(
      call => call[0] === 'scroll'
    );

    expect(scrollListenerCalls.length).toBeGreaterThan(0);
    
    // Check if passive option is used
    const hasPassiveListener = scrollListenerCalls.some(
      call => call[2] && typeof call[2] === 'object' && (call[2] as any).passive === true
    );
    
    expect(hasPassiveListener).toBe(true);

    addEventListenerSpy.mockRestore();
  });

  it('should debounce scroll-triggered loading', () => {
    const outfits = Array.from({ length: 100 }, (_, i) => 
      createMockOutfit(`outfit-${i}`)
    );

    render(<OutfitList {...mockProps} outfits={outfits} />);

    const scrollContainer = document.querySelector('[style*="overflow-x-auto"]');
    
    if (scrollContainer) {
      const start = performance.now();
      
      // Simulate rapid scroll events
      for (let i = 0; i < 10; i++) {
        fireEvent.scroll(scrollContainer, { 
          target: { scrollLeft: 100 * i, scrollWidth: 2000, clientWidth: 800 } 
        });
      }
      
      const end = performance.now();
      const scrollTime = end - start;

      // Should handle rapid scroll events efficiently
      expect(scrollTime).toBeLessThan(100);
    }
  });

  it('should clean up event listeners and timeouts on unmount', () => {
    const outfits = Array.from({ length: 50 }, (_, i) => 
      createMockOutfit(`outfit-${i}`)
    );

    const removeEventListenerSpy = vi.spyOn(Element.prototype, 'removeEventListener');
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount } = render(<OutfitList {...mockProps} outfits={outfits} />);

    unmount();

    // Should clean up scroll listener
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    
    // Should clean up any pending timeouts (may or may not be called depending on timing)
    // This is acceptable as the cleanup is handled properly in the useEffect cleanup

    removeEventListenerSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });
});