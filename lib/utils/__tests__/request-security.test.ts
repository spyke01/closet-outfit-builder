import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { requireSameOriginWithOptions } from '@/lib/utils/request-security';

describe('requireSameOriginWithOptions', () => {
  it('allows same-origin POST', () => {
    const request = new NextRequest('https://example.com/api/foo', {
      method: 'POST',
      headers: {
        origin: 'https://example.com',
        'sec-fetch-site': 'same-origin',
      },
    });

    const result = requireSameOriginWithOptions(request, { mode: 'enforce' });
    expect(result).toBeNull();
  });

  it('blocks cross-site POST in enforce mode', async () => {
    const request = new NextRequest('https://example.com/api/foo', {
      method: 'POST',
      headers: {
        origin: 'https://evil.example',
        'sec-fetch-site': 'cross-site',
      },
    });

    const result = requireSameOriginWithOptions(request, { mode: 'enforce' });
    expect(result?.status).toBe(403);
  });

  it('does not block in report mode', () => {
    const request = new NextRequest('https://example.com/api/foo', {
      method: 'POST',
      headers: {
        origin: 'https://evil.example',
        'sec-fetch-site': 'cross-site',
      },
    });

    const result = requireSameOriginWithOptions(request, { mode: 'report' });
    expect(result).toBeNull();
  });

  it('skips GET requests', () => {
    const request = new NextRequest('https://example.com/api/foo', {
      method: 'GET',
      headers: {
        origin: 'https://evil.example',
        'sec-fetch-site': 'cross-site',
      },
    });

    const result = requireSameOriginWithOptions(request, { mode: 'enforce' });
    expect(result).toBeNull();
  });
});

