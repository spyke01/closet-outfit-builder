import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const {
  getUserMock,
  hasBillingAdminRoleMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  hasBillingAdminRoleMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: getUserMock,
    },
  }),
}));

vi.mock('@/lib/services/billing/roles', () => ({
  hasBillingAdminRole: hasBillingAdminRoleMock,
}));

vi.mock('@/components/top-bar-wrapper', () => ({
  TopBarWrapper: () => <div data-testid="top-bar" />,
}));

vi.mock('@/components/auth-boundary', () => ({
  AuthBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/onboarding/onboarding-wizard', () => ({
  OnboardingWizard: ({
    forceMode,
    forceFreshStart,
  }: {
    forceMode?: boolean;
    forceFreshStart?: boolean;
  }) => (
    <div
      data-testid="onboarding-wizard"
      data-force-mode={forceMode ? '1' : '0'}
      data-force-fresh={forceFreshStart ? '1' : '0'}
    />
  ),
}));

import OnboardingPage from '../page';

describe('OnboardingPage force mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  it('enables force mode for billing admins', async () => {
    hasBillingAdminRoleMock.mockResolvedValue(true);

    const page = await OnboardingPage({
      searchParams: Promise.resolve({ force: '1' }),
    });
    render(page);

    const wizard = screen.getByTestId('onboarding-wizard');
    expect(wizard).toHaveAttribute('data-force-mode', '1');
    expect(wizard).toHaveAttribute('data-force-fresh', '1');
  });

  it('ignores force mode for non-admin users', async () => {
    hasBillingAdminRoleMock.mockResolvedValue(false);

    const page = await OnboardingPage({
      searchParams: Promise.resolve({ force: 'true' }),
    });
    render(page);

    const wizard = screen.getByTestId('onboarding-wizard');
    expect(wizard).toHaveAttribute('data-force-mode', '0');
    expect(wizard).toHaveAttribute('data-force-fresh', '0');
  });
});
