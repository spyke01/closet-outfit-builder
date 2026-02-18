import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { TopBar } from '../top-bar';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/outfits',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

vi.mock('@/lib/hooks/use-user-preferences', () => ({
  useUserPreferences: () => ({ data: { theme: 'light' } }),
  useUpdateUserPreferences: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/lib/hooks/use-intelligent-preloading', () => ({
  useNavigationPreloading: () => ({ getNavigationProps: () => ({}) }),
}));

vi.mock('@/lib/hooks/use-billing-entitlements', () => ({
  useBillingEntitlements: () => ({
    entitlements: { effectivePlanCode: 'plus' },
    loading: false,
  }),
}));

vi.mock('../weather-widget', () => ({
  WeatherWidget: () => <div data-testid="weather-widget">weather</div>,
}));

vi.mock('../logo', () => ({
  Logo: () => <div>logo</div>,
}));

vi.mock('../sebastian-chat-launcher', () => ({
  SebastianChatLauncher: ({ variant }: { variant?: string }) => (
    <div data-testid="sebastian-launcher">{variant || 'inline'}</div>
  ),
}));

describe('TopBar', () => {
  const user = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user@example.com',
    user_metadata: {},
    app_metadata: {},
  };

  it('uses aria-current and border indicator style for active nav item', () => {
    render(<TopBar user={user} />);

    const outfitsLink = screen.getByRole('link', { name: "View outfits" });
    expect(outfitsLink).toHaveAttribute('aria-current', 'page');
    expect(outfitsLink.className).toContain('border-[var(--app-nav-border-active)]');
    expect(outfitsLink.className).toContain('font-semibold');
    expect(outfitsLink.className).toContain('cursor-pointer');
    expect(outfitsLink.className).not.toContain('bg-primary');
  });

  it('renders floating Sebastian launcher for entitled users', () => {
    render(<TopBar user={user} />);
    expect(screen.getByTestId('sebastian-launcher')).toHaveTextContent('floating');
  });
});
