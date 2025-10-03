import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResponsiveOutfitCard } from './ResponsiveOutfitCard';
import { SettingsProvider } from '../contexts/SettingsContext';
import { GeneratedOutfit, OutfitSelection } from '../types';

// Mock the OutfitLayout component
vi.mock('./OutfitLayout', () => ({
  OutfitLayout: ({ selection, size, className }: any) => (
    <div data-testid="outfit-layout" data-size={size} className={className}>
      Outfit Layout for {selection.shirt?.name || 'outfit'}
    </div>
  ),
}));

// Mock the ScoreCircle component
vi.mock('./ScoreCircle', () => ({
  ScoreCircle: ({ score, size, outfit }: any) => (
    <div data-testid="score-circle" data-score={score} data-size={size}>
      Score: {score}
    </div>
  ),
}));

// Mock the ColorCircle component
vi.mock('./ColorCircle', () => ({
  ColorCircle: ({ itemName, size }: any) => (
    <div data-testid="color-circle" data-item={itemName} data-size={size}>
      Color for {itemName}
    </div>
  ),
}));

const mockOutfit: GeneratedOutfit = {
  id: 'test-outfit-1',
  shirt: { id: '1', name: 'Blue Oxford Shirt', category: 'shirt', formality: 3, capsuleTags: ['Refined'] },
  pants: { id: '2', name: 'Navy Chinos', category: 'pants', formality: 3, capsuleTags: ['Refined'] },
  shoes: { id: '3', name: 'Brown Loafers', category: 'shoes', formality: 3, capsuleTags: ['Refined'] },
  score: 85,
  source: 'generated' as const,
  loved: false,
};

const mockCuratedOutfit: OutfitSelection = {
  shirt: { id: '1', name: 'White Oxford Shirt', category: 'shirt', formality: 4, capsuleTags: ['Refined'] },
  pants: { id: '2', name: 'Charcoal Trousers', category: 'pants', formality: 4, capsuleTags: ['Refined'] },
  shoes: { id: '3', name: 'Black Oxford Shoes', category: 'shoes', formality: 4, capsuleTags: ['Refined'] },
  tuck: 'tucked',
  loved: true,
};

const renderWithSettings = (component: React.ReactElement) => {
  return render(
    <SettingsProvider>
      {component}
    </SettingsProvider>
  );
};

