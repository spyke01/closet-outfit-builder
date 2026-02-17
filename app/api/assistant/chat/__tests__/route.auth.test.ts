import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/billing/entitlements', () => ({
  resolveUserEntitlements: vi.fn(),
  getUsageLimitForMetric: vi.fn(() => null),
  reserveUsageCounterAtomic: vi.fn(() => ({ allowed: true, count: 1 })),
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
import { resolveUserEntitlements } from '@/lib/services/billing/entitlements';

describe('POST /api/assistant/chat auth + plan guardrails', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    (createClient as unknown as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const { POST } = await import('../route');
    const request = new Request('https://example.com/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Style me for dinner' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for free plan users', async () => {
    (createClient as unknown as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
    });

    (resolveUserEntitlements as unknown as Mock).mockResolvedValue({
      effectivePlanCode: 'free',
      plan: { limits: { ai_burst_per_hour: 5 } },
      period: { start: '2026-02-01', end: '2026-03-01' },
    });

    const { POST } = await import('../route');
    const request = new Request('https://example.com/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'What goes with a navy blazer?' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.code).toBe('PLAN_REQUIRED');
  });
});
