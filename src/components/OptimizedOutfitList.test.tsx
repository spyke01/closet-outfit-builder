import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/test-utils';
import { OptimizedOutfitList } from './OptimizedOutfitList';
import { GeneratedOutfit } from '../types';

// Mock the performance monitoring hook
vi.mock('../hooks/usePerformanceMonitoring', () => ({
  usePerformanceMonitoring: () => ({
    measureInteraction: vi.fn((name, fn) => fn()),
    recordCustomMetric: vi.fn()
  })
}));

// Mock OutfitCard component
vi.mock('./OutfitCard', () => ({
  OutfitCard: ({ outfit, onClick }: any) => (
    <div 
      data-testid={`outfit-card-${outfit.id}`}
      onClick={onClick}
      className="outfit-card"
    >
      <span>{outfit.id}</span>
      <span>Score: {outfit.score}</span>
      <span>Source: {outfit.source}</span>
      {outfit.loved && <span>Loved</span>}
    </div>
  )
}));

const createMockOutfit = (id: string, overrides: Partial<GeneratedOutfit> = {}): GeneratedOutfit => ({
  id,
  score: 85,
  source: 'curated',
  loved: false,
  jacket: { id: 'jacket-1', name: 'Blue Jacket', category: 'Jacket/Overshirt' },
  shirt: { id: 'shirt-1', name: 'White Shirt', category: 'Shirt' },
  pants: { id: 'pants-1', name: 'Navy Chinos', category: 'Pants' },
  shoes: { id: 'shoes-1', name: 'Brown Loafers', category: 'Shoes' },
  ...overrides
});

