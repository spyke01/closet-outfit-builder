import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveAppUrl } from '@/lib/services/billing/app-url';

const originalEnv = { ...process.env };

function restoreEnv() {
  process.env = { ...originalEnv };
}

describe('resolveAppUrl', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('returns allowlisted request origin when available', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://myaioutfit.com';

    const request = new NextRequest('https://myaioutfit.com/api/billing/checkout', {
      headers: {
        host: 'myaioutfit.com',
      },
    });

    expect(resolveAppUrl(request)).toBe('https://myaioutfit.com');
  });

  it('falls back to canonical configured origin when forwarded host is not allowlisted', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_APP_URL = 'https://myaioutfit.com';

    const request = new NextRequest('https://myaioutfit.com/api/billing/portal', {
      headers: {
        'x-forwarded-host': 'attacker.example',
        'x-forwarded-proto': 'https',
        host: 'myaioutfit.com',
      },
    });

    expect(resolveAppUrl(request)).toBe('https://myaioutfit.com');
  });

  it('allows non-allowlisted host fallback only in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.URL;
    delete process.env.DEPLOY_PRIME_URL;
    delete process.env.NETLIFY_URL;
    delete process.env.CORS_ALLOWED_ORIGINS;

    const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
      headers: {
        host: 'localhost:3000',
      },
    });

    expect(resolveAppUrl(request)).toBe('http://localhost:3000');
  });
});
