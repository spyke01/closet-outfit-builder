import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('GET /api/assistant/threads/[id] authorization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (createClient as unknown as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    });

    const { GET } = await import('../route');
    const response = await GET(new Request('https://example.com/api/assistant/threads/thread-1'), {
      params: Promise.resolve({ id: 'thread-1' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.code).toBe('AUTH_REQUIRED');
  });

  it('returns 404 when thread is not owned by current user', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null });
    const eq2 = vi.fn().mockReturnValue({ maybeSingle });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const select = vi.fn().mockReturnValue({ eq: eq1 });

    const from = vi.fn((table: string) => {
      if (table === 'assistant_threads') {
        return { select };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    (createClient as unknown as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from,
    });

    const { GET } = await import('../route');
    const response = await GET(new Request('https://example.com/api/assistant/threads/thread-2'), {
      params: Promise.resolve({ id: 'thread-2' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.code).toBe('THREAD_NOT_FOUND');
  });
});
