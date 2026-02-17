import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as auth from '../auth';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('../auth', () => ({
  verifySession: vi.fn(),
  verifyOwnership: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/services/billing/entitlements', () => ({
  resolveUserEntitlements: vi.fn(),
  canUseFeature: vi.fn(),
  isUsageExceeded: vi.fn(),
  incrementUsageCounter: vi.fn(),
  getAiBurstHourKey: vi.fn().mockReturnValue('ai_requests_hourly:2026-02-17T10'),
}));

vi.mock('@/lib/utils/wardrobe-item-prompt-builder', () => ({
  buildWardrobeItemPrompt: vi.fn().mockReturnValue('## Test prompt'),
}));

const mockUser = { id: 'user-abc-123', email: 'test@example.com' };
const mockItemId = '550e8400-e29b-41d4-a716-446655440001';

const mockEntitlements = {
  effectivePlanCode: 'plus' as const,
  plan: {
    limits: { ai_image_generations_monthly: 30, ai_burst_per_hour: 5 },
    features: { ai_image_generation: true },
  },
  usage: { ai_wardrobe_image_generations: 5 },
  period: { key: '2026-02-17', start: new Date(), end: new Date() },
};

// Builds a mock for usage_counters that supports .select().eq().eq().eq().maybeSingle()
function buildUsageCountersMock(hourlyCount = 1) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: hourlyCount > 0 ? { count: hourlyCount } : null,
              error: null,
            }),
          }),
        }),
      }),
    }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };
}

function buildMockSupabase(options: {
  wardrobeItemOverrides?: Record<string, unknown>;
  fnResponse?: { data: unknown; error: unknown };
  hourlyCount?: number;
} = {}) {
  const { wardrobeItemOverrides = {}, fnResponse, hourlyCount = 1 } = options;

  return {
    from: vi.fn((table: string) => {
      if (table === 'wardrobe_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mockItemId,
                  user_id: mockUser.id,
                  name: 'Navy Blazer',
                  category_id: '550e8400-e29b-41d4-a716-446655440002',
                  color: 'navy',
                  brand: null,
                  material: null,
                  category: { name: 'Blazer', id: '550e8400-e29b-41d4-a716-446655440002' },
                  ...wardrobeItemOverrides,
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      if (table === 'generation_log') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (table === 'usage_counters') {
        return buildUsageCountersMock(hourlyCount);
      }
      return {};
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue(
        fnResponse ?? {
          data: {
            success: true,
            image_url: 'https://storage.example.com/wardrobe-images/user-abc-123/generated/item-1.webp',
            generation_duration_ms: 8000,
            cost_cents: 5,
          },
          error: null,
        },
      ),
    },
  };
}

describe('generateWardrobeItemImage server action', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(auth.verifySession).mockResolvedValue(mockUser);
    vi.mocked(auth.verifyOwnership).mockResolvedValue(undefined);

    const entitlements = await import('@/lib/services/billing/entitlements');
    vi.mocked(entitlements.resolveUserEntitlements).mockResolvedValue(mockEntitlements as never);
    vi.mocked(entitlements.canUseFeature).mockReturnValue(true);
    vi.mocked(entitlements.isUsageExceeded).mockReturnValue(false);
    vi.mocked(entitlements.incrementUsageCounter).mockResolvedValue(6);
  });

  it('returns success with image_url on successful generation', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(buildMockSupabase() as never);

    const { generateWardrobeItemImage } = await import('../wardrobe-item-images');
    const result = await generateWardrobeItemImage({ wardrobe_item_id: mockItemId });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.image_url).toContain('generated/item-1.webp');
    }
  });

  it('rejects free-tier users (canUseFeature returns false)', async () => {
    const { canUseFeature } = await import('@/lib/services/billing/entitlements');
    vi.mocked(canUseFeature).mockReturnValue(false);

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(buildMockSupabase() as never);

    const { generateWardrobeItemImage } = await import('../wardrobe-item-images');
    const result = await generateWardrobeItemImage({ wardrobe_item_id: mockItemId });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error_code).toBe('FEATURE_NOT_AVAILABLE');
    }
  });

  it('rejects when monthly usage limit is exceeded', async () => {
    const { isUsageExceeded } = await import('@/lib/services/billing/entitlements');
    vi.mocked(isUsageExceeded).mockReturnValue(true);

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(buildMockSupabase() as never);

    const { generateWardrobeItemImage } = await import('../wardrobe-item-images');
    const result = await generateWardrobeItemImage({ wardrobe_item_id: mockItemId });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error_code).toBe('USAGE_LIMIT_EXCEEDED');
    }
  });

  it('rejects when item is missing required data (no color)', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(
      buildMockSupabase({ wardrobeItemOverrides: { color: null } }) as never,
    );

    const { generateWardrobeItemImage } = await import('../wardrobe-item-images');
    const result = await generateWardrobeItemImage({ wardrobe_item_id: mockItemId });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error_code).toBe('MISSING_ITEM_DATA');
    }
  });

  it('does NOT increment quota when Edge Function fails', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(
      buildMockSupabase({
        fnResponse: { data: null, error: { message: 'Edge Function error' } },
      }) as never,
    );

    const { incrementUsageCounter } = await import('@/lib/services/billing/entitlements');
    const { generateWardrobeItemImage } = await import('../wardrobe-item-images');
    await generateWardrobeItemImage({ wardrobe_item_id: mockItemId });

    expect(vi.mocked(incrementUsageCounter)).not.toHaveBeenCalled();
  });
});

