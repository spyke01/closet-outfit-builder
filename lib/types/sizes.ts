/**
 * TypeScript type definitions for My Sizes feature
 * 
 * These types match the Supabase database schema for size management.
 * All tables use Row Level Security (RLS) for user data isolation.
 */

/**
 * Supported sizing format types
 */
export type SizingFormat = 'letter' | 'numeric' | 'waist-inseam' | 'measurements';

/**
 * Display mode options for pinned cards
 */
export type DisplayMode = 'standard' | 'dual' | 'preferred-brand';

/**
 * Unit system for measurements
 */
export type MeasurementUnit = 'imperial' | 'metric';

/**
 * Size category table row
 * Represents a clothing category (e.g., Tops, Bottoms, Footwear)
 */
export interface SizeCategoryRow {
  id: string; // UUID
  user_id: string; // Foreign key to auth.users
  name: string; // e.g., "Tops", "Bottoms", "Footwear"
  icon?: string; // Optional icon identifier
  supported_formats: SizingFormat[]; // Array of supported formats
  is_system_category: boolean; // True for default categories
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Standard size table row
 * Stores the user's standard/primary size for a category
 */
export interface StandardSizeRow {
  id: string; // UUID
  category_id: string; // Foreign key to size_categories
  user_id: string; // Foreign key to auth.users
  primary_size: string; // e.g., "M", "32", "32x34"
  secondary_size?: string; // Optional second size
  notes?: string; // Free text notes
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Brand size table row
 * Stores brand-specific size overrides that differ from standard size
 */
export interface BrandSizeRow {
  id: string; // UUID
  category_id: string; // Foreign key to size_categories
  user_id: string; // Foreign key to auth.users
  brand_name: string; // e.g., "Levi's", "Nike"
  item_type?: string; // Optional, e.g., "Jeans", "Dress Shirt"
  size: string; // Brand-specific size
  fit_scale: number; // 1-5: runs small to runs large
  notes?: string; // Free text notes
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Category measurements table row
 * Stores body measurements for a category
 */
export interface CategoryMeasurementsRow {
  id: string; // UUID
  category_id: string; // Foreign key to size_categories
  user_id: string; // Foreign key to auth.users
  measurements: Record<string, number>; // JSONB: { chest: 40, waist: 32, ... }
  unit: MeasurementUnit; // 'imperial' or 'metric'
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Pinned preferences table row
 * Stores user's pinned category preferences and display settings
 */
export interface PinnedPreferenceRow {
  id: string; // UUID
  user_id: string; // Foreign key to auth.users
  category_id: string; // Foreign key to size_categories
  display_order: number; // For ordering pinned cards
  display_mode: DisplayMode; // 'standard', 'dual', or 'preferred-brand'
  preferred_brand_id?: string; // For preferred-brand mode
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Client-side view model for pinned card data
 * Combines category, standard size, and display preferences
 */
export interface PinnedCardData {
  category: SizeCategoryRow;
  standardSize?: StandardSizeRow;
  displayMode: DisplayMode;
  preferredBrandSize?: BrandSizeRow;
  displayOrder: number;
}

/**
 * Client-side view model for category grid items
 * Includes computed metadata for display
 */
export interface CategoryGridItem {
  category: SizeCategoryRow;
  sizeCount: number; // Count of standard + brand sizes
  hasVariations: boolean; // True if brand sizes differ from standard
}

/**
 * Form input types (omit auto-generated fields)
 */
export type SizeCategoryInput = Omit<SizeCategoryRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type StandardSizeInput = Omit<StandardSizeRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type BrandSizeInput = Omit<BrandSizeRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type CategoryMeasurementsInput = Omit<CategoryMeasurementsRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type PinnedPreferenceInput = Omit<PinnedPreferenceRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
