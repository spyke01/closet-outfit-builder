import { describe, expect, it, vi } from 'vitest';
import { buildAssistantContextPack } from '@/lib/services/assistant/context-builder';
import type { AssistantChatRequest } from '@/lib/services/assistant/types';

function createThenableQuery(data: Array<Record<string, unknown>>) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    then: (
      onFulfilled: (value: { data: Array<Record<string, unknown>> }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) =>
      Promise.resolve({ data }).then(onFulfilled, onRejected),
  };
  return query;
}

describe('assistant calendar + trip bounds', () => {
  it('filters calendar rows to the configured event window', async () => {
    const calendarQuery = createThenableQuery([
      { id: 'cal-before', entry_date: '2026-02-10', status: 'planned', notes: null, outfit_id: null },
      { id: 'cal-in', entry_date: '2026-02-14', status: 'planned', notes: null, outfit_id: null },
      { id: 'cal-in-2', entry_date: '2026-03-04', status: 'planned', notes: null, outfit_id: null },
      { id: 'cal-after', entry_date: '2026-03-20', status: 'planned', notes: null, outfit_id: null },
    ]);

    const tableQueries = {
      wardrobe_items: createThenableQuery([]),
      outfits: createThenableQuery([]),
      calendar_entries: calendarQuery,
      trips: createThenableQuery([]),
    } as const;

    const supabase = {
      from: vi.fn((table: keyof typeof tableQueries) => tableQueries[table]),
    };

    const request: AssistantChatRequest = {
      message: 'what should I wear',
      contextHints: { eventDate: '2026-02-21' },
    };

    const { pack } = await buildAssistantContextPack(supabase as never, 'user-1', request);
    const ids = pack.calendarWindow.map((entry) => entry.id);

    expect(calendarQuery.gte).toHaveBeenCalledWith('entry_date', '2026-02-14');
    expect(calendarQuery.lte).toHaveBeenCalledWith('entry_date', '2026-03-14');
    expect(ids).toEqual(['cal-in', 'cal-in-2']);
  });

  it('restricts trip context to requested tripId hint', async () => {
    const tripsQuery = createThenableQuery([
      { id: 'trip-1', name: 'NYC', destination_text: 'New York', start_date: '2026-04-01', end_date: '2026-04-04' },
      { id: 'trip-2', name: 'Paris', destination_text: 'Paris', start_date: '2026-05-01', end_date: '2026-05-04' },
    ]);

    const tableQueries = {
      wardrobe_items: createThenableQuery([]),
      outfits: createThenableQuery([]),
      calendar_entries: createThenableQuery([]),
      trips: tripsQuery,
    } as const;

    const supabase = {
      from: vi.fn((table: keyof typeof tableQueries) => tableQueries[table]),
    };

    const request: AssistantChatRequest = {
      message: 'plan outfits for this trip',
      contextHints: { tripId: 'trip-2' },
    };

    const { pack } = await buildAssistantContextPack(supabase as never, 'user-1', request);

    expect(tripsQuery.eq).toHaveBeenCalledWith('id', 'trip-2');
    expect(pack.trips).toHaveLength(1);
    expect(pack.trips[0]?.id).toBe('trip-2');
  });
});