describe('OptimizedOutfitList', () => {
  const mockOnOutfitSelect = vi.fn();
  
  const defaultProps = {
    outfits: [],
    onOutfitSelect: mockOnOutfitSelect
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no outfits', () => {
    render(<OptimizedOutfitList {...defaultProps} />);
    
    expect(screen.getByText('0 outfits found')).toBeInTheDocument();
    expect(screen.getByText('No outfits available.')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(<OptimizedOutfitList {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading outfits...')).toBeInTheDocument();
    expect(screen.getAllByRole('generic')).toHaveLength(6); // 6 skeleton cards
  });

  it('should render outfit cards', () => {
    const outfits = [
      createMockOutfit('outfit-1', { score: 90 }),
      createMockOutfit('outfit-2', { score: 80 })
    ];

    render(<OptimizedOutfitList {...defaultProps} outfits={outfits} />);
    
    expect(screen.getByText('2 outfits found')).toBeInTheDocument();
    expect(screen.getByTestId('outfit-card-outfit-1')).toBeInTheDocument();
    expect(screen.getByTestId('outfit-card-outfit-2')).toBeInTheDocument();
  });

  it('should sort outfits by score by default', () => {
    const outfits = [
      createMockOutfit('outfit-1', { score: 70 }),
      createMockOutfit('outfit-2', { score: 90 }),
      createMockOutfit('outfit-3', { score: 80 })
    ];

    render(<OptimizedOutfitList {...defaultProps} outfits={outfits} />);
    
    const cards = screen.getAllByText(/Score:/);
    expect(cards[0]).toHaveTextContent('Score: 90');
    expect(cards[1]).toHaveTextContent('Score: 80');
    expect(cards[2]).toHaveTextContent('Score: 70');
  });

  it('should filter outfits by search term', async () => {
    const outfits = [
      createMockOutfit('blue-outfit', { 
        jacket: { id: 'jacket-1', name: 'Blue Jacket', category: 'Jacket/Overshirt' }
      }),
      createMockOutfit('red-outfit', { 
        jacket: { id: 'jacket-2', name: 'Red Jacket', category: 'Jacket/Overshirt' }
      })
    ];

    render(<OptimizedOutfitList {...defaultProps} outfits={outfits} searchTerm="blue" />);
    
    // Should show processing indicator initially
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    
    // After deferred value updates, should show filtered results
    await waitFor(() => {
      expect(screen.getByTestId('outfit-card-blue-outfit')).toBeInTheDocument();
    });
  });

  it('should filter outfits by minimum score', async () => {
    const outfits = [
      createMockOutfit('high-score', { score: 95 }),
      createMockOutfit('low-score', { score: 60 })
    ];

    render(
      <OptimizedOutfitList 
        {...defaultProps} 
        outfits={outfits} 
        filterBy={{ minScore: 80 }}
      />
    );
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByTestId('outfit-card-high-score')).toBeInTheDocument();
    });
  });

  it('should filter outfits by source', async () => {
    const outfits = [
      createMockOutfit('curated-outfit', { source: 'curated' }),
      createMockOutfit('generated-outfit', { source: 'generated' })
    ];

    render(
      <OptimizedOutfitList 
        {...defaultProps} 
        outfits={outfits} 
        filterBy={{ source: 'curated' }}
      />
    );
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByTestId('outfit-card-curated-outfit')).toBeInTheDocument();
    });
  });

  it('should filter outfits by loved status', async () => {
    const outfits = [
      createMockOutfit('loved-outfit', { loved: true }),
      createMockOutfit('not-loved-outfit', { loved: false })
    ];

    render(
      <OptimizedOutfitList 
        {...defaultProps} 
        outfits={outfits} 
        filterBy={{ loved: true }}
      />
    );
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByTestId('outfit-card-loved-outfit')).toBeInTheDocument();
      expect(screen.getByText('Loved')).toBeInTheDocument();
    });
  });

  it('should handle outfit selection with performance measurement', () => {
    const outfits = [createMockOutfit('outfit-1')];

    render(<OptimizedOutfitList {...defaultProps} outfits={outfits} />);
    
    const card = screen.getByTestId('outfit-card-outfit-1');
    fireEvent.click(card);
    
    expect(mockOnOutfitSelect).toHaveBeenCalledWith(outfits[0]);
  });

  it('should show appropriate empty state messages', () => {
    // With search term
    render(
      <OptimizedOutfitList 
        {...defaultProps} 
        outfits={[]} 
        searchTerm="nonexistent"
      />
    );
    
    expect(screen.getByText('No outfits match your search criteria.')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search or filters.')).toBeInTheDocument();
  });

  it('should show processing indicator when filtering', () => {
    const outfits = [createMockOutfit('outfit-1')];

    const { rerender } = render(
      <OptimizedOutfitList {...defaultProps} outfits={outfits} />
    );
    
    // Update search term to trigger processing
    rerender(
      <OptimizedOutfitList 
        {...defaultProps} 
        outfits={outfits} 
        searchTerm="test"
      />
    );
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('should apply opacity changes during processing', () => {
    const outfits = [createMockOutfit('outfit-1')];

    const { rerender } = render(
      <OptimizedOutfitList {...defaultProps} outfits={outfits} />
    );
    
    // Update filter to trigger processing
    rerender(
      <OptimizedOutfitList 
        {...defaultProps} 
        outfits={outfits} 
        filterBy={{ minScore: 80 }}
      />
    );
    
    const card = screen.getByTestId('outfit-card-outfit-1');
    expect(card).toHaveClass('opacity-75');
  });

  it('should handle multiple concurrent filters', async () => {
    const outfits = [
      createMockOutfit('perfect-match', { 
        score: 95, 
        source: 'curated', 
        loved: true,
        jacket: { id: 'jacket-1', name: 'Blue Jacket', category: 'Jacket/Overshirt' }
      }),
      createMockOutfit('partial-match', { 
        score: 85, 
        source: 'generated', 
        loved: false,
        jacket: { id: 'jacket-2', name: 'Red Jacket', category: 'Jacket/Overshirt' }
      })
    ];

    render(
      <OptimizedOutfitList 
        {...defaultProps} 
        outfits={outfits} 
        searchTerm="blue"
        filterBy={{ minScore: 90, source: 'curated', loved: true }}
      />
    );
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByTestId('outfit-card-perfect-match')).toBeInTheDocument();
    });
  });

  it('should maintain performance with large datasets', () => {
    const largeOutfitList = Array.from({ length: 1000 }, (_, i) => 
      createMockOutfit(`outfit-${i}`, { score: Math.random() * 100 })
    );

    const startTime = performance.now();
    render(<OptimizedOutfitList {...defaultProps} outfits={largeOutfitList} />);
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    expect(renderTime).toBeLessThan(100); // Should render within 100ms
  });

  it('should handle rapid filter changes gracefully', () => {
    const outfits = [createMockOutfit('outfit-1')];

    const { rerender } = render(
      <OptimizedOutfitList {...defaultProps} outfits={outfits} />
    );
    
    // Rapid filter changes
    rerender(<OptimizedOutfitList {...defaultProps} outfits={outfits} searchTerm="a" />);
    rerender(<OptimizedOutfitList {...defaultProps} outfits={outfits} searchTerm="ab" />);
    rerender(<OptimizedOutfitList {...defaultProps} outfits={outfits} searchTerm="abc" />);
    
    // Should handle all changes without errors
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('should sort by different criteria', () => {
    const outfits = [
      createMockOutfit('z-outfit', { score: 70, source: 'generated' }),
      createMockOutfit('a-outfit', { score: 90, source: 'curated' }),
      createMockOutfit('m-outfit', { score: 80, source: 'curated' })
    ];

    // Test name sorting
    render(
      <OptimizedOutfitList 
        {...defaultProps} 
        outfits={outfits} 
        sortBy="name"
      />
    );
    
    const cards = screen.getAllByTestId(/outfit-card-/);
    expect(cards[0]).toHaveAttribute('data-testid', 'outfit-card-a-outfit');
    expect(cards[1]).toHaveAttribute('data-testid', 'outfit-card-m-outfit');
    expect(cards[2]).toHaveAttribute('data-testid', 'outfit-card-z-outfit');
  });

  it('should handle edge cases gracefully', () => {
    // Empty search term
    render(
      <OptimizedOutfitList 
        {...defaultProps} 
        outfits={[createMockOutfit('outfit-1')]} 
        searchTerm=""
      />
    );
    
    expect(screen.getByTestId('outfit-card-outfit-1')).toBeInTheDocument();
    
    // Undefined filter values
    render(
      <OptimizedOutfitList 
        {...defaultProps} 
        outfits={[createMockOutfit('outfit-1')]} 
        filterBy={{ minScore: undefined, source: undefined }}
      />
    );
    
    expect(screen.getByTestId('outfit-card-outfit-1')).toBeInTheDocument();
  });
});