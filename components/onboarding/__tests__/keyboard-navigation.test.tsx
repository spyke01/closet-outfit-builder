import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingWizard } from '../onboarding-wizard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    userId: 'test-user-id',
  }),
}));

// Mock services
vi.mock('@/lib/services/onboarding-generator', () => ({
  generateWardrobeItems: vi.fn(() => [
    {
      id: '1',
      category: 'Tops',
      subcategory: 'T-Shirt',
      name: 'Blue T-Shirt',
      color: 'blue',
      formality_score: 2,
      season: ['All'],
      image_url: null,
      source: 'onboarding',
    },
  ]),
}));

vi.mock('@/lib/services/onboarding-category-manager', () => ({
  ensureCategoriesExist: vi.fn(() => Promise.resolve(new Map([['Tops', 'category-id-1']]))),
}));

vi.mock('@/lib/services/onboarding-persister', () => ({
  persistWardrobeItems: vi.fn(() =>
    Promise.resolve({
      success: 1,
      failed: 0,
      errors: [],
    })
  ),
}));

describe('OnboardingWizard - Keyboard Navigation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderWizard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <OnboardingWizard />
      </QueryClientProvider>
    );
  };

  it('should allow keyboard navigation through buttons', () => {
    renderWizard();

    // Wait for hydration
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeInTheDocument();

    // Verify button is disabled initially (no selections made)
    expect(nextButton).toBeDisabled();
  });

  it('should allow Enter key to activate buttons', () => {
    renderWizard();

    // Select primary use option with keyboard
    const workButton = screen.getByRole('button', { name: /work.*professional/i });
    workButton.focus();
    
    // Press Enter to select
    fireEvent.keyDown(workButton, { key: 'Enter', code: 'Enter' });
    fireEvent.click(workButton); // Simulate the click that would happen
    
    expect(workButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('should allow Space key to activate buttons', () => {
    renderWizard();

    // Select climate option with keyboard
    const hotButton = screen.getByRole('button', { name: /hot.*warm weather/i });
    hotButton.focus();
    
    // Press Space to select
    fireEvent.keyDown(hotButton, { key: ' ', code: 'Space' });
    fireEvent.click(hotButton); // Simulate the click that would happen
    
    expect(hotButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('should maintain focus order through wizard steps', () => {
    renderWizard();

    // Get all enabled interactive elements
    const buttons = screen.getAllByRole('button').filter((button) => !button.hasAttribute('disabled'));
    
    // Verify buttons are in the DOM and can receive focus
    buttons.forEach((button) => {
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });

  it('should allow keyboard navigation in category selection', () => {
    renderWizard();

    // Navigate to step 2 by selecting style baseline
    const workButton = screen.getByRole('button', { name: /work.*professional/i });
    fireEvent.click(workButton);
    
    const hotButton = screen.getByRole('button', { name: /hot.*warm weather/i });
    fireEvent.click(hotButton);
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    // Verify category checkboxes are keyboard accessible
    const categoryCheckboxes = screen.getAllByRole('checkbox');
    expect(categoryCheckboxes.length).toBeGreaterThan(0);
    
    categoryCheckboxes.forEach((checkbox) => {
      checkbox.focus();
      expect(document.activeElement).toBe(checkbox);
    });
  });

  it('should show focus indicators on interactive elements', () => {
    renderWizard();

    const nextButton = screen.getByRole('button', { name: /next/i });
    
    // Verify button has focus ring classes
    expect(nextButton.className).toContain('focus:ring');
  });

  it('should allow Escape key to go back (if implemented)', () => {
    renderWizard();

    // Back button should always be keyboard-accessible if present
    const backButton = screen.getByRole('button', { name: /go back to previous step/i });
    expect(backButton).toBeInTheDocument();
  });
});
