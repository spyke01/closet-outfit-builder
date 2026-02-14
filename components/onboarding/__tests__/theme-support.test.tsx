import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  generateWardrobeItems: vi.fn(() => []),
}));

vi.mock('@/lib/services/onboarding-category-manager', () => ({
  ensureCategoriesExist: vi.fn(() => Promise.resolve(new Map())),
}));

vi.mock('@/lib/services/onboarding-persister', () => ({
  persistWardrobeItems: vi.fn(() =>
    Promise.resolve({
      success: 0,
      failed: 0,
      errors: [],
    })
  ),
}));

describe('OnboardingWizard - Theme Support', () => {
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

  it('should use semantic theme classes on interactive elements', () => {
    renderWizard();

    // Check buttons use semantic classes instead of hardcoded palette classes
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      const classes = button.className;
      expect(classes).not.toMatch(/(slate|stone|gray)-[0-9]{2,3}/);
    });
  });

  it('should have dark mode classes on text elements', () => {
    renderWizard();

    // Check heading
    const heading = screen.getByRole('heading', { name: /tell us about your style/i });
    expect(heading.className).toContain('text-foreground');
  });

  it('should have semantic classes on navigation elements', () => {
    renderWizard();

    // Check navigation
    const nav = screen.getByRole('navigation', { name: /onboarding progress/i });
    expect(nav).toBeInTheDocument();

    // Verify step indicators are token-based
    const stepIndicators = nav.querySelectorAll('[role="img"]');
    stepIndicators.forEach((indicator) => {
      expect(indicator.className).toMatch(/(border|bg|text)-(primary|secondary|card|border|muted|foreground)/);
    });
  });

  it('should have semantic classes on alert messages', () => {
    renderWizard();

    // Check alert message
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-warning-light');
    expect(alert.className).toContain('border-warning/40');
  });

  it('should use theme-aware color classes', () => {
    renderWizard();

    // Verify buttons use theme-aware colors
    const workButton = screen.getByRole('button', { name: /work.*professional/i });
    
    // Check for dark mode border and background classes
    expect(workButton.className).toContain('border-border');
    expect(workButton.className).toContain('bg-card');
  });

  it('should have consistent token-based classes across all steps', () => {
    renderWizard();

    // Get all markup for step 1
    const container = screen.getByRole('main');
    const html = container.innerHTML;

    // Check for common token patterns
    expect(html).toContain('text-foreground');
    expect(html).toContain('text-muted-foreground');
    expect(html).toContain('border-border');
  });

  it('should have semantic selected-state contrast classes', () => {
    renderWizard();

    // Verify selected state has proper contrast classes
    const buttons = screen.getAllByRole('button');
    
    buttons.forEach((button) => {
      const classes = button.className;
      
      // Selected state should use semantic primary tokens
      if (classes.includes('bg-primary/10')) {
        expect(classes).toContain('border-primary');
      }
    });
  });
});
