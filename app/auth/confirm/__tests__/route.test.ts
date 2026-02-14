import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  verifyOtpMock,
  redirectMock,
  hasActiveWardrobeItemsMock,
  getPostAuthRouteMock,
} = vi.hoisted(() => ({
  verifyOtpMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  hasActiveWardrobeItemsMock: vi.fn(),
  getPostAuthRouteMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      verifyOtp: verifyOtpMock,
    },
  }),
}));

vi.mock('@/lib/server/wardrobe-readiness', () => ({
  hasActiveWardrobeItems: hasActiveWardrobeItemsMock,
  getPostAuthRoute: getPostAuthRouteMock,
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

import { GET } from '../route';

describe('GET /auth/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyOtpMock.mockResolvedValue({
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

    const request = new NextRequest('https://example.com/auth/confirm?token_hash=abc&type=signup');

    await expect(GET(request)).rejects.toThrow('REDIRECT:/onboarding');
  });

  it('redirects users with items to today', async () => {
    hasActiveWardrobeItemsMock.mockResolvedValue(true);
    getPostAuthRouteMock.mockReturnValue('/today');

    const request = new NextRequest('https://example.com/auth/confirm?token_hash=abc&type=signup');

    await expect(GET(request)).rejects.toThrow('REDIRECT:/today');
  });
});
