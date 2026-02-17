import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/billing/entitlements', () => ({
  resolveUserEntitlements: vi.fn(),
  getUsageLimitForMetric: vi.fn(() => null),
  reserveUsageCounterAtomic: vi.fn(),
  incrementUsageCounter: vi.fn(),
  getAssistantBurstHourKey: vi.fn(() => 'ai_stylist_requests_hourly:2026-02-16T10'),
}));

vi.mock('@/lib/services/assistant/providers/replicate', () => ({
  generateAssistantReply: vi.fn(),
  resolveReplicateModelConfig: vi.fn(() => ({
    defaultModel: 'openai/gpt-5-mini',
    fallbackModel: 'openai/gpt-4o-mini',
  })),
}));

import { createClient } from '@/lib/supabase/server';
import { reserveUsageCounterAtomic, resolveUserEntitlements } from '@/lib/services/billing/entitlements';

describe('POST /api/assistant/chat usage guardrails', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns 429 when monthly assistant quota is exceeded', async () => {
    (createClient as unknown as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(),
    });

    (resolveUserEntitlements as unknown as Mock).mockResolvedValue({
      effectivePlanCode: 'plus',
      plan: { limits: { ai_burst_per_hour: 5 } },
      period: { start: '2026-02-01', end: '2026-03-01' },
    });
    (reserveUsageCounterAtomic as unknown as Mock)
      .mockResolvedValueOnce({ allowed: false, count: 0 });

    const { POST } = await import('../route');
    const request = new Request('https://example.com/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Give me styling advice' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.code).toBe('USAGE_LIMIT_EXCEEDED');
  });

  it('returns 429 when hourly burst limit is exceeded', async () => {
    (createClient as unknown as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(),
    });

    (resolveUserEntitlements as unknown as Mock).mockResolvedValue({
      effectivePlanCode: 'pro',
      plan: { limits: { ai_burst_per_hour: 5 } },
      period: { start: '2026-02-01', end: '2026-03-01' },
    });
    (reserveUsageCounterAtomic as unknown as Mock)
      .mockResolvedValueOnce({ allowed: true, count: 1 })
      .mockResolvedValueOnce({ allowed: false, count: 5 });

    const { POST } = await import('../route');
    const request = new Request('https://example.com/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Help me style this jacket' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.code).toBe('BURST_LIMIT_EXCEEDED');
  });
});
