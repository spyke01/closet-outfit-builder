import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/test-utils';
import { OptimizedItemsGrid } from './OptimizedItemsGrid';
import { WardrobeItem, Category } from '../types';
import { SettingsProvider } from '../contexts/SettingsContext';

// Mock the performance monitoring hook
vi.mock('../hooks/usePerformanceMonitoring', () => ({
  usePerformanceMonitoring: () => ({
    measureInteraction: vi.fn((name, fn) => fn()),
    recordCustomMetric: vi.fn()
  })
}));

// Mock ColorCircle component
vi.mock('./ColorCircle', () => ({
  ColorCircle: ({ itemName }: any) => <div data-testid={`color-circle-${itemName}`} />
}));

// Mock formatItemName utility
vi.mock('../utils/itemUtils', () => ({
  formatItemName: (item: WardrobeItem, showBrand: boolean) => 
    showBrand && item.brand ? `${item.brand} ${item.name}` : item.name
}));

const createMockItem = (id: string, overrides: Partial<WardrobeItem> = {}): WardrobeItem => ({
  id,
  name: `Item ${id}`,
  category: 'Shirt',
  formality: 'casual',
  capsuleTags: ['Refined'],
  brand: 'Test Brand',
  ...overrides
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SettingsProvider>
    {children}
  </SettingsProvider>
);

describe('OptimizedItemsGrid', () => {
  const mockOnItemSelect = vi.fn();
  
  const defaultProps = {
    category: 'Shirt' as Category,
    items: [],
    onItemSelect: mockOnItemSelect
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no items', () => {
    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Choose Shirt')).toBeInTheDocument();
    expect(screen.getByText('0 items found')).toBeInTheDocument();
    expect(screen.getByText('No items available in this category.')).toBeInTheDocument();
  });

  it('should render items grid', () => {
    const items = [
      createMockItem('1', { name: 'Blue Shirt' }),
      createMockItem('2', { name: 'White Shirt' })
    ];

    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={items} />
      </TestWrapper>
    );
    
    expect(screen.getByText('2 items found')).toBeInTheDocument();
    expect(screen.getByText('Blue Shirt')).toBeInTheDocument();
    expect(screen.getByText('White Shirt')).toBeInTheDocument();
  });

  it('should handle search input with deferred updates', async () => {
    const items = [
      createMockItem('1', { name: 'Blue Shirt' }),
      createMockItem('2', { name: 'Red Shirt' })
    ];

    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={items} />
      </TestWrapper>
    );
    
    const searchInput = screen.getByPlaceholderText('Search items...');
    fireEvent.change(searchInput, { target: { value: 'blue' } });
    
    // Should show filtering indicator
    expect(screen.getByText('Filtering...')).toBeInTheDocument();
    
    // Items should be disabled during filtering
    const itemButtons = screen.getAllByRole('button');
    const itemButton = itemButtons.find(button => button.textContent?.includes('Blue Shirt'));
    expect(itemButton).toHaveClass('pointer-events-none');
  });

  it('should filter items by search term', async () => {
    const items = [
      createMockItem('1', { name: 'Blue Shirt' }),
      createMockItem('2', { name: 'Red Shirt' })
    ];

    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={items} />
      </TestWrapper>
    );
    
    const searchInput = screen.getByPlaceholderText('Search items...');
    fireEvent.change(searchInput, { target: { value: 'blue' } });
    
    // Wait for deferred value to update
    await waitFor(() => {
      expect(screen.getByText('1 items found')).toBeInTheDocument();
    });
  });

  it('should handle capsule tag filtering', async () => {
    const items = [
      createMockItem('1', { name: 'Refined Shirt', capsuleTags: ['Refined'] }),
      createMockItem('2', { name: 'Adventure Shirt', capsuleTags: ['Adventurer'] })
    ];

    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={items} />
      </TestWrapper>
    );
    
    const refinedTag = screen.getByText('Refined');
    fireEvent.click(refinedTag);
    
    expect(screen.getByText('Filtering...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('1 items found')).toBeInTheDocument();
    });
  });

  it('should handle multiple tag selection', async () => {
    const items = [
      createMockItem('1', { capsuleTags: ['Refined'] }),
      createMockItem('2', { capsuleTags: ['Adventurer'] }),
      createMockItem('3', { capsuleTags: ['Refined', 'Crossover'] })
    ];

    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={items} />
      </TestWrapper>
    );
    
    // Select multiple tags
    fireEvent.click(screen.getByText('Refined'));
    fireEvent.click(screen.getByText('Adventurer'));
    
    await waitFor(() => {
      expect(screen.getByText('3 items found')).toBeInTheDocument();
    });
  });

  it('should handle item selection with performance measurement', () => {
    const items = [createMockItem('1', { name: 'Test Shirt' })];

    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={items} />
      </TestWrapper>
    );
    
    const itemButton = screen.getByText('Test Shirt').closest('[role="button"]');
    fireEvent.click(itemButton!);
    
    expect(mockOnItemSelect).toHaveBeenCalledWith(items[0]);
  });

  it('should handle keyboard navigation', () => {
    const items = [createMockItem('1', { name: 'Test Shirt' })];

    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={items} />
      </TestWrapper>
    );
    
    const itemButton = screen.getByText('Test Shirt').closest('[role="button"]');
    
    // Test Enter key
    fireEvent.keyDown(itemButton!, { key: 'Enter' });
    expect(mockOnItemSelect).toHaveBeenCalledWith(items[0]);
    
    // Test Space key
    fireEvent.keyDown(itemButton!, { key: ' ' });
    expect(mockOnItemSelect).toHaveBeenCalledTimes(2);
  });

  it('should highlight selected item', () => {
    const items = [
      createMockItem('1', { name: 'Selected Shirt' }),
      createMockItem('2', { name: 'Other Shirt' })
    ];

    render(
      <TestWrapper>
        <OptimizedItemsGrid 
          {...defaultProps} 
          items={items} 
          selectedItem={items[0]}
        />
      </TestWrapper>
    );
    
    const selectedButton = screen.getByText('Selected Shirt').closest('[role="button"]');
    const otherButton = screen.getByText('Other Shirt').closest('[role="button"]');
    
    expect(selectedButton).toHaveClass('border-slate-800');
    expect(otherButton).toHaveClass('border-stone-200');
  });

  it('should show capsule tags on items', () => {
    const items = [
      createMockItem('1', { 
        name: 'Tagged Shirt', 
        capsuleTags: ['Refined', 'Crossover'] 
      })
    ];

    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={items} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Refined')).toBeInTheDocument();
    expect(screen.getByText('Crossover')).toBeInTheDocument();
  });

  it('should highlight selected tags', () => {
    const items = [createMockItem('1', { capsuleTags: ['Refined'] })];

    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={items} />
      </TestWrapper>
    );
    
    const tagButton = screen.getAllByText('Refined')[0]; // First one is the filter button
    fireEvent.click(tagButton);
    
    expect(tagButton).toHaveClass('bg-slate-800');
  });

  it('should show total item count when filtering', async () => {
    const items = [
      createMockItem('1', { name: 'Blue Shirt' }),
      createMockItem('2', { name: 'Red Shirt' })
    ];

    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={items} />
      </TestWrapper>
    );
    
    const searchInput = screen.getByPlaceholderText('Search items...');
    fireEvent.change(searchInput, { target: { value: 'blue' } });
    
    await waitFor(() => {
      expect(screen.getByText('1 items found')).toBeInTheDocument();
      expect(screen.getByText('(2 total)')).toBeInTheDocument();
    });
  });

  it('should show appropriate empty state messages', () => {
    const items = [createMockItem('1', { name: 'Test Shirt' })];

    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={items} />
      </TestWrapper>
    );
    
    // Search for non-existent item
    const searchInput = screen.getByPlaceholderText('Search items...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('No items found matching your criteria.')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search or removing some filters.')).toBeInTheDocument();
  });

  it('should maintain performance with large datasets', () => {
    const largeItemList = Array.from({ length: 1000 }, (_, i) => 
      createMockItem(`item-${i}`, { name: `Item ${i}` })
    );

    const startTime = performance.now();
    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={largeItemList} />
      </TestWrapper>
    );
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    expect(renderTime).toBeLessThan(100); // Should render within 100ms
  });

  it('should handle rapid search changes gracefully', () => {
    const items = [createMockItem('1', { name: 'Test Shirt' })];

    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={items} />
      </TestWrapper>
    );
    
    const searchInput = screen.getByPlaceholderText('Search items...');
    
    // Rapid search changes
    fireEvent.change(searchInput, { target: { value: 'a' } });
    fireEvent.change(searchInput, { target: { value: 'ab' } });
    fireEvent.change(searchInput, { target: { value: 'abc' } });
    
    // Should handle all changes without errors
    expect(screen.getByText('Filtering...')).toBeInTheDocument();
  });

  it('should disable interactions during filtering', () => {
    const items = [createMockItem('1', { name: 'Test Shirt' })];

    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={items} />
      </TestWrapper>
    );
    
    // Start filtering
    const searchInput = screen.getByPlaceholderText('Search items...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Items should be disabled
    const itemButton = screen.getByText('Test Shirt').closest('[role="button"]');
    expect(itemButton).toHaveClass('pointer-events-none');
    
    // Tags should be disabled
    const tagButton = screen.getByText('Refined');
    expect(tagButton).toHaveAttribute('disabled');
  });

  it('should apply visual feedback during filtering', () => {
    const items = [createMockItem('1', { name: 'Test Shirt' })];

    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={items} />
      </TestWrapper>
    );
    
    // Start filtering
    const searchInput = screen.getByPlaceholderText('Search items...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Grid should have reduced opacity
    const grid = screen.getByText('Test Shirt').closest('.grid');
    expect(grid).toHaveClass('opacity-75');
  });

  it('should handle combined search and tag filtering', async () => {
    const items = [
      createMockItem('1', { name: 'Blue Refined Shirt', capsuleTags: ['Refined'] }),
      createMockItem('2', { name: 'Blue Adventure Shirt', capsuleTags: ['Adventurer'] }),
      createMockItem('3', { name: 'Red Refined Shirt', capsuleTags: ['Refined'] })
    ];

    render(
      <TestWrapper>
        <OptimizedItemsGrid {...defaultProps} items={items} />
      </TestWrapper>
    );
    
    // Apply search filter
    const searchInput = screen.getByPlaceholderText('Search items...');
    fireEvent.change(searchInput, { target: { value: 'blue' } });
    
    // Apply tag filter
    fireEvent.click(screen.getByText('Refined'));
    
    await waitFor(() => {
      expect(screen.getByText('1 items found')).toBeInTheDocument();
    });
  });
});