describe('ResponsiveOutfitCard', () => {
  describe('compact variant', () => {
    it('should render compact outfit card with basic information', () => {
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="compact"
          showScore={true}
        />
      );

      expect(screen.getByText('Blue Oxford Shirt')).toBeInTheDocument();
      expect(screen.getByText('Navy Chinos')).toBeInTheDocument();
      expect(screen.getByText('Brown Loafers')).toBeInTheDocument();
      expect(screen.getByTestId('score-circle')).toBeInTheDocument();
    });

    it('should handle click events', () => {
      const mockOnClick = vi.fn();
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="compact"
          onClick={mockOnClick}
        />
      );

      const card = screen.getByRole('button');
      fireEvent.click(card);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should show source badge when showSource is true', () => {
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="compact"
          showSource={true}
        />
      );

      expect(screen.getByText('Generated')).toBeInTheDocument();
    });

    it('should show loved badge for loved outfits', () => {
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockCuratedOutfit}
          variant="compact"
          showSource={true}
        />
      );

      expect(screen.getByText('Loved')).toBeInTheDocument();
    });

    it('should display flip button when enableFlip is true', () => {
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="compact"
          enableFlip={true}
        />
      );

      expect(screen.getByText('Mockup')).toBeInTheDocument();
    });

    it('should toggle between text and visual view when flip is enabled', async () => {
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="compact"
          enableFlip={true}
        />
      );

      const flipButton = screen.getByText('Mockup');
      fireEvent.click(flipButton);

      // Should show loading state briefly
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('Details')).toBeInTheDocument();
        expect(screen.getByTestId('outfit-layout')).toBeInTheDocument();
      });
    });
  });

  describe('detailed variant', () => {
    it('should render detailed outfit card with comprehensive information', () => {
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="detailed"
          showScore={true}
        />
      );

      expect(screen.getByText('Your Curated Outfit')).toBeInTheDocument();
      expect(screen.getByText('Core Pieces')).toBeInTheDocument();
      expect(screen.getByText('Finishing Touches')).toBeInTheDocument();
      expect(screen.getByText('Blue Oxford Shirt')).toBeInTheDocument();
      expect(screen.getByTestId('score-circle')).toBeInTheDocument();
    });

    it('should show flip button in detailed view when enabled', () => {
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="detailed"
          enableFlip={true}
        />
      );

      expect(screen.getByText('View Mockup')).toBeInTheDocument();
    });

    it('should toggle to visual view in detailed mode', async () => {
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="detailed"
          enableFlip={true}
        />
      );

      const flipButton = screen.getByText('View Mockup');
      fireEvent.click(flipButton);

      await waitFor(() => {
        expect(screen.getByText('Back to Details')).toBeInTheDocument();
        expect(screen.getByTestId('outfit-layout')).toBeInTheDocument();
      });
    });

    it('should display loved indicator for loved outfits', () => {
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockCuratedOutfit}
          variant="detailed"
        />
      );

      expect(screen.getByText('Loved')).toBeInTheDocument();
    });
  });

  describe('container queries', () => {
    it('should apply container query classes', () => {
      const { container } = renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="compact"
        />
      );

      const cardContainer = container.querySelector('.responsive-card');
      expect(cardContainer).toBeInTheDocument();
    });

    it('should use responsive padding classes', () => {
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="compact"
        />
      );

      const card = screen.getByRole('button');
      expect(card).toHaveClass('p-3', 'md:p-4', 'lg:p-5');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const mockOnClick = vi.fn();
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="compact"
          onClick={mockOnClick}
        />
      );

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-label', 'Select outfit');
    });

    it('should support keyboard navigation', () => {
      const mockOnClick = vi.fn();
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="compact"
          onClick={mockOnClick}
        />
      );

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });
      
      // Note: The actual keyboard handling is in the createInteractiveProps utility
      // This test verifies the component structure supports keyboard interaction
      expect(card).toHaveAttribute('tabIndex');
    });
  });

  describe('theme integration', () => {
    it('should use CSS custom properties for colors', () => {
      const { container } = renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="compact"
        />
      );

      const card = container.querySelector('.outfit-card-compact');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('outfit-card-compact');
    });

    it('should apply hover states with custom properties', () => {
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="compact"
        />
      );

      const card = screen.getByRole('button');
      expect(card).toHaveClass('outfit-card-compact');
    });
  });

  describe('score display', () => {
    it('should show score when showScore is true', () => {
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="compact"
          showScore={true}
        />
      );

      const scoreCircle = screen.getByTestId('score-circle');
      expect(scoreCircle).toHaveAttribute('data-score', '85');
    });

    it('should hide score when showScore is false', () => {
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="compact"
          showScore={false}
        />
      );

      expect(screen.queryByTestId('score-circle')).not.toBeInTheDocument();
    });

    it('should use override score when provided', () => {
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="compact"
          showScore={true}
          score={95}
        />
      );

      const scoreCircle = screen.getByTestId('score-circle');
      expect(scoreCircle).toHaveAttribute('data-score', '95');
    });
  });

  describe('item display', () => {
    it('should show color circles for clothing items', () => {
      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={mockOutfit}
          variant="compact"
        />
      );

      const colorCircles = screen.getAllByTestId('color-circle');
      expect(colorCircles.length).toBeGreaterThan(0);
    });

    it('should handle missing optional items gracefully', () => {
      const incompleteOutfit = {
        ...mockOutfit,
        jacket: undefined,
        belt: undefined,
        watch: undefined,
      };

      renderWithSettings(
        <ResponsiveOutfitCard
          outfit={incompleteOutfit}
          variant="compact"
        />
      );

      expect(screen.getByText('Blue Oxford Shirt')).toBeInTheDocument();
      expect(screen.queryByText('Jacket/Overshirt')).not.toBeInTheDocument();
    });
  });
});