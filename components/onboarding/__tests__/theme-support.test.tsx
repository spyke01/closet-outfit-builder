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

  it('should have dark mode classes on all interactive elements', () => {
    renderWizard();

    // Check buttons have dark mode classes
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      const classes = button.className;
      // Verify dark mode classes are present
      expect(classes).toMatch(/dark:/);
    });
  });

  it('should have dark mode classes on text elements', () => {
    renderWizard();

    // Check heading
    const heading = screen.getByRole('heading', { name: /tell us about your style/i });
    expect(heading.className).toContain('text-foreground');
  });

  it('should have dark mode classes on navigation elements', () => {
    renderWizard();

    // Check navigation
    const nav = screen.getByRole('navigation', { name: /onboarding progress/i });
    expect(nav).toBeInTheDocument();

    // Verify step indicators have dark mode support
    const stepIndicators = nav.querySelectorAll('[role="img"]');
    stepIndicators.forEach((indicator) => {
      expect(indicator.className).toMatch(/dark:/);
    });
  });

  it('should have dark mode classes on alert messages', () => {
    renderWizard();

    // Check alert message
    const alert = screen.getByRole('alert');
    expect(alert.className).toMatch(/dark:/);
  });

  it('should use theme-aware color classes', () => {
    renderWizard();

    // Verify buttons use theme-aware colors
    const workButton = screen.getByRole('button', { name: /work.*professional/i });
    
    // Check for dark mode border and background classes
    expect(workButton.className).toContain('dark:border-gray-600');
    expect(workButton.className).toContain('dark:bg-gray-800');
  });

  it('should have consistent theme classes across all steps', () => {
    renderWizard();

    // Get all elements with dark mode classes
    const container = screen.getByRole('main');
    const html = container.innerHTML;

    // Verify dark mode classes are consistently used
    expect(html).toContain('dark:');
    
    // Check for common theme patterns
    expect(html).toContain('text-foreground');
    expect(html).toContain('text-muted-foreground');
  });

  it('should have proper contrast in both light and dark modes', () => {
    renderWizard();

    // Verify selected state has proper contrast classes
    const buttons = screen.getAllByRole('button');
    
    buttons.forEach((button) => {
      const classes = button.className;
      
      // If button has selected state classes, verify dark mode equivalents
      if (classes.includes('bg-blue-50')) {
        expect(classes).toContain('dark:bg-blue-950');
      }
      
      if (classes.includes('border-blue-600')) {
        expect(classes).toContain('dark:border-blue-500');
      }
    });
  });
});
