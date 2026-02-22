import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/billing/entitlements', () => ({
  resolveUserEntitlements: vi.fn(),
  getUsageLimitForMetric: vi.fn(() => 7),
  reserveUsageCounterAtomic: vi.fn(),
  reserveLifetimeUsageCounterAtomic: vi.fn(),
}));

vi.mock('@/lib/services/assistant/providers/replicate', () => ({
  generateAssistantReply: vi.fn(),
  resolveReplicateModelConfig: vi.fn(() => ({
    defaultModel: 'openai/gpt-5-mini',
    fallbackModel: 'openai/gpt-4o-mini',
  })),
}));

import { createClient } from '@/lib/supabase/server';
import {
  reserveLifetimeUsageCounterAtomic,
  reserveUsageCounterAtomic,
  resolveUserEntitlements,
} from '@/lib/services/billing/entitlements';

describe('today ai outfit route auth + usage guardrails', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated POST', async () => {
    (createClient as unknown as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const { POST } = await import('../route');
    const request = new Request('https://example.com/api/today/ai-outfit', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'Work Day',
        stylePreset: 'Smart Casual',
        formality: 'smart',
        weather: {
          isCold: false,
          isMild: true,
          isWarm: false,
          isHot: false,
          isRainLikely: false,
          dailySwing: 10,
          hasLargeSwing: false,
          targetWeight: 2,
          currentTemp: 65,
          highTemp: 70,
          lowTemp: 60,
          precipChance: 0.1,
        },
      }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request as never);
    const payload = await response.json();
    expect(response.status).toBe(401);
    expect(payload.code).toBe('AUTH_REQUIRED');
  });

  it('returns 429 when free lifetime trial is exhausted', async () => {
    (createClient as unknown as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
    });
    (resolveUserEntitlements as unknown as Mock).mockResolvedValue({
      effectivePlanCode: 'free',
      usage: {},
      period: { key: '2026-02-01', start: new Date('2026-02-01'), end: new Date('2026-03-01') },
    });
    (reserveLifetimeUsageCounterAtomic as unknown as Mock).mockResolvedValue({ allowed: false, count: 1 });

    const { POST } = await import('../route');
    const request = new Request('https://example.com/api/today/ai-outfit', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'Work Day',
        stylePreset: 'Smart Casual',
        formality: 'smart',
        weather: {
          isCold: false,
          isMild: true,
          isWarm: false,
          isHot: false,
          isRainLikely: false,
          dailySwing: 10,
          hasLargeSwing: false,
          targetWeight: 2,
          currentTemp: 65,
          highTemp: 70,
          lowTemp: 60,
          precipChance: 0.1,
        },
      }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request as never);
    const payload = await response.json();
    expect(response.status).toBe(429);
    expect(payload.code).toBe('TRIAL_LIMIT_EXCEEDED');
  });

  it('returns 429 when plus monthly quota is exhausted', async () => {
    (createClient as unknown as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
    });
    (resolveUserEntitlements as unknown as Mock).mockResolvedValue({
      effectivePlanCode: 'plus',
      usage: {},
      period: { key: '2026-02-01', start: new Date('2026-02-01'), end: new Date('2026-03-01') },
    });
    (reserveUsageCounterAtomic as unknown as Mock).mockResolvedValue({ allowed: false, count: 7 });

    const { POST } = await import('../route');
    const request = new Request('https://example.com/api/today/ai-outfit', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'Work Day',
        stylePreset: 'Smart Casual',
        formality: 'smart',
        weather: {
          isCold: false,
          isMild: true,
          isWarm: false,
          isHot: false,
          isRainLikely: false,
          dailySwing: 10,
          hasLargeSwing: false,
          targetWeight: 2,
          currentTemp: 65,
          highTemp: 70,
          lowTemp: 60,
          precipChance: 0.1,
        },
      }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request as never);
    const payload = await response.json();
    expect(response.status).toBe(429);
    expect(payload.code).toBe('USAGE_LIMIT_EXCEEDED');
  });
});
