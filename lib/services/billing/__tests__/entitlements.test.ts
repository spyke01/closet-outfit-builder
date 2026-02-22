import { describe, expect, it } from 'vitest';
import { getUsageLimitForMetric, reserveLifetimeUsageCounterAtomic } from '@/lib/services/billing/entitlements';
import type { Entitlements } from '@/lib/services/billing/entitlements';

function createMockEntitlements(): Entitlements {
  return {
    effectivePlanCode: 'plus',
    effectiveInterval: 'month',
    billingState: 'active',
    isPaid: true,
    hasBillingAccount: true,
    plan: {
      code: 'plus',
      interval: 'month',
      name: 'Plus',
      priceCents: 499,
      limits: {
        wardrobe_items: 500,
        saved_outfits: 300,
        calendar_history_days: 365,
        calendar_forward_days: 365,
        active_trips: 10,
        max_trip_days: 30,
        ai_outfit_generations_monthly: 300,
        ai_image_generations_monthly: 30,
        ai_stylist_messages_monthly: 300,
        ai_stylist_vision_messages_monthly: 30,
        ai_today_ai_generations_monthly: 7,
        packing_items_per_trip: 250,
        ai_burst_per_hour: 5,
      },
      features: {
        analytics_basic: true,
        analytics_advanced: false,
        export_share: false,
        priority_support: false,
        ai_image_generation: true,
        sebastian_assistant: true,
      },
    },
    period: {
      start: new Date('2026-02-01T00:00:00.000Z'),
      end: new Date('2026-03-01T00:00:00.000Z'),
      key: '2026-02-01',
    },
    renewalAt: '2026-03-01T00:00:00.000Z',
    usage: {},
  };
}

describe('billing entitlements today ai limits', () => {
  it('resolves ai_today_ai_generations monthly limit', () => {
    const entitlements = createMockEntitlements();
    expect(getUsageLimitForMetric(entitlements, 'ai_today_ai_generations')).toBe(7);
  });

  it('uses lifetime period key helper for free trial counters', async () => {
    const rpc = async (_fn: string, args: Record<string, unknown>) => {
      expect(args.p_period_key).toBe('lifetime');
      return { data: [{ allowed: true, new_count: 1 }], error: null };
    };

    const mockSupabase = { rpc } as unknown as Parameters<typeof reserveLifetimeUsageCounterAtomic>[0];
    const result = await reserveLifetimeUsageCounterAtomic(mockSupabase, {
      userId: 'user-1',
      metricKey: 'ai_today_ai_trial_lifetime',
      limit: 1,
      incrementBy: 1,
    });

    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
  });
});
