import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePromoCode } from '../promo-code';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('../auth', () => ({
  verifySession: vi.fn(),
}));

vi.mock('@/lib/services/billing/plans', () => ({
  getPlanByCodeAndInterval: vi.fn().mockReturnValue({ priceCents: 499 }),
}));

import { createClient } from '@/lib/supabase/server';
import { verifySession } from '../auth';

const mockVerifySession = vi.mocked(verifySession);
const mockCreateClient = vi.mocked(createClient);

const mockUser = { id: 'user-abc', email: 'user@example.com' };

function buildSupabaseMock(promoCode: Record<string, unknown> | null, redemption: Record<string, unknown> | null = null) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'promotional_codes') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: promoCode, error: promoCode === null ? null : null }),
        };
      }
      if (table === 'code_redemptions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: redemption, error: null }),
        };
      }
      return {};
    }),
  };
}

const basePromoCode = {
  id: 'promo-1',
  discount_percent: 50,
  duration_months: 3,
  max_redemptions: 100,
  current_redemptions: 5,
  expires_at: null,
  revoked_at: null,
};

describe('validatePromoCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifySession.mockResolvedValue(mockUser as never);
  });

  it('returns valid result for a valid monthly code', async () => {
    mockCreateClient.mockResolvedValue(buildSupabaseMock(basePromoCode) as never);

    const result = await validatePromoCode('BETA50', 'plus', 'month');

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.discountPercent).toBe(50);
      expect(result.durationMonths).toBe(3);
      expect(result.fullPriceCents).toBe(499);
      expect(result.discountedPriceCents).toBe(250);
      expect(result.promoCodeDbId).toBe('promo-1');
    }
  });

  it('rejects yearly interval', async () => {
    const result = await validatePromoCode('BETA50', 'plus', 'year');

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('yearly_not_eligible');
    }
  });

  it('returns not_found when code does not exist', async () => {
    mockCreateClient.mockResolvedValue(buildSupabaseMock(null) as never);

    const result = await validatePromoCode('INVALID', 'plus', 'month');

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('not_found');
    }
  });

  it('returns expired when expiry is in the past', async () => {
    const expired = {
      ...basePromoCode,
      expires_at: '2020-01-01T00:00:00Z',
    };
    mockCreateClient.mockResolvedValue(buildSupabaseMock(expired) as never);

    const result = await validatePromoCode('BETA50', 'plus', 'month');

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('expired');
    }
  });

  it('returns exhausted when max redemptions reached', async () => {
    const exhausted = {
      ...basePromoCode,
      current_redemptions: 100,
      max_redemptions: 100,
    };
    mockCreateClient.mockResolvedValue(buildSupabaseMock(exhausted) as never);

    const result = await validatePromoCode('BETA50', 'plus', 'month');

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('exhausted');
    }
  });

  it('returns already_used when user has already redeemed this code', async () => {
    mockCreateClient.mockResolvedValue(
      buildSupabaseMock(basePromoCode, { id: 'redemption-1' }) as never
    );

    const result = await validatePromoCode('BETA50', 'plus', 'month');

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('already_used');
    }
  });

  it('returns not_found for revoked code', async () => {
    const revoked = {
      ...basePromoCode,
      revoked_at: '2024-01-01T00:00:00Z',
    };
    mockCreateClient.mockResolvedValue(buildSupabaseMock(revoked) as never);

    const result = await validatePromoCode('BETA50', 'plus', 'month');

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('not_found');
    }
  });
});
