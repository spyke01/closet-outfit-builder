// Database types based on Supabase schema

// Background removal processing status
export type BgRemovalStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  is_anchor_item: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface WardrobeItem {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  brand?: string;
  color?: string;
  material?: string;
  formality_score?: number;
  capsule_tags?: string[];
  season?: string[];
  image_url?: string;
  active: boolean;
  external_id?: string; // Original ID from seed data for duplicate detection
  bg_removal_status: BgRemovalStatus;
  bg_removal_started_at?: string | null;
  bg_removal_completed_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
}

export interface Outfit {
  id: string;
  user_id: string;
  name?: string;
  score?: number;
  tuck_style?: 'Tucked' | 'Untucked';
  weight: number;
  loved: boolean;
  source: 'curated' | 'generated';
  external_id?: string; // Original ID from seed data for duplicate detection
  created_at: string;
  updated_at: string;
  // Joined fields
  items?: WardrobeItem[];
}

export interface OutfitItem {
  id: string;
  outfit_id: string;
  item_id: string;
  category_id: string;
  created_at: string;
}

export interface CalendarEntry {
  id: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD
  status: 'planned' | 'worn';
  outfit_id?: string | null;
  notes?: string | null;
  weather_context?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  outfit?: Outfit | null;
  items?: WardrobeItem[];
}

export interface CalendarEntryItem {
  id: string;
  calendar_entry_id: string;
  wardrobe_item_id: string;
  created_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  name: string;
  destination_text: string;
  destination_lat?: number | null;
  destination_lon?: number | null;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
  // Joined fields
  days?: TripDay[];
  pack_items?: TripPackItem[];
}

export interface TripDay {
  id: string;
  trip_id: string;
  day_date: string; // YYYY-MM-DD
  slot_number: number;
  slot_label?: string | null;
  weather_context?: Record<string, unknown> | null;
  outfit_id?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  outfit?: Outfit | null;
  items?: WardrobeItem[];
}

export interface TripDayItem {
  id: string;
  trip_day_id: string;
  wardrobe_item_id: string;
  created_at: string;
}

export interface TripPackItem {
  id: string;
  trip_id: string;
  wardrobe_item_id?: string | null;
  label: string;
  packed: boolean;
  source: 'from_outfit' | 'manual';
  created_at: string;
  updated_at: string;
  // Joined fields
  wardrobe_item?: WardrobeItem | null;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  show_brands: boolean;
  weather_enabled: boolean;
  default_tuck_style: 'Tucked' | 'Untucked';
  created_at: string;
  updated_at: string;
}

// Input types for mutations
export interface CreateWardrobeItemInput {
  category_id: string;
  name: string;
  brand?: string;
  color?: string;
  material?: string;
  formality_score?: number;
  capsule_tags?: string[];
  season?: string[];
  image_url?: string;
}

export interface UpdateWardrobeItemInput extends Partial<CreateWardrobeItemInput> {
  id: string;
  active?: boolean;
}

export interface CreateOutfitInput {
  name?: string;
  tuck_style?: 'Tucked' | 'Untucked';
  weight?: number;
  loved?: boolean;
  source?: 'curated' | 'generated';
  items: string[]; // Array of wardrobe item IDs
}

export interface UpdateOutfitInput extends Partial<CreateOutfitInput> {
  id: string;
}

export interface CreateCalendarEntryInput {
  entry_date: string; // YYYY-MM-DD
  status: 'planned' | 'worn';
  outfit_id?: string;
  notes?: string;
  weather_context?: Record<string, unknown>;
  item_ids?: string[];
}

export interface UpdateCalendarEntryInput extends Partial<CreateCalendarEntryInput> {
  id: string;
}

export interface CreateTripInput {
  name: string;
  destination_text: string;
  destination_lat?: number;
  destination_lon?: number;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
}

export interface UpdateTripInput extends Partial<CreateTripInput> {
  id: string;
}

export interface CreateTripDayInput {
  trip_id: string;
  day_date: string; // YYYY-MM-DD
  slot_number?: number;
  slot_label?: string;
  weather_context?: Record<string, unknown>;
  outfit_id?: string;
  item_ids?: string[];
}

export interface UpdateTripDayInput extends Partial<CreateTripDayInput> {
  id: string;
}

export interface CreateTripPackItemInput {
  trip_id: string;
  wardrobe_item_id?: string;
  label: string;
  source: 'from_outfit' | 'manual';
  packed?: boolean;
}

export interface UpdateTripPackItemInput extends Partial<CreateTripPackItemInput> {
  id: string;
}

export interface CreateCategoryInput {
  name: string;
  is_anchor_item?: boolean;
  display_order?: number;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: string;
}

// Outfit selection type for real-time outfit building
export interface OutfitSelection {
  jacket?: WardrobeItem;
  overshirt?: WardrobeItem;
  shirt?: WardrobeItem;
  undershirt?: WardrobeItem;
  pants?: WardrobeItem;
  shoes?: WardrobeItem;
  belt?: WardrobeItem;
  watch?: WardrobeItem;
  tuck_style?: 'Tucked' | 'Untucked';
  score?: number;
  [key: string]: WardrobeItem | 'Tucked' | 'Untucked' | number | null | undefined;
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
