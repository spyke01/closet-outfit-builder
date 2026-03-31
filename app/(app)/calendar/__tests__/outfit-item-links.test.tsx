import { describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { CalendarPageClient } from '../calendar-page-client';
import { TripsPageClient } from '../trips/trips-page-client';
import { renderWithQuery } from '@/lib/test/query-utils';
import type { Outfit, Trip, TripDay, WardrobeItem } from '@/lib/types/database';

const todayKey = new Date().toISOString().split('T')[0];

function makeItem(index: number): WardrobeItem {
  return {
    id: `item-${index}`,
    user_id: 'user-1',
    category_id: `category-${index}`,
    name: `Item ${index}`,
    active: true,
    bg_removal_status: 'completed',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    image_url: `https://example.com/item-${index}.png`,
    category: {
      id: `category-${index}`,
      user_id: 'user-1',
      name: `Category ${index}`,
      is_anchor_item: false,
      display_order: index,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  };
}

const outfitItems = [1, 2, 3, 4, 5].map(makeItem);
const outfitId = 'outfit-123';

const mockOutfit: Outfit = {
  id: outfitId,
  user_id: 'user-1',
  name: 'Test Outfit',
  weight: 3,
  loved: false,
  source: 'curated',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  items: outfitItems,
};

const mockTrip: Trip = {
  id: 'trip-1',
  user_id: 'user-1',
  name: 'NYC',
  destination_text: 'New York',
  destination_lat: null,
  destination_lon: null,
  start_date: todayKey,
  end_date: todayKey,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const mockTripDay: TripDay = {
  id: 'trip-day-1',
  trip_id: 'trip-1',
  day_date: todayKey,
  slot_number: 1,
  slot_label: null,
  weather_context: null,
  outfit_id: outfitId,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  outfit: mockOutfit,
  items: outfitItems,
};

vi.mock('@/lib/hooks/use-weather', () => ({
  useWeather: () => ({
    forecast: [],
    current: null,
    loading: false,
    error: null,
    retry: vi.fn(),
    usingFallback: false,
  }),
}));

vi.mock('@/lib/hooks/use-outfits', () => ({
  useOutfits: () => ({ data: [mockOutfit] }),
  useCreateOutfit: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/lib/hooks/use-calendar-entries', () => ({
  useCalendarEntriesByMonth: () => ({
    data: {
      entries: [
        {
          id: 'entry-1',
          user_id: 'user-1',
          entry_date: todayKey,
          status: 'planned',
          outfit_id: outfitId,
          notes: null,
          weather_context: null,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          outfit: mockOutfit,
          items: outfitItems,
        },
      ],
    },
    isLoading: false,
    error: null,
  }),
  useCreateCalendarEntry: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCalendarEntry: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteCalendarEntry: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/lib/hooks/use-trips', () => ({
  useTrips: () => ({ data: [mockTrip], isLoading: false }),
  useTripDetail: () => ({
    data: {
      ...mockTrip,
      days: [mockTripDay],
      pack_items: [],
    },
    isLoading: false,
    refetch: vi.fn(async () => ({ data: null })),
  }),
  useCreateTrip: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateTripDay: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateTripPackItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTrip: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTripDay: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTripPackItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useFindTripOverlaps: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTrip: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTripDay: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTripPackItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            contains: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
      })),
    })),
  }),
}));

describe('Calendar and trip outfit item links', () => {
  it('renders all calendar entry outfit items and links them to the outfit page', () => {
    const { container } = renderWithQuery(<CalendarPageClient wardrobeItems={outfitItems} />);

    const links = container.querySelectorAll(`a[href^="/outfits/${outfitId}"]`);
    expect(links.length).toBe(outfitItems.length);
  });

  it('renders all trip slot outfit items and links them to the outfit page', async () => {
    const { container } = renderWithQuery(<TripsPageClient wardrobeItems={outfitItems} />);

    await waitFor(() => {
      const links = container.querySelectorAll(`a[href^="/outfits/${outfitId}"]`);
      expect(links.length).toBe(outfitItems.length);
    });
  });
});
