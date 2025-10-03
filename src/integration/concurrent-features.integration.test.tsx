import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '../test/test-utils';
import { useOutfitEngine } from '../hooks/useOutfitEngine';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import { OutfitList } from '../components/OutfitList';
import { ItemsGrid } from '../components/ItemsGrid';
import { SettingsProvider } from '../contexts/SettingsContext';
import { WardrobeItem, GeneratedOutfit } from '../types';

// Mock the outfit engine
vi.mock('../hooks/useOutfitEngine', () => ({
  useOutfitEngine: () => ({
    getOutfitsForAnchor: vi.fn().mockReturnValue([
      {
        id: 'outfit-1',
        score: 85,
        source: 'curated',
        loved: false,
        jacket: { id: 'jacket-1', name: 'Blue Jacket', category: 'Jacket/Overshirt' }
      }
    ]),
    getAllOutfits: vi.fn().mockReturnValue([
      {
        id: 'outfit-1',
        score: 85,
        source: 'curated',
        loved: false
      }
    ])
  })
}));

// Mock components for focused testing
vi.mock('../components/OutfitCard', () => ({
  OutfitCard: ({ outfit, onClick }: any) => (
    <div 
      data-testid={`outfit-card-${outfit.id}`}
      onClick={onClick}
      className="outfit-card"
    >
      {outfit.id}
    </div>
  )
}));

vi.mock('../components/ColorCircle', () => ({
  ColorCircle: ({ itemName }: any) => <div data-testid={`color-circle-${itemName}`} />
}));

