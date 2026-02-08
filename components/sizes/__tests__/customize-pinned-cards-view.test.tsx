/**
 * Unit Tests: CustomizePinnedCardsView Component
 * 
 * Tests:
 * - Pin/unpin toggles
 * - Drag-and-drop reordering
 * - Display mode selection
 * - Responsive presentation
 * 
 * Requirements: 8.2-8.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomizePinnedCardsView } from '../customize-pinned-cards-view';
import type { SizeCategory, PinnedPreference } from '@/lib/types/sizes';

// Mock the hooks
const mockCategories: SizeCategory[] = [
  {
    id: 'cat-1',
    user_id: 'user-1',
    name: 'Tops',
    icon: undefined,
    supported_formats: ['letter'],
    is_system_category: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    user_id: 'user-1',
    name: 'Bottoms',
    icon: undefined,
    supported_formats: ['numeric'],
    is_system_category: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cat-3',
    user_id: 'user-1',
    name: 'Footwear',
    icon: undefined,
    supported_formats: ['numeric'],
    is_system_category: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockPinnedPreferences: PinnedPreference[] = [
  {
    id: 'pin-1',
    user_id: 'user-1',
    category_id: 'cat-1',
    display_order: 0,
    display_mode: 'standard',
    preferred_brand_id: undefined,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'pin-2',
    user_id: 'user-1',
    category_id: 'cat-2',
    display_order: 1,
    display_mode: 'dual',
    preferred_brand_id: undefined,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockUpdatePinnedPreferences = vi.fn();

vi.mock('@/lib/hooks/use-size-categories', () => ({
  useSizeCategories: () => ({
    data: mockCategories,
    isLoading: false,
    error: null,
  }),
  usePinnedPreferences: () => ({
    data: mockPinnedPreferences,
    isLoading: false,
    error: null,
  }),
  useUpdatePinnedPreferences: () => ({
    mutateAsync: mockUpdatePinnedPreferences,
    isPending: false,
  }),
}));

// Helper to render with QueryClient
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('CustomizePinnedCardsView', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={false} onClose={mockOnClose} />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Customize Pinned Cards')).toBeInTheDocument();
    });

    it('should render pinned categories section', () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByText('Pinned Categories')).toBeInTheDocument();
      expect(screen.getByText('Tops')).toBeInTheDocument();
      expect(screen.getByText('Bottoms')).toBeInTheDocument();
    });

    it('should render unpinned categories section', () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByText('Other Categories')).toBeInTheDocument();
      expect(screen.getByText('Footwear')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });
  });

  describe('Pin/Unpin Toggles (Requirement 8.4)', () => {
    it('should show pinned categories with toggle checked', () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      // Find the switch for Tops (pinned)
      const topsSwitch = screen.getAllByRole('switch').find(
        (sw) => sw.getAttribute('aria-label')?.includes('Tops')
      );
      
      expect(topsSwitch).toBeInTheDocument();
      expect(topsSwitch).toHaveAttribute('data-state', 'checked');
    });

    it('should show unpinned categories with toggle unchecked', () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      // Find the switch for Footwear (unpinned)
      const footwearSwitch = screen.getAllByRole('switch').find(
        (sw) => sw.getAttribute('aria-label')?.includes('Footwear')
      );
      
      expect(footwearSwitch).toBeInTheDocument();
      expect(footwearSwitch).toHaveAttribute('data-state', 'unchecked');
    });

    it('should toggle pin status when switch is clicked', async () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      // Click to unpin Tops
      const topsSwitch = screen.getAllByRole('switch').find(
        (sw) => sw.getAttribute('aria-label')?.includes('Unpin Tops')
      );
      
      if (topsSwitch) {
        fireEvent.click(topsSwitch);
      }

      // Tops should move to unpinned section
      await waitFor(() => {
        expect(screen.getByText('All Categories')).toBeInTheDocument();
      });
    });

    it('should toggle unpin status when switch is clicked', async () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      // Click to pin Footwear
      const footwearSwitch = screen.getAllByRole('switch').find(
        (sw) => sw.getAttribute('aria-label')?.includes('Pin Footwear')
      );
      
      if (footwearSwitch) {
        fireEvent.click(footwearSwitch);
      }

      // Footwear should move to pinned section
      await waitFor(() => {
        const pinnedSection = screen.getByText('Pinned Categories').parentElement;
        expect(pinnedSection).toHaveTextContent('Footwear');
      });
    });
  });

  describe('Display Mode Selection (Requirement 8.4)', () => {
    it('should render display mode dropdown for each pinned category', () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const displayModeSelects = screen.getAllByLabelText(/display mode/i);
      expect(displayModeSelects.length).toBeGreaterThanOrEqual(2); // At least 2 pinned categories
    });

    it('should show current display mode as selected', () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const displayModeSelects = screen.getAllByLabelText(/display mode/i);
      
      // First pinned category (Tops) has 'standard' mode
      expect(displayModeSelects[0]).toHaveValue('standard');
      
      // Second pinned category (Bottoms) has 'dual' mode
      expect(displayModeSelects[1]).toHaveValue('dual');
    });

    it('should change display mode when dropdown is changed', async () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const displayModeSelects = screen.getAllByLabelText(/display mode/i);
      
      // Change first category to 'dual' mode
      fireEvent.change(displayModeSelects[0], { target: { value: 'dual' } });

      await waitFor(() => {
        expect(displayModeSelects[0]).toHaveValue('dual');
      });
    });

    it('should have all display mode options available', () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const displayModeSelect = screen.getAllByLabelText(/display mode/i)[0];
      const options = Array.from(displayModeSelect.querySelectorAll('option'));
      
      expect(options).toHaveLength(3);
      expect(options[0]).toHaveValue('standard');
      expect(options[1]).toHaveValue('dual');
      expect(options[2]).toHaveValue('preferred-brand');
    });
  });

  describe('Drag-and-Drop Reordering (Requirement 8.4)', () => {
    it('should render drag handles for pinned categories', () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const dragHandles = screen.getAllByLabelText(/reorder/i);
      expect(dragHandles.length).toBeGreaterThanOrEqual(2);
    });

    it('should have draggable attribute on pinned category containers', () => {
      const { container } = renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const draggableElements = container.querySelectorAll('[draggable="true"]');
      expect(draggableElements.length).toBeGreaterThanOrEqual(2);
    });

    it('should support keyboard navigation for reordering', () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const dragHandles = screen.getAllByLabelText(/reorder/i);
      const firstHandle = dragHandles[0];

      // Should be focusable
      expect(firstHandle).toHaveAttribute('tabIndex', '0');
      
      // Should have role button
      expect(firstHandle).toHaveAttribute('role', 'button');
    });
  });

  describe('Responsive Presentation (Requirements 8.2, 8.3)', () => {
    it('should render as full-screen on mobile (default)', () => {
      const { container } = renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toHaveClass('fixed', 'inset-0');
    });

    it('should have side drawer classes for tablet+', () => {
      const { container } = renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const dialog = container.querySelector('[role="dialog"]');
      // Check for responsive classes (md: prefix for tablet+)
      expect(dialog?.className).toContain('md:');
    });

    it('should render backdrop', () => {
      const { container } = renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('Save and Cancel Actions', () => {
    it('should call onClose when cancel button is clicked', async () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onClose when backdrop is clicked', async () => {
      const { container } = renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onClose when close button is clicked', async () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const closeButton = screen.getByRole('button', { name: /close customize view/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should call updatePinnedPreferences when save button is clicked', async () => {
      mockUpdatePinnedPreferences.mockResolvedValue([]);

      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdatePinnedPreferences).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onClose after successful save', async () => {
      mockUpdatePinnedPreferences.mockResolvedValue([]);

      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should preserve changes when saving', async () => {
      mockUpdatePinnedPreferences.mockResolvedValue([]);

      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      // Change display mode
      const displayModeSelects = screen.getAllByLabelText(/display mode/i);
      fireEvent.change(displayModeSelects[0], { target: { value: 'preferred-brand' } });

      // Save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdatePinnedPreferences).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              category_id: 'cat-1',
              display_mode: 'preferred-brand',
            }),
          ])
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'customize-pinned-title');
    });

    it('should have minimum 44x44px touch targets', () => {
      const { container } = renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        const style = window.getComputedStyle(button);
        const minHeight = style.minHeight || style.height;
        const minWidth = style.minWidth || style.width;
        
        // Check if either inline style or computed style meets requirements
        const hasMinHeight = 
          button.style.minHeight === '44px' || 
          minHeight === '44px' ||
          parseInt(minHeight) >= 44;
        
        expect(hasMinHeight).toBe(true);
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no categories exist', () => {
      vi.mock('@/lib/hooks/use-size-categories', () => ({
        useSizeCategories: () => ({
          data: [],
          isLoading: false,
          error: null,
        }),
        usePinnedPreferences: () => ({
          data: [],
          isLoading: false,
          error: null,
        }),
        useUpdatePinnedPreferences: () => ({
          mutateAsync: mockUpdatePinnedPreferences,
          isPending: false,
        }),
      }));

      renderWithQueryClient(
        <CustomizePinnedCardsView isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByText(/no categories available/i)).toBeInTheDocument();
    });
  });
});
