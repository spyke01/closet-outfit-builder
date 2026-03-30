import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import RootLayout from '../layout';

vi.mock('@/components/analytics/google-analytics', () => ({
  GoogleAnalytics: () => null,
}));

vi.mock('@/components/theme-dom-sync', () => ({
  ThemeDomSync: () => null,
}));

vi.mock('@/components/preload-initializer', () => ({
  PreloadInitializer: () => null,
}));

vi.mock('@/components/service-worker-registration', () => ({
  ServiceWorkerRegistration: () => null,
}));

vi.mock('@/lib/providers/query-provider', () => ({
  QueryProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/providers/monitoring-provider', () => ({
  MonitoringProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/providers/swr-config', () => ({
  SWRProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('RootLayout shell', () => {
  it('renders the ambient background and page shell wrappers', () => {
    const { container } = render(
      <RootLayout>
        <main>content</main>
      </RootLayout>,
    );

    expect(container.querySelector('.ambient-background')).toBeInTheDocument();
    expect(container.querySelector('.page-shell')).toBeInTheDocument();
  });
});
