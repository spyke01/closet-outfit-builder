import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('POST /api/assistant/chat/status csrf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects cross-site request', async () => {
    (createClient as unknown as Mock).mockResolvedValue({
      auth: { getUser: vi.fn() },
    });

    const { POST } = await import('../route');
    const request = new Request('https://example.com/api/assistant/chat/status', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://evil.example',
        'sec-fetch-site': 'cross-site',
      },
      body: JSON.stringify({ threadId: '00000000-0000-0000-0000-000000000001' }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(403);
  });
});

