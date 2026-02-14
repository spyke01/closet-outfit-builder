// Database types based on Supabase schema
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
