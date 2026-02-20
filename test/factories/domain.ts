import type { SecureRequest } from '@/lib/middleware/security-middleware';
import type { Category, Outfit, WardrobeItem } from '@/lib/types/database';
import type { PinnedPreferenceRow } from '@/lib/types/sizes';

export function buildWardrobeItem(overrides: Partial<WardrobeItem> = {}): WardrobeItem {
  return {
    id: 'item-1',
    user_id: 'user-1',
    category_id: 'category-1',
    name: 'Test Item',
    active: true,
    bg_removal_status: 'completed',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function buildCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'category-1',
    user_id: 'user-1',
    name: 'Category',
    is_anchor_item: true,
    display_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function buildOutfit(overrides: Partial<Outfit> = {}): Outfit {
  return {
    id: 'outfit-1',
    user_id: 'user-1',
    name: 'Outfit',
    weight: 1,
    loved: false,
    source: 'curated',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function buildPinnedPreference(
  overrides: Partial<PinnedPreferenceRow> = {}
): PinnedPreferenceRow {
  return {
    id: 'pref-1',
    user_id: 'user-1',
    category_id: 'category-1',
    display_order: 0,
    display_mode: 'standard',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function buildSecureUser(
  overrides: Partial<NonNullable<SecureRequest['user']>> = {}
): NonNullable<SecureRequest['user']> {
  return {
    id: 'user-1',
    email: 'user@example.com',
    ...overrides,
  };
}