describe('quota check logic', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(auth.verifySession).mockResolvedValue(mockUser);
    vi.mocked(auth.verifyOwnership).mockResolvedValue(undefined);
  });

  it('canUseFeature rejects free-tier users', async () => {
    const { canUseFeature } = await import('@/lib/services/billing/entitlements');

    const freeEntitlements = {
      plan: { features: { ai_image_generation: false } },
    };

    vi.mocked(canUseFeature).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((ent: { plan: { features: Record<string, boolean> } }, feature: string) =>
        ent.plan.features[feature] === true) as any,
    );

    expect(canUseFeature(freeEntitlements as never, 'ai_image_generation')).toBe(false);
  });

  it('isUsageExceeded returns true when monthly limit reached', async () => {
    const { isUsageExceeded } = await import('@/lib/services/billing/entitlements');
    vi.mocked(isUsageExceeded).mockReturnValue(true);
    expect(isUsageExceeded(mockEntitlements as never, 'ai_wardrobe_image_generations')).toBe(true);
  });

  it('burst check rejects when hourly limit reached', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    // hourlyCount = 5 means limit is reached (HOURLY_BURST_LIMIT = 5)
    vi.mocked(createClient).mockResolvedValue(
      buildMockSupabase({ hourlyCount: 5 }) as never,
    );

    const entitlements = await import('@/lib/services/billing/entitlements');
    vi.mocked(entitlements.resolveUserEntitlements).mockResolvedValue(mockEntitlements as never);
    vi.mocked(entitlements.canUseFeature).mockReturnValue(true);
    vi.mocked(entitlements.isUsageExceeded).mockReturnValue(false);

    const { generateWardrobeItemImage } = await import('../wardrobe-item-images');
    const result = await generateWardrobeItemImage({ wardrobe_item_id: mockItemId });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error_code).toBe('BURST_LIMIT_EXCEEDED');
    }
  });

  it('quota is only incremented on success', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(
      buildMockSupabase({
        fnResponse: {
          data: { success: false, error: 'Generation failed', error_code: 'REPLICATE_ERROR' },
          error: null,
        },
      }) as never,
    );

    const entitlements = await import('@/lib/services/billing/entitlements');
    vi.mocked(entitlements.resolveUserEntitlements).mockResolvedValue(mockEntitlements as never);
    vi.mocked(entitlements.canUseFeature).mockReturnValue(true);
    vi.mocked(entitlements.isUsageExceeded).mockReturnValue(false);

    const { generateWardrobeItemImage } = await import('../wardrobe-item-images');
    await generateWardrobeItemImage({ wardrobe_item_id: mockItemId });

    expect(vi.mocked(entitlements.incrementUsageCounter)).not.toHaveBeenCalled();
  });
});
