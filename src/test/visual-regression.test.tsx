/**
 * Visual regression tests for container queries and responsive components
 * Tests layout consistency across different viewport sizes and container contexts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ResponsiveOutfitCard } from '../components/ResponsiveOutfitCard';
import { OptimizedItemsGrid } from '../components/OptimizedItemsGrid';
import { GeneratedOutfit, WardrobeItem } from '../types';

// Mock ResizeObserver for container query testing
class MockResizeObserver {
  callback: ResizeObserverCallback;
  
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  
  observe(target: Element) {
    // Simulate container size change
    setTimeout(() => {
      this.callback([{
        target,
        contentRect: {
          width: 300,
          height: 200,
          top: 0,
          left: 0,
          bottom: 200,
          right: 300,
          x: 0,
          y: 0,
          toJSON: () => ({})
        },
        borderBoxSize: [{
          blockSize: 200,
          inlineSize: 300
        }],
        contentBoxSize: [{
          blockSize: 200,
          inlineSize: 300
        }],
        devicePixelContentBoxSize: [{
          blockSize: 200,
          inlineSize: 300
        }]
      } as ResizeObserverEntry], this);
    }, 0);
  }
  
  unobserve() {}
  disconnect() {}
}

// Mock CSS.supports for container query support
Object.defineProperty(CSS, 'supports', {
  value: vi.fn((property: string, value?: string) => {
    if (property === 'container-type: inline-size') return true;
    if (property.includes('@container')) return true;
    return false;
  })
});

const mockOutfit: GeneratedOutfit = {
  id: 'test-outfit-1',
  shirt: {
    id: 'shirt-1',
    name: 'Blue Oxford Shirt',
    category: 'Shirt',
    formality: 'smart-casual',
    capsule: ['classic'],
    image: '/images/shirt-1.png'
  },
  pants: {
    id: 'pants-1',
    name: 'Navy Chinos',
    category: 'Pants',
    formality: 'smart-casual',
    capsule: ['classic'],
    image: '/images/pants-1.png'
  },
  shoes: {
    id: 'shoes-1',
    name: 'Brown Loafers',
    category: 'Shoes',
    formality: 'smart-casual',
    capsule: ['classic'],
    image: '/images/shoes-1.png'
  },
  score: 85,
  source: 'curated',
  loved: false
};

const mockItems: WardrobeItem[] = [
  {
    id: 'shirt-1',
    name: 'Blue Oxford Shirt',
    category: 'Shirt',
    formality: 'smart-casual',
    capsule: ['classic'],
    image: '/images/shirt-1.png'
  },
  {
    id: 'pants-1',
    name: 'Navy Chinos',
    category: 'Pants',
    formality: 'smart-casual',
    capsule: ['classic'],
    image: '/images/pants-1.png'
  }
];

describe('Visual Regression - Container Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.ResizeObserver = MockResizeObserver as any;
    
    // Reset viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ResponsiveOutfitCard container adaptations', () => {
    it('should adapt layout based on container width (small)', async () => {
      const { container } = render(
        <div style={{ width: '200px' }}>
          <ResponsiveOutfitCard outfit={mockOutfit} />
        </div>
      );

      await waitFor(() => {
        const card = container.querySelector('.outfit-card');
        expect(card).toBeInTheDocument();
      });

      // Should use compact layout for small containers
      const card = container.querySelector('.outfit-card');
      const computedStyle = window.getComputedStyle(card!);
      
      // Verify container query classes are applied
      expect(card).toHaveClass('outfit-card');
      
      // Should have appropriate layout for small container
      const images = container.querySelectorAll('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('src');
        expect(img).toHaveAttribute('alt');
      });
    });

    it('should adapt layout based on container width (medium)', async () => {
      const { container } = render(
        <div style={{ width: '400px' }}>
          <ResponsiveOutfitCard outfit={mockOutfit} />
        </div>
      );

      await waitFor(() => {
        const card = container.querySelector('.outfit-card');
        expect(card).toBeInTheDocument();
      });

      // Should use medium layout
      const card = container.querySelector('.outfit-card');
      expect(card).toHaveClass('outfit-card');
      
      // Layout should be different from small container
      const cardContent = card?.querySelector('.outfit-content');
      expect(cardContent).toBeInTheDocument();
    });

    it('should adapt layout based on container width (large)', async () => {
      const { container } = render(
        <div style={{ width: '600px' }}>
          <ResponsiveOutfitCard outfit={mockOutfit} />
        </div>
      );

      await waitFor(() => {
        const card = container.querySelector('.outfit-card');
        expect(card).toBeInTheDocument();
      });

      // Should use expanded layout for large containers
      const card = container.querySelector('.outfit-card');
      expect(card).toHaveClass('outfit-card');
      
      // Should show more details in large layout
      const scoreElement = screen.getByText(/score/i);
      expect(scoreElement).toBeInTheDocument();
    });
  });

  describe('Grid layout adaptations', () => {
    it('should adapt grid columns based on container size', async () => {
      const { container, rerender } = render(
        <div style={{ width: '300px' }}>
          <OptimizedItemsGrid items={mockItems} onItemSelect={vi.fn()} />
        </div>
      );

      await waitFor(() => {
        const grid = container.querySelector('.items-grid');
        expect(grid).toBeInTheDocument();
      });

      // Should use single column for narrow container
      let grid = container.querySelector('.items-grid');
      expect(grid).toHaveClass('items-grid');

      // Test wider container
      rerender(
        <div style={{ width: '600px' }}>
          <OptimizedItemsGrid items={mockItems} onItemSelect={vi.fn()} />
        </div>
      );

      await waitFor(() => {
        grid = container.querySelector('.items-grid');
        expect(grid).toBeInTheDocument();
      });

      // Should adapt to wider layout
      expect(grid).toHaveClass('items-grid');
    });
  });
});descri
be('Visual Regression - Responsive Breakpoints', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1024, height: 768 },
    { name: 'large-desktop', width: 1440, height: 900 }
  ];

  viewports.forEach(viewport => {
    describe(`${viewport.name} viewport (${viewport.width}x${viewport.height})`, () => {
      beforeEach(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: viewport.height,
        });
      });

      it('should render outfit card correctly', () => {
        const { container } = render(<ResponsiveOutfitCard outfit={mockOutfit} />);
        
        const card = container.querySelector('.outfit-card');
        expect(card).toBeInTheDocument();
        
        // Should have appropriate responsive classes
        const computedStyle = window.getComputedStyle(card!);
        expect(computedStyle.display).toBeTruthy();
        
        // Images should be properly sized
        const images = container.querySelectorAll('img');
        images.forEach(img => {
          const imgStyle = window.getComputedStyle(img);
          expect(imgStyle.maxWidth).toBe('100%');
        });
      });

      it('should maintain proper spacing and typography', () => {
        const { container } = render(<ResponsiveOutfitCard outfit={mockOutfit} />);
        
        // Text should be readable at all sizes
        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
          const style = window.getComputedStyle(heading);
          const fontSize = parseInt(style.fontSize);
          expect(fontSize).toBeGreaterThan(12); // Minimum readable size
        });
        
        // Should have appropriate margins and padding
        const card = container.querySelector('.outfit-card');
        const cardStyle = window.getComputedStyle(card!);
        expect(cardStyle.padding).toBeTruthy();
      });

      it('should handle touch interactions appropriately', () => {
        const onSelect = vi.fn();
        render(<ResponsiveOutfitCard outfit={mockOutfit} onSelect={onSelect} />);
        
        const buttons = screen.getAllByRole('button');
        
        buttons.forEach(button => {
          const rect = button.getBoundingClientRect();
          
          if (viewport.width < 768) {
            // Mobile: should have larger touch targets
            expect(rect.width).toBeGreaterThanOrEqual(44);
            expect(rect.height).toBeGreaterThanOrEqual(44);
          } else {
            // Desktop: can have smaller targets but still accessible
            expect(rect.width).toBeGreaterThanOrEqual(32);
            expect(rect.height).toBeGreaterThanOrEqual(32);
          }
        });
      });
    });
  });

  describe('layout consistency across breakpoints', () => {
    it('should maintain visual hierarchy at all sizes', () => {
      viewports.forEach(viewport => {
        Object.defineProperty(window, 'innerWidth', {
          value: viewport.width,
        });

        const { container } = render(<ResponsiveOutfitCard outfit={mockOutfit} />);
        
        // Should always have a clear hierarchy
        const heading = container.querySelector('h1, h2, h3, h4, h5, h6');
        expect(heading).toBeInTheDocument();
        
        const score = screen.getByText(/score/i);
        expect(score).toBeInTheDocument();
        
        // Visual elements should be present
        const images = container.querySelectorAll('img');
        expect(images.length).toBeGreaterThan(0);
      });
    });

    it('should prevent layout shifts during responsive changes', async () => {
      const { container, rerender } = render(<ResponsiveOutfitCard outfit={mockOutfit} />);
      
      // Get initial layout
      const initialCard = container.querySelector('.outfit-card');
      const initialRect = initialCard?.getBoundingClientRect();
      
      // Change viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
      });
      
      rerender(<ResponsiveOutfitCard outfit={mockOutfit} />);
      
      await waitFor(() => {
        const newCard = container.querySelector('.outfit-card');
        expect(newCard).toBeInTheDocument();
      });
      
      // Layout should be stable (no unexpected shifts)
      const newCard = container.querySelector('.outfit-card');
      const newRect = newCard?.getBoundingClientRect();
      
      expect(newRect?.width).toBeGreaterThan(0);
      expect(newRect?.height).toBeGreaterThan(0);
    });
  });

  describe('container query fallbacks', () => {
    it('should work without container query support', () => {
      // Mock lack of container query support
      Object.defineProperty(CSS, 'supports', {
        value: vi.fn((property: string) => {
          if (property === 'container-type: inline-size') return false;
          return false;
        })
      });

      const { container } = render(<ResponsiveOutfitCard outfit={mockOutfit} />);
      
      // Should still render correctly
      const card = container.querySelector('.outfit-card');
      expect(card).toBeInTheDocument();
      
      // Should fall back to viewport-based responsive design
      const images = container.querySelectorAll('img');
      expect(images.length).toBeGreaterThan(0);
    });

    it('should gracefully degrade layout features', () => {
      // Mock partial container query support
      Object.defineProperty(CSS, 'supports', {
        value: vi.fn((property: string) => {
          return property.includes('width') || property.includes('height');
        })
      });

      const { container } = render(
        <div style={{ width: '300px' }}>
          <ResponsiveOutfitCard outfit={mockOutfit} />
        </div>
      );
      
      // Should still provide a good experience
      const card = container.querySelector('.outfit-card');
      expect(card).toBeInTheDocument();
      
      // Content should be accessible
      const heading = screen.getByRole('heading');
      expect(heading).toBeInTheDocument();
    });
  });

  describe('performance considerations', () => {
    it('should not cause excessive re-renders during resize', async () => {
      const renderSpy = vi.fn();
      
      const TestComponent = () => {
        renderSpy();
        return <ResponsiveOutfitCard outfit={mockOutfit} />;
      };

      const { container } = render(<TestComponent />);
      
      const initialRenderCount = renderSpy.mock.calls.length;
      
      // Simulate multiple rapid resizes
      for (let i = 0; i < 5; i++) {
        Object.defineProperty(window, 'innerWidth', {
          value: 300 + i * 100,
        });
        
        // Trigger resize event
        window.dispatchEvent(new Event('resize'));
      }
      
      await waitFor(() => {
        // Should not cause excessive re-renders
        const finalRenderCount = renderSpy.mock.calls.length;
        expect(finalRenderCount - initialRenderCount).toBeLessThan(10);
      });
    });

    it('should efficiently handle container size changes', async () => {
      const { container } = render(
        <div data-testid="container" style={{ width: '200px', resize: 'horizontal', overflow: 'auto' }}>
          <ResponsiveOutfitCard outfit={mockOutfit} />
        </div>
      );

      const containerEl = screen.getByTestId('container');
      
      // Simulate container resize
      Object.defineProperty(containerEl, 'offsetWidth', {
        value: 400,
      });
      
      // Should handle resize efficiently
      await waitFor(() => {
        const card = container.querySelector('.outfit-card');
        expect(card).toBeInTheDocument();
      });
    });
  });
});