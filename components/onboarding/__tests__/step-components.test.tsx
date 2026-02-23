import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StepStyleBaseline } from '../step-style-baseline';
import { StepCategoryOwnership } from '../step-category-ownership';
import { StepSubcategorySelection } from '../step-subcategory-selection';
import { StepColorsQuantity } from '../step-colors-quantity';
import { StepReview } from '../step-review';
import { StepSuccess } from '../step-success';
import type { StyleBaseline, CategoryKey, GeneratedWardrobeItem } from '@/lib/types/onboarding';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

/**
 * Component tests for individual wizard steps
 * 
 * Tests each step component in isolation to verify:
 * - Rendering
 * - User interactions
 * - State updates
 * - Validation
 */

describe('Step Components', () => {
  describe('StepStyleBaseline', () => {
    it('renders primary use and climate options', () => {
      const onChange = vi.fn();
      const value: StyleBaseline = { primaryUse: null, climate: null };

      render(<StepStyleBaseline value={value} onChange={onChange} />);

      // Should show primary use options (use exact match to avoid "Work" matching "Mixed: Both work...")
      expect(screen.getByRole('button', { name: /^work: professional/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^casual: everyday/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^mixed: both work/i })).toBeInTheDocument();

      // Should show climate options
      expect(screen.getByRole('button', { name: /^hot: warm weather/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^cold: cool weather/i })).toBeInTheDocument();
    });

    it('calls onChange when primary use is selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const value: StyleBaseline = { primaryUse: null, climate: null };

      render(<StepStyleBaseline value={value} onChange={onChange} />);

      const casualButton = screen.getByRole('button', { name: /casual: everyday and relaxed/i });
      await user.click(casualButton);

      expect(onChange).toHaveBeenCalledWith({
        primaryUse: 'Casual',
        climate: null,
      });
    });

    it('calls onChange when climate is selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const value: StyleBaseline = { primaryUse: 'Casual', climate: null };

      render(<StepStyleBaseline value={value} onChange={onChange} />);

      const hotButton = screen.getByRole('button', { name: /hot: warm weather/i });
      await user.click(hotButton);

      expect(onChange).toHaveBeenCalledWith({
        primaryUse: 'Casual',
        climate: 'Hot',
      });
    });
  });

  describe('StepCategoryOwnership', () => {
    it('renders category options', () => {
      const onChange = vi.fn();
      const selectedCategories: CategoryKey[] = [];

      render(<StepCategoryOwnership selectedCategories={selectedCategories} onChange={onChange} />);

      // Should show all category options using role-based queries
      expect(screen.getByRole('checkbox', { name: /tops:/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /bottoms:/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /shoes:/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /layers:/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /dresses:/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /accessories:/i })).toBeInTheDocument();
    });

    it('shows essential categories as pre-selected', () => {
      const onChange = vi.fn();
      const selectedCategories: CategoryKey[] = ['Tops', 'Bottoms', 'Shoes'];

      render(<StepCategoryOwnership selectedCategories={selectedCategories} onChange={onChange} />);

      // Essential categories should be marked as selected using aria-checked
      const topsCard = screen.getByRole('checkbox', { name: /tops:/i });
      expect(topsCard).toHaveAttribute('aria-checked', 'true');
    });

    it('calls onChange when category is toggled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const selectedCategories: CategoryKey[] = ['Tops', 'Bottoms', 'Shoes'];

      render(<StepCategoryOwnership selectedCategories={selectedCategories} onChange={onChange} />);

      const layersCard = screen.getByRole('checkbox', { name: /layers:/i });
      await user.click(layersCard);

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('StepSubcategorySelection', () => {
    it('renders subcategories for selected categories', () => {
      const onChange = vi.fn();
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories = {};

      render(
        <StepSubcategorySelection
          selectedCategories={selectedCategories}
          selectedSubcategories={selectedSubcategories}
          onChange={onChange}
        />
      );

      // Should show Tops subcategories
      expect(screen.getByRole('checkbox', { name: /t-shirt/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /polo/i })).toBeInTheDocument();
    });

    it('calls onChange when subcategory is selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories = {};

      render(
        <StepSubcategorySelection
          selectedCategories={selectedCategories}
          selectedSubcategories={selectedSubcategories}
          onChange={onChange}
        />
      );

      const tshirtCheckbox = screen.getByRole('checkbox', { name: /t-shirt/i });
      await user.click(tshirtCheckbox);

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('StepColorsQuantity', () => {
    it('renders color options for selected subcategories', () => {
      const onChange = vi.fn();
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories = { Tops: ['T-Shirt'] };
      const colorQuantitySelections = {};

      render(
        <StepColorsQuantity
          selectedCategories={selectedCategories}
          selectedSubcategories={selectedSubcategories}
          colorQuantitySelections={colorQuantitySelections}
          onChange={onChange}
        />
      );

      // Should show T-Shirt heading with color options (buttons with aria-pressed, not checkboxes)
      expect(screen.getByRole('heading', { name: /t-shirt/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /navy/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /white/i })).toBeInTheDocument();
    });

    it('calls onChange when color is selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories = { Tops: ['T-Shirt'] };
      const colorQuantitySelections = {};

      render(
        <StepColorsQuantity
          selectedCategories={selectedCategories}
          selectedSubcategories={selectedSubcategories}
          colorQuantitySelections={colorQuantitySelections}
          onChange={onChange}
        />
      );

      const navyButton = screen.getByRole('button', { name: /navy/i });
      await user.click(navyButton);

      expect(onChange).toHaveBeenCalled();
    });

    it('shows common colors by default and hides extended colors until toggled', () => {
      const onChange = vi.fn();
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories = { Tops: ['T-Shirt'] };

      render(
        <StepColorsQuantity
          selectedCategories={selectedCategories}
          selectedSubcategories={selectedSubcategories}
          colorQuantitySelections={{}}
          onChange={onChange}
        />
      );

      expect(screen.getByRole('button', { name: /navy/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /sky blue/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show all colors/i })).toBeInTheDocument();
    });

    it('shows extended colors after clicking show all colors toggle', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories = { Tops: ['T-Shirt'] };

      render(
        <StepColorsQuantity
          selectedCategories={selectedCategories}
          selectedSubcategories={selectedSubcategories}
          colorQuantitySelections={{}}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('button', { name: /show all colors/i }));

      expect(screen.getByRole('button', { name: /sky blue/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show common colors/i })).toBeInTheDocument();
    });
  });

  describe('StepReview', () => {
    it('renders generated items', () => {
      const onUpdateItems = vi.fn();
      const items: GeneratedWardrobeItem[] = [
        {
          id: 'temp-1',
          category: 'Tops',
          subcategory: 'T-Shirt',
          name: 'Navy T-Shirt',
          color: 'navy',
          formality_score: 2,
          season: ['All'],
          image_url: null,
          source: 'onboarding',
        },
      ];

      render(
        <StepReview
          items={items}
          onUpdateItems={onUpdateItems}
        />
      );

      // Should show item
      expect(screen.getByText(/navy t-shirt/i)).toBeInTheDocument();
      
      // Should show item count
      expect(screen.getByText(/1 item/i)).toBeInTheDocument();
    });

    it('does not show item cap toggle UI', () => {
      const onUpdateItems = vi.fn();
      const items: GeneratedWardrobeItem[] = [];

      render(
        <StepReview
          items={items}
          onUpdateItems={onUpdateItems}
        />
      );

      expect(screen.queryByRole('checkbox', { name: /limit to 50 items/i })).not.toBeInTheDocument();
    });
  });

  describe('StepSuccess', () => {
    it('renders success message with item count', () => {
      render(<StepSuccess totalItems={25} />);

      // Should show success message
      expect(screen.getByText(/success/i)).toBeInTheDocument();
      
      // Should show item count
      expect(screen.getByText(/25/)).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      const onViewWardrobe = vi.fn();
      const onGenerateOutfits = vi.fn();

      render(
        <StepSuccess
          totalItems={25}
          onViewWardrobe={onViewWardrobe}
          onGenerateOutfits={onGenerateOutfits}
        />
      );

      // Should show action buttons (use aria-label text)
      expect(screen.getByRole('button', { name: /view your wardrobe/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate outfit recommendations/i })).toBeInTheDocument();
    });

    it('calls onViewWardrobe when button is clicked', async () => {
      const user = userEvent.setup();
      const onViewWardrobe = vi.fn();
      const onGenerateOutfits = vi.fn();

      render(
        <StepSuccess
          totalItems={25}
          onViewWardrobe={onViewWardrobe}
          onGenerateOutfits={onGenerateOutfits}
        />
      );

      const viewButton = screen.getByRole('button', { name: /view.*wardrobe/i });
      await user.click(viewButton);

      expect(onViewWardrobe).toHaveBeenCalled();
    });
  });
});
