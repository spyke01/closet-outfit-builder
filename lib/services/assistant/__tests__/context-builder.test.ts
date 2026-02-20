import { describe, expect, it, vi } from 'vitest';
import { buildAssistantContextPack, summarizeContextForPrompt } from '@/lib/services/assistant/context-builder';
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
    catch: (onRejected: (reason: unknown) => unknown) =>
      Promise.resolve({ data }).catch(onRejected),
    finally: (onFinally: () => void) =>
      Promise.resolve({ data }).finally(onFinally),
  };

  return query;
}

describe('assistant context builder', () => {
  it('applies user scoping and hard limits', async () => {
    const wardrobeRows = Array.from({ length: 60 }).map((_, index) => ({
      id: `item-${index + 1}`,
      name: `Item ${index + 1}`,
      color: 'navy',
      season: ['all'],
      formality_score: 3,
      category: { name: 'Blazer' },
    }));

    const tableQueries = {
      wardrobe_items: createThenableQuery(wardrobeRows),
      outfits: createThenableQuery([]),
      calendar_entries: createThenableQuery([]),
      trips: createThenableQuery([]),
    } as const;

    const supabase = {
      from: vi.fn((table: keyof typeof tableQueries) => tableQueries[table]),
    };

    const request: AssistantChatRequest = {
      message: 'Pair this with my blazer',
      contextHints: { focusItemId: 'item-30' },
    };

    const { pack } = await buildAssistantContextPack(supabase as never, 'user-1', request);

    expect(tableQueries.wardrobe_items.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(tableQueries.outfits.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(tableQueries.calendar_entries.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(tableQueries.trips.eq).toHaveBeenCalledWith('user_id', 'user-1');

    expect(pack.wardrobe).toHaveLength(50);
    expect(pack.wardrobe[0]?.id).toBe('item-30');
  });

  it('sanitizes context text fields', async () => {
    const tableQueries = {
      wardrobe_items: createThenableQuery([{
        id: 'item-1',
        name: 'Navy `Blazer`',
        color: '{blue}',
        season: ['all'],
        formality_score: 4,
        category: { name: '[Outerwear]' },
      }]),
      outfits: createThenableQuery([]),
      calendar_entries: createThenableQuery([{
        id: 'cal-1',
        entry_date: '2026-02-20',
        status: 'planned',
        notes: 'Dinner <script>alert(1)</script>',
        outfit_id: null,
        weather_context: {
          condition: 'Rainy <b>windy</b>',
          highTemp: '58',
          lowTemp: 46,
          precipChance: 67,
          humidity: 72,
        },
      }]),
      trips: createThenableQuery([{
        id: 'trip-1',
        name: 'NYC ${trip}',
        destination_text: 'New York',
        start_date: '2026-03-01',
        end_date: '2026-03-04',
      }]),
    } as const;

    const supabase = {
      from: vi.fn((table: keyof typeof tableQueries) => tableQueries[table]),
    };

    const request: AssistantChatRequest = { message: 'help' };
    const { pack } = await buildAssistantContextPack(supabase as never, 'user-2', request);

    expect(pack.wardrobe[0]?.name).not.toContain('`');
    expect(pack.wardrobe[0]?.category).not.toContain('[');
    expect(pack.wardrobe[0]?.color).not.toContain('{');
    expect(pack.calendarWindow[0]?.notes).not.toContain('<script>');
    expect(pack.trips[0]?.name).not.toContain('{');
    expect(pack.currentWeather?.condition).not.toContain('<');
    expect(pack.currentWeather?.highTempF).toBe(58);
    expect(pack.currentWeather?.lowTempF).toBe(46);
    expect(pack.currentWeather?.precipChance).toBe(67);

    const summary = summarizeContextForPrompt(pack);
    expect(summary).toContain('Current weather:');
    expect(summary).toContain('precip 67%');
  });

  it('prefers live weather hint context over calendar weather when provided', async () => {
    const tableQueries = {
      wardrobe_items: createThenableQuery([]),
      outfits: createThenableQuery([]),
      calendar_entries: createThenableQuery([{
        id: 'cal-1',
        entry_date: '2026-02-20',
        status: 'planned',
        notes: null,
        outfit_id: null,
        weather_context: {
          condition: 'Cloudy',
          highTemp: 55,
          lowTemp: 44,
          precipChance: 20,
        },
      }]),
      trips: createThenableQuery([]),
    } as const;

    const supabase = {
      from: vi.fn((table: keyof typeof tableQueries) => tableQueries[table]),
    };

    const request: AssistantChatRequest = {
      message: 'help',
      contextHints: {
        weather: {
          source: 'live-weather',
          condition: 'Sunny',
          temperatureF: 62,
          highTempF: 66,
          lowTempF: 51,
          precipChance: 0,
        },
      },
    };

    const { pack } = await buildAssistantContextPack(supabase as never, 'user-3', request);
    expect(pack.currentWeather?.condition).toBe('Sunny');
    expect(pack.currentWeather?.temperatureF).toBe(62);
    expect(pack.currentWeather?.source).toBe('live-weather');
  });
});
