import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test/test-utils';
import { OutfitList } from './OutfitList';
import { GeneratedOutfit } from '../types';

// Mock OutfitCard component to avoid rendering complexity in performance tests
vi.mock('./OutfitCard', () => ({
  OutfitCard: ({ outfit, onClick }: { outfit: GeneratedOutfit; onClick: () => void }) => (
    <button 
      data-testid={`outfit-card-${outfit.id}`} 
      onClick={onClick}
      type="button"
    >
      {outfit.id}
    </button>
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

  it('should render large datasets efficiently', () => {
    // Create a large dataset of 1000 outfits
    const largeOutfitList = Array.from({ length: 1000 }, (_, i) => 
      createMockOutfit(`outfit-${i}`)
    );

    const start = performance.now();
    render(<OutfitList {...mockProps} outfits={largeOutfitList} />);
    const end = performance.now();
    const renderTime = end - start;

    // Should render quickly even with large dataset
    expect(renderTime).toBeLessThan(500); // Less than 500ms for 1000 items

    // Should render all items (no lazy loading implemented)
    const renderedCards = screen.getAllByTestId(/outfit-card-/);
    expect(renderedCards.length).toBe(1000);

    // Should show correct count
    expect(screen.getByText('1000 outfits found')).toBeInTheDocument();
  });

  it('should render all items without lazy loading', () => {
    // Create 50 outfits
    const outfits = Array.from({ length: 50 }, (_, i) => 
      createMockOutfit(`outfit-${i}`)
    );

    render(<OutfitList {...mockProps} outfits={outfits} />);

    // Should render all items immediately (no lazy loading)
    const renderedCards = screen.getAllByTestId(/outfit-card-/);
    expect(renderedCards.length).toBe(50);

    // Should show correct count
    expect(screen.getByText('50 outfits found')).toBeInTheDocument();
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

  it('should render without scroll listeners (no lazy loading)', () => {
    const outfits = Array.from({ length: 100 }, (_, i) => 
      createMockOutfit(`outfit-${i}`)
    );

    // Spy on addEventListener to check that no scroll listeners are added
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    render(<OutfitList {...mockProps} outfits={outfits} />);

    // Check that no scroll listeners were added (since no lazy loading)
    const scrollListenerCalls = addEventListenerSpy.mock.calls.filter(
      call => call[0] === 'scroll'
    );

    expect(scrollListenerCalls.length).toBe(0);

    addEventListenerSpy.mockRestore();
  });

  it('should handle component unmount cleanly', () => {
    const outfits = Array.from({ length: 50 }, (_, i) => 
      createMockOutfit(`outfit-${i}`)
    );

    const { unmount } = render(<OutfitList {...mockProps} outfits={outfits} />);

    // Should unmount without errors
    expect(() => unmount()).not.toThrow();
  });
});
