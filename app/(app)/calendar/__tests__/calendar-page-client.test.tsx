import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { CalendarPageClient } from '../calendar-page-client';
import { renderWithQuery } from '@/lib/test/query-utils';
import type { CalendarEntry, Outfit, WardrobeItem } from '@/lib/types/database';

const baseDate = new Date('2026-03-15T12:00:00Z');
const todayKey = '2026-03-15';
const nextDayKey = '2026-03-16';

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

const wardrobeItems = [1, 2, 3, 4].map(makeItem);

const outfits: Outfit[] = [
  {
    id: 'outfit-1',
    user_id: 'user-1',
    name: 'Boardroom Blue',
    weight: 3,
    loved: true,
    source: 'curated',
    created_at: '2026-01-01',
    updated_at: '2026-03-10',
    score: 92,
    items: wardrobeItems,
  },
  {
    id: 'outfit-2',
    user_id: 'user-1',
    name: 'Weekend Grey',
    weight: 2,
    loved: false,
    source: 'curated',
    created_at: '2026-01-01',
    updated_at: '2026-03-08',
    score: 81,
    items: wardrobeItems.slice(0, 3),
  },
];

const entries: CalendarEntry[] = [
  {
    id: 'entry-1',
    user_id: 'user-1',
    entry_date: todayKey,
    status: 'planned',
    outfit_id: 'outfit-1',
    notes: 'Office day',
    weather_context: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    outfit: outfits[0],
    items: outfits[0].items,
  },
];

const mutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const deleteMutateAsync = vi.fn();
const createOutfitMutateAsync = vi.fn();

vi.mock('@/lib/hooks/use-weather', () => ({
  useWeather: () => ({
    forecast: [
      { date: todayKey, temperature: { high: 70, low: 58 } },
      { date: nextDayKey, temperature: { high: 72, low: 60 } },
    ],
    current: null,
    loading: false,
    error: null,
    retry: vi.fn(),
    usingFallback: false,
  }),
}));

vi.mock('@/lib/hooks/use-outfits', () => ({
  useOutfits: () => ({ data: outfits }),
  useCreateOutfit: () => ({
    mutateAsync: createOutfitMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/lib/hooks/use-calendar-entries', () => ({
  useCalendarEntriesByMonth: () => ({
    data: {
      entries,
      wornEntriesThisMonth: 1,
    },
    isLoading: false,
    error: null,
  }),
  useCreateCalendarEntry: () => ({ mutateAsync, isPending: false }),
  useUpdateCalendarEntry: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
  useDeleteCalendarEntry: () => ({ mutateAsync: deleteMutateAsync, isPending: false }),
}));

describe('CalendarPageClient entry flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(baseDate);
    mutateAsync.mockReset();
    updateMutateAsync.mockReset();
    deleteMutateAsync.mockReset();
    createOutfitMutateAsync.mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function clickPrimaryAddEntry() {
    fireEvent.click(screen.getAllByRole('button', { name: /add entry/i })[0]!);
  }

  it('opens a blank New Entry form for the selected date', () => {
    const { container } = renderWithQuery(<CalendarPageClient wardrobeItems={wardrobeItems} />);

    clickPrimaryAddEntry();

    expect(container.querySelector('.page-shell-content--wide')).toBeInTheDocument();
    expect(screen.getByText(/new entry for mar 15/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/label \/ notes/i)).toHaveValue('');
  });

  it('opens edit mode for the clicked entry and marks the row active', () => {
    renderWithQuery(<CalendarPageClient wardrobeItems={wardrobeItems} />);

    fireEvent.click(screen.getByRole('button', { name: /office day/i }));

    expect(screen.getByText('Edit Entry')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Office day')).toBeInTheDocument();
    expect(screen.getByText('Editing')).toBeInTheDocument();
  });

  it('keeps notes after source controls in the editor flow', () => {
    renderWithQuery(<CalendarPageClient wardrobeItems={wardrobeItems} />);

    clickPrimaryAddEntry();

    const sourceHeading = screen.getByText('Outfit source');
    const notesLabel = screen.getByText('Label / notes');

    expect(sourceHeading.compareDocumentPosition(notesLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('filters the saved outfit selector with search', () => {
    renderWithQuery(<CalendarPageClient wardrobeItems={wardrobeItems} />);

    clickPrimaryAddEntry();

    const editor = screen.getByText(/new entry for mar 15/i).closest('div');
    const search = screen.getByRole('textbox', { name: /search saved outfits/i });
    fireEvent.change(search, { target: { value: 'Weekend' } });

    expect(screen.getByText('Weekend Grey')).toBeInTheDocument();
    expect(within(editor ?? document.body).queryByText('Boardroom Blue')).not.toBeInTheDocument();
  });

  it('prompts on dirty date switch and clears stale edit state after confirming', () => {
    const { container } = renderWithQuery(<CalendarPageClient wardrobeItems={wardrobeItems} />);

    fireEvent.click(screen.getByRole('button', { name: /office day/i }));
    fireEvent.change(screen.getByLabelText(/label \/ notes/i), { target: { value: 'Updated note' } });

    const dateButtons = Array.from(container.querySelectorAll('button')).filter((button) => {
      const label = button.textContent?.trim();
      return label === '16' || label?.startsWith('16');
    });
    expect(dateButtons.length).toBeGreaterThan(0);

    fireEvent.click(dateButtons[0]!);

    expect(window.confirm).toHaveBeenCalledWith('Discard unsaved changes and switch dates?');
    expect(screen.queryByText('Edit Entry')).not.toBeInTheDocument();
    expect(screen.getByText(/pick an existing entry to edit it/i)).toBeInTheDocument();
  });

  it('saves a new entry against the currently selected date', async () => {
    mutateAsync.mockResolvedValue({ id: 'new-entry' });
    const { container } = renderWithQuery(<CalendarPageClient wardrobeItems={wardrobeItems} />);

    const dateButtons = Array.from(container.querySelectorAll('button')).filter((button) => {
      const label = button.textContent?.trim();
      return label === '16' || label?.startsWith('16');
    });
    fireEvent.click(dateButtons[0]!);
    expect(screen.getByRole('heading', { name: /march 16/i })).toBeInTheDocument();

    clickPrimaryAddEntry();
    fireEvent.click(screen.getByRole('button', { name: /boardroom blue/i }));
    fireEvent.change(screen.getByLabelText(/label \/ notes/i), { target: { value: 'Client dinner' } });

    const saveButton = screen.getByRole('button', { name: /^save entry$/i });
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);
    await Promise.resolve();
    await Promise.resolve();

    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      entry_date: nextDayKey,
      notes: 'Client dinner',
      outfit_id: 'outfit-1',
    }));
  });
});