vi.mock('../utils/itemUtils', () => ({
  formatItemName: (item: WardrobeItem) => item.name
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SettingsProvider>
    {children}
  </SettingsProvider>
);

describe('Concurrent Features Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useOutfitEngine Enhanced Features Integration', () => {
    const TestComponent = () => {
      const {
        searchAndFilterOutfits: outfits,
        searchTerm,
        setSearchTerm,
        filterCriteria,
        setFilterCriteria,
        generateOutfitsForAnchor: generateOutfits,
        isGenerating,
        isFiltering
      } = useOutfitEngine();

      const mockAnchorItem: WardrobeItem = {
        id: 'jacket-1',
        name: 'Blue Jacket',
        category: 'Jacket/Overshirt',
        formality: 'casual'
      };

      return (
        <div>
          <div data-testid="outfit-count">{outfits.length}</div>
          <div data-testid="is-generating">{isGenerating.toString()}</div>
          <div data-testid="is-filtering">{isFiltering.toString()}</div>
          
          <input
            data-testid="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <button
            data-testid="generate-button"
            onClick={() => generateOutfits(mockAnchorItem)}
          >
            Generate
          </button>
          
          <button
            data-testid="filter-button"
            onClick={() => setFilterCriteria({ minScore: 80 })}
          >
            Filter
          </button>
        </div>
      );
    };

    it('should handle concurrent outfit generation and filtering', async () => {
      render(<TestComponent />);

      // Generate outfits
      fireEvent.click(screen.getByTestId('generate-button'));
      
      expect(screen.getByTestId('outfit-count')).toHaveTextContent('1');

      // Apply search filter
      fireEvent.change(screen.getByTestId('search-input'), { 
        target: { value: 'blue' } 
      });

      expect(screen.getByTestId('is-filtering')).toHaveTextContent('true');

      // Apply additional filter
      fireEvent.click(screen.getByTestId('filter-button'));

      // Should handle concurrent updates gracefully
      expect(screen.getByTestId('is-filtering')).toHaveTextContent('true');
    });

    it('should maintain performance during rapid updates', async () => {
      render(<TestComponent />);

      const startTime = performance.now();

      // Rapid updates
      for (let i = 0; i < 10; i++) {
        fireEvent.change(screen.getByTestId('search-input'), { 
          target: { value: `search-${i}` } 
        });
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete within performance threshold
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe('Performance Monitoring Integration', () => {
    const TestComponent = () => {
      const {
        metrics,
        measureInteraction,
        recordCustomMetric,
        getPerformanceReport
      } = usePerformanceMonitoring();

      const handleClick = () => {
        measureInteraction('test-click', () => {
          // Simulate work
          for (let i = 0; i < 1000; i++) {
            Math.random();
          }
        });
      };

      const handleRecord = () => {
        recordCustomMetric('outfitGenerationTime', 150);
      };

      return (
        <div>
          <div data-testid="interaction-samples">
            {metrics.interactionResponse.samples.length}
          </div>
          <div data-testid="custom-metrics">
            {metrics.customMetrics.outfitGenerationTime.length}
          </div>
          
          <button data-testid="click-button" onClick={handleClick}>
            Click
          </button>
          
          <button data-testid="record-button" onClick={handleRecord}>
            Record
          </button>
          
          <button 
            data-testid="report-button" 
            onClick={() => console.log(getPerformanceReport())}
          >
            Report
          </button>
        </div>
      );
    };

    it('should track interaction performance', async () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByTestId('click-button'));

      await waitFor(() => {
        expect(screen.getByTestId('interaction-samples')).toHaveTextContent('1');
      });
    });

    it('should record custom metrics', () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByTestId('record-button'));

      expect(screen.getByTestId('custom-metrics')).toHaveTextContent('1');
    });
  });

  describe('OutfitList Integration', () => {
    const createMockOutfit = (id: string, overrides: Partial<GeneratedOutfit> = {}): GeneratedOutfit => ({
      id,
      score: 85,
      source: 'curated',
      loved: false,
      jacket: { id: 'jacket-1', name: 'Blue Jacket', category: 'Jacket/Overshirt' },
      ...overrides
    });

    it('should handle large datasets efficiently', () => {
      const largeOutfitList = Array.from({ length: 500 }, (_, i) => 
        createMockOutfit(`outfit-${i}`, { score: Math.random() * 100 })
      );

      const startTime = performance.now();
      
      render(
        <OutfitList
          outfits={largeOutfitList}
          onOutfitSelect={() => {}}
          searchTerm="outfit"
          filterBy={{ minScore: 50 }}
        />
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(200); // Should render within 200ms
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should maintain responsiveness during filtering', async () => {
      const outfits = Array.from({ length: 100 }, (_, i) => 
        createMockOutfit(`outfit-${i}`, { 
          score: Math.random() * 100,
          jacket: { 
            id: `jacket-${i}`, 
            name: i % 2 === 0 ? 'Blue Jacket' : 'Red Jacket', 
            category: 'Jacket/Overshirt' 
          }
        })
      );

      const { rerender } = render(
        <OutfitList
          outfits={outfits}
          onOutfitSelect={() => {}}
        />
      );

      // Apply multiple filters rapidly
      const filters = [
        { searchTerm: 'blue' },
        { searchTerm: 'blue', filterBy: { minScore: 80 } },
        { searchTerm: 'blue', filterBy: { minScore: 80, source: 'curated' as const } }
      ];

      for (const filter of filters) {
        const startTime = performance.now();
        
        rerender(
          <OutfitList
            outfits={outfits}
            onOutfitSelect={() => {}}
            {...filter}
          />
        );
        
        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(50); // Each update should be fast
      }
    });
  });

  describe('ItemsGrid Integration', () => {
    const createMockItem = (id: string, overrides: Partial<WardrobeItem> = {}): WardrobeItem => ({
      id,
      name: `Item ${id}`,
      category: 'Shirt',
      formality: 'casual',
      capsuleTags: ['Refined'],
      ...overrides
    });

    it('should handle large item collections efficiently', () => {
      const largeItemList = Array.from({ length: 300 }, (_, i) => 
        createMockItem(`item-${i}`, { 
          name: i % 3 === 0 ? 'Blue Shirt' : i % 3 === 1 ? 'Red Shirt' : 'White Shirt',
          capsuleTags: i % 2 === 0 ? ['Refined'] : ['Adventurer']
        })
      );

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <ItemsGrid
            category="Shirt"
            items={largeItemList}
            onItemSelect={() => {}}
          />
        </TestWrapper>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(150); // Should render within 150ms
    });

    it('should maintain performance during concurrent search and filtering', async () => {
      const items = Array.from({ length: 100 }, (_, i) => 
        createMockItem(`item-${i}`, { 
          name: i % 2 === 0 ? 'Blue Shirt' : 'Red Shirt',
          capsuleTags: i % 3 === 0 ? ['Refined'] : ['Adventurer']
        })
      );

      render(
        <TestWrapper>
          <ItemsGrid
            category="Shirt"
            items={items}
            onItemSelect={() => {}}
          />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search items...');
      const refinedTag = screen.getByText('Refined');

      // Concurrent operations
      const startTime = performance.now();
      
      fireEvent.change(searchInput, { target: { value: 'blue' } });
      fireEvent.click(refinedTag);
      
      const endTime = performance.now();
      const operationTime = endTime - startTime;

      expect(operationTime).toBeLessThan(50); // Should handle concurrent ops quickly
      expect(screen.getByText('Filtering...')).toBeInTheDocument();
    });
  });

  describe('End-to-End Performance', () => {
    it('should maintain sub-100ms interaction response times', async () => {
      const outfits = Array.from({ length: 50 }, (_, i) => ({
        id: `outfit-${i}`,
        score: Math.random() * 100,
        source: 'curated' as const,
        loved: false
      }));

      const mockOnSelect = vi.fn();
      
      render(
        <OutfitList
          outfits={outfits}
          onOutfitSelect={mockOnSelect}
        />
      );

      const cards = screen.getAllByTestId(/outfit-card-/);
      
      // Measure interaction time
      const startTime = performance.now();
      fireEvent.click(cards[0]);
      const endTime = performance.now();
      
      const interactionTime = endTime - startTime;
      expect(interactionTime).toBeLessThan(100);
      expect(mockOnSelect).toHaveBeenCalled();
    });

    it('should handle memory efficiently with large datasets', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Create large dataset
      const largeOutfitList = Array.from({ length: 1000 }, (_, i) => ({
        id: `outfit-${i}`,
        score: Math.random() * 100,
        source: 'curated' as const,
        loved: false
      }));

      const { unmount } = render(
        <OutfitList
          outfits={largeOutfitList}
          onOutfitSelect={() => {}}
          searchTerm="test"
          filterBy={{ minScore: 50 }}
        />
      );

      // Cleanup
      unmount();

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});