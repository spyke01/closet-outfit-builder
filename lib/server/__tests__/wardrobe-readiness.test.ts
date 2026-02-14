import { describe, expect, it, vi } from 'vitest';
import { getPostAuthRoute, hasActiveWardrobeItems } from '../wardrobe-readiness';

describe('wardrobe-readiness', () => {
  it('returns true when at least one active item exists', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ id: 'item-1' }], error: null });
    const eq = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ limit }) });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as unknown as Parameters<typeof hasActiveWardrobeItems>[0];

    await expect(hasActiveWardrobeItems(supabase, 'user-1')).resolves.toBe(true);
  });

  it('returns false when no active items exist', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqActive = vi.fn().mockReturnValue({ limit });
    const eqUser = vi.fn().mockReturnValue({ eq: eqActive });
    const select = vi.fn().mockReturnValue({ eq: eqUser });
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as unknown as Parameters<typeof hasActiveWardrobeItems>[0];

    await expect(hasActiveWardrobeItems(supabase, 'user-1')).resolves.toBe(false);
  });

  it('fails open on query error', async () => {
    const limit = vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } });
    const eqActive = vi.fn().mockReturnValue({ limit });
    const eqUser = vi.fn().mockReturnValue({ eq: eqActive });
    const select = vi.fn().mockReturnValue({ eq: eqUser });
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as unknown as Parameters<typeof hasActiveWardrobeItems>[0];

    await expect(hasActiveWardrobeItems(supabase, 'user-1')).resolves.toBe(true);
  });

  it('routes empty users to onboarding', () => {
    expect(getPostAuthRoute({ hasItems: false, requestedNext: '/wardrobe' })).toBe('/onboarding');
  });

  it('routes users with items to safe requested path', () => {
    expect(getPostAuthRoute({ hasItems: true, requestedNext: '/wardrobe?tab=all' })).toBe('/wardrobe?tab=all');
  });

  it('routes users with items to /today by default', () => {
    expect(getPostAuthRoute({ hasItems: true, requestedNext: null })).toBe('/today');
  });

  it('rejects external redirect values', () => {
    expect(getPostAuthRoute({ hasItems: true, requestedNext: 'https://evil.test' })).toBe('/today');
  });
});

