import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { 
  Button, 
  Card, 
  Grid, 
  Skeleton, 
  Loading, 
  Text, 
  Badge 
} from './DesignSystemComponents';

// Mock the hooks
vi.mock('../hooks/useFeatureSupport', () => ({
  useFeatureSupport: () => ({
    optimistic: true,
    suspense: true,
    containerQueries: true,
    transitions: true,
    cssCustomProperties: true,
    backdropFilter: true,
    gridSubgrid: true,
    viewTransitions: true,
  }),
  ConditionalEnhancement: ({ children }: { children: React.ReactNode }) => children,
}));

describe('DesignSystemComponents', () => {
  describe('Button', () => {
    it('should render with default props', () => {
      render(<Button>Click me</Button>);
      
      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('font-medium', 'transition-all', 'duration-200');
    });

    it('should apply variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-surface-secondary');
    });

    it('should apply size classes', () => {
      render(<Button size="lg">Large</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-lg', 'px-6', 'py-3');
    });

    it('should handle click events', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('should apply accessibility classes', () => {
      render(<Button>Accessible</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[44px]', 'min-w-[44px]');
    });
  });

  describe('Card', () => {
    it('should render with default props', () => {
      render(<Card>Card content</Card>);
      
      const card = screen.getByText('Card content').parentElement;
      expect(card).toHaveClass('p-4', 'border', 'transition-all', 'duration-200');
    });

    it('should apply variant classes', () => {
      render(<Card variant="secondary">Secondary card</Card>);
      
      const card = screen.getByText('Secondary card').parentElement;
      expect(card).toHaveClass('bg-surface-secondary');
    });

    it('should apply padding classes', () => {
      render(<Card padding="lg">Large padding</Card>);
      
      const card = screen.getByText('Large padding').parentElement;
      expect(card).toHaveClass('p-6');
    });

    it('should apply container query class when enabled', () => {
      render(<Card containerQuery>Container query card</Card>);
      
      const card = screen.getByText('Container query card').parentElement;
      expect(card).toHaveClass('@container');
    });
  });

  describe('Grid', () => {
    it('should render with default grid classes', () => {
      render(
        <Grid columns={{ default: 2, md: 3 }}>
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );
      
      const grid = screen.getByText('Item 1').parentElement;
      expect(grid).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-3', 'gap-4');
    });

    it('should use container queries when supported', () => {
      render(
        <Grid containerColumns={{ default: 2, sm: 3 }}>
          <div>Item 1</div>
        </Grid>
      );
      
      const grid = screen.getByText('Item 1').parentElement;
      expect(grid).toHaveClass('grid', '@container', 'grid-cols-2', '@sm:grid-cols-3');
    });

    it('should apply gap classes', () => {
      render(
        <Grid gap="lg" columns={{ default: 1 }}>
          <div>Item</div>
        </Grid>
      );
      
      const grid = screen.getByText('Item').parentElement;
      expect(grid).toHaveClass('gap-6');
    });
  });

  describe('Skeleton', () => {
    it('should render with default props', () => {
      render(<Skeleton />);
      
      const skeleton = document.querySelector('.bg-surface-secondary');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('w-full', 'h-4', 'relative', 'overflow-hidden');
    });

    it('should apply custom dimensions', () => {
      render(<Skeleton width="w-32" height="h-8" />);
      
      const skeleton = document.querySelector('.bg-surface-secondary');
      expect(skeleton).toHaveClass('w-32', 'h-8');
    });

    it('should apply radius classes', () => {
      render(<Skeleton radius="full" />);
      
      const skeleton = document.querySelector('.bg-surface-secondary');
      expect(skeleton).toHaveClass('rounded-full');
    });

    it('should show animation when enabled', () => {
      render(<Skeleton animation />);
      
      const skeleton = document.querySelector('.animate-shimmer');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Loading', () => {
    it('should render spinner variant by default', () => {
      render(<Loading />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('rounded-full', 'border-2');
    });

    it('should render skeleton variant', () => {
      render(<Loading variant="skeleton" />);
      
      const skeleton = document.querySelector('.bg-surface-secondary');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render shimmer variant', () => {
      render(<Loading variant="shimmer" />);
      
      const shimmer = document.querySelector('.animate-shimmer');
      expect(shimmer).toBeInTheDocument();
    });

    it('should apply size classes', () => {
      render(<Loading size="lg" />);
      
      const loading = document.querySelector('.w-8');
      expect(loading).toBeInTheDocument();
      expect(loading).toHaveClass('h-8');
    });
  });

  describe('Text', () => {
    it('should render with default props', () => {
      render(<Text>Default text</Text>);
      
      const text = screen.getByText('Default text');
      expect(text.tagName).toBe('P');
      expect(text).toHaveClass('text-text-primary', 'text-base', 'font-normal');
    });

    it('should apply variant classes', () => {
      render(<Text variant="secondary">Secondary text</Text>);
      
      const text = screen.getByText('Secondary text');
      expect(text).toHaveClass('text-text-secondary');
    });

    it('should apply size classes', () => {
      render(<Text size="xl">Large text</Text>);
      
      const text = screen.getByText('Large text');
      expect(text).toHaveClass('text-xl');
    });

    it('should apply weight classes', () => {
      render(<Text weight="bold">Bold text</Text>);
      
      const text = screen.getByText('Bold text');
      expect(text).toHaveClass('font-bold');
    });

    it('should render as different HTML elements', () => {
      render(<Text as="h1">Heading</Text>);
      
      const heading = screen.getByText('Heading');
      expect(heading.tagName).toBe('H1');
    });
  });

  describe('Badge', () => {
    it('should render with default props', () => {
      render(<Badge>Default badge</Badge>);
      
      const badge = screen.getByText('Default badge');
      expect(badge).toHaveClass('inline-flex', 'items-center', 'font-medium', 'rounded-full');
    });

    it('should apply variant classes', () => {
      render(<Badge variant="secondary">Secondary badge</Badge>);
      
      const badge = screen.getByText('Secondary badge');
      expect(badge).toHaveClass('bg-surface-secondary');
    });

    it('should apply size classes', () => {
      render(<Badge size="md">Medium badge</Badge>);
      
      const badge = screen.getByText('Medium badge');
      expect(badge).toHaveClass('text-sm', 'px-3', 'py-1.5');
    });
  });
});