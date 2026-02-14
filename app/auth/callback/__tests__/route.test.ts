import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';

const {
  exchangeCodeForSessionMock,
  hasActiveWardrobeItemsMock,
  getPostAuthRouteMock,
} = vi.hoisted(() => ({
  exchangeCodeForSessionMock: vi.fn(),
  hasActiveWardrobeItemsMock: vi.fn(),
  getPostAuthRouteMock: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
    },
  }),
}));

vi.mock('@/lib/server/wardrobe-readiness', () => ({
  hasActiveWardrobeItems: hasActiveWardrobeItemsMock,
  getPostAuthRoute: getPostAuthRouteMock,
}));

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
    exchangeCodeForSessionMock.mockResolvedValue({
      data: {
        session: { access_token: 'token' },
        user: { id: 'user-1' },
      },
      error: null,
    });
  });

  it('redirects empty-wardrobe users to onboarding', async () => {
    hasActiveWardrobeItemsMock.mockResolvedValue(false);
    getPostAuthRouteMock.mockReturnValue('/onboarding');

    const request = new NextRequest('https://example.com/auth/callback?code=abc&next=%2Fwardrobe');
    const response = await GET(request);

    expect(response.headers.get('location')).toBe('https://example.com/onboarding');
  });

  it('redirects users with items to today', async () => {
    hasActiveWardrobeItemsMock.mockResolvedValue(true);
    getPostAuthRouteMock.mockReturnValue('/today');

    const request = new NextRequest('https://example.com/auth/callback?code=abc');
    const response = await GET(request);

    expect(response.headers.get('location')).toBe('https://example.com/today');
  });
});
