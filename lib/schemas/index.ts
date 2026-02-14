import { z } from 'zod';

// Base schemas for reusability
const UUIDSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID format');
const TimestampSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, 'Invalid datetime format');
const CalendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');
const SafeCalendarNotesSchema = z.string()
  .max(500, 'Notes too long')
  .regex(/^[A-Za-z0-9\s]*$/, 'Notes can only contain letters, numbers, and spaces');

// Category schema
export const CategorySchema = z.object({
  id: UUIDSchema.optional(),
  user_id: UUIDSchema.optional(),
  name: z.string().min(1, 'Category name is required').max(50),
  is_anchor_item: z.boolean().default(false),
  display_order: z.number().int().min(0).default(0),
  created_at: z.string().nullable().optional(), // More flexible datetime handling
  updated_at: z.string().nullable().optional(), // More flexible datetime handling
});

// Comprehensive wardrobe item schema
export const WardrobeItemSchema = z.object({
  id: UUIDSchema.optional(),
  user_id: UUIDSchema.optional(),
  category_id: UUIDSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  brand: z.string().max(50, 'Brand name too long').nullable().optional(),
  color: z.string().max(30, 'Color name too long').nullable().optional(),
  material: z.string().max(50, 'Material name too long').nullable().optional(),
  formality_score: z.number().int().min(1).max(10).nullable().optional(),
  capsule_tags: z.array(z.string().max(30)).nullable().optional(),
  season: z.array(z.enum(['All', 'Summer', 'Winter', 'Spring', 'Fall'])).nullable().default(['All']),
  image_url: z.string().nullable().optional(), // Allow any string format for image URLs (relative or absolute)
  active: z.boolean().default(true),
  created_at: z.string().nullable().optional(), // More flexible datetime handling
  updated_at: z.string().nullable().optional(), // More flexible datetime handling
});

// Outfit schema with comprehensive validation
export const OutfitSchema = z.object({
  id: UUIDSchema.optional(),
  user_id: UUIDSchema.optional(),
  name: z.string().max(100, 'Outfit name too long').nullable().optional(),
  score: z.number().int().min(0).max(100).nullable().optional(),
  tuck_style: z.enum(['Tucked', 'Untucked']).nullable().optional(),
  weight: z.number().int().min(1).max(10).default(1),
  loved: z.boolean().default(false),
  source: z.enum(['curated', 'generated']).default('curated'),
  created_at: z.string().nullable().optional(), // More flexible datetime handling
  updated_at: z.string().nullable().optional(), // More flexible datetime handling
});

// Outfit item junction schema
export const OutfitItemSchema = z.object({
  id: UUIDSchema.optional(),
  outfit_id: UUIDSchema,
  item_id: UUIDSchema,
  category_id: UUIDSchema,
  created_at: TimestampSchema.optional(),
});

// Calendar entry schemas
export const CalendarEntrySchema = z.object({
  id: UUIDSchema.optional(),
  user_id: UUIDSchema.optional(),
  entry_date: CalendarDateSchema,
  status: z.enum(['planned', 'worn']),
  outfit_id: UUIDSchema.nullable().optional(),
  notes: SafeCalendarNotesSchema.nullable().optional(),
  weather_context: z.record(z.string(), z.unknown()).nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const CalendarEntryItemSchema = z.object({
  id: UUIDSchema.optional(),
  calendar_entry_id: UUIDSchema,
  wardrobe_item_id: UUIDSchema,
  created_at: TimestampSchema.optional(),
});

// User preferences schema
export const UserPreferencesSchema = z.object({
  id: UUIDSchema.optional(),
  user_id: UUIDSchema,
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  show_brands: z.boolean().default(true),
  weather_enabled: z.boolean().default(true),
  default_tuck_style: z.enum(['Tucked', 'Untucked']).default('Untucked'),
  created_at: TimestampSchema.optional(),
  updated_at: TimestampSchema.optional(),
});

// Image upload schema
export const ImageUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(5 * 1024 * 1024), // 5MB
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/webp']),
});

// Image processing request schema
export const ImageProcessingRequestSchema = z.object({
  image: z.instanceof(File),
  removeBackground: z.boolean().default(true),
  quality: z.number().min(0.1).max(1).default(0.9),
});

// Image processing response schema
export const ImageProcessingResponseSchema = z.object({
  success: z.boolean(),
  imageUrl: z.string().optional(), // Allow any string format for image URLs
  fallbackUrl: z.string().optional(), // Allow any string format for image URLs
  error: z.string().optional(),
  message: z.string().optional(),
  processingTime: z.number().optional(),
});

// File validation schema
export const FileValidationSchema = z.object({
  name: z.string().min(1, 'Filename is required'),
  size: z.number().min(1, 'File size must be greater than 0').max(5 * 1024 * 1024, 'File size cannot exceed 5MB'),
  type: z.enum(['image/jpeg', 'image/png', 'image/webp']).refine(
    (val) => ['image/jpeg', 'image/png', 'image/webp'].includes(val),
    { message: 'File type must be JPEG, PNG, or WebP' }
  ),
  lastModified: z.number().optional(),
});

// Outfit selection schema for real-time validation
export const OutfitSelectionSchema = z.object({
  jacket: WardrobeItemSchema.optional(),
  overshirt: WardrobeItemSchema.optional(),
  shirt: WardrobeItemSchema.optional(),
  undershirt: WardrobeItemSchema.optional(),
  pants: WardrobeItemSchema.optional(),
  shoes: WardrobeItemSchema.optional(),
  belt: WardrobeItemSchema.optional(),
  watch: WardrobeItemSchema.optional(),
  tuck_style: z.enum(['Tucked', 'Untucked']).default('Untucked'),
  score: z.number().int().min(0).max(100).optional(),
});

// API response schemas
export const ApiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// Edge Function input/output schemas
export const SeedUserInputSchema = z.object({
  user_id: UUIDSchema,
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'),
});

export const ScoreOutfitInputSchema = z.object({
  selection: OutfitSelectionSchema,
  user_preferences: UserPreferencesSchema.partial().optional(),
});

// Form validation schemas
export const CreateWardrobeItemFormSchema = WardrobeItemSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
});

export const UpdateWardrobeItemFormSchema = CreateWardrobeItemFormSchema.partial().extend({
  id: UUIDSchema,
});

export const CreateOutfitFormSchema = OutfitSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
});

export const UpdateOutfitFormSchema = CreateOutfitFormSchema.partial().extend({
  id: UUIDSchema,
});

export const CreateCalendarEntryFormSchema = CalendarEntrySchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
}).extend({
  notes: z.union([SafeCalendarNotesSchema, z.null()]).optional(),
  item_ids: z.array(UUIDSchema).optional(),
});

export const UpdateCalendarEntryFormSchema = CreateCalendarEntryFormSchema.partial().extend({
  id: UUIDSchema,
});

// Type inference from schemas
export type Category = z.infer<typeof CategorySchema>;
export type WardrobeItem = z.infer<typeof WardrobeItemSchema>;
export type Outfit = z.infer<typeof OutfitSchema>;
export type OutfitItem = z.infer<typeof OutfitItemSchema>;
export type CalendarEntry = z.infer<typeof CalendarEntrySchema>;
export type CalendarEntryItem = z.infer<typeof CalendarEntryItemSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type OutfitSelection = z.infer<typeof OutfitSelectionSchema>;
export type ImageUpload = z.infer<typeof ImageUploadSchema>;
export type ImageProcessingRequest = z.infer<typeof ImageProcessingRequestSchema>;
export type ImageProcessingResponse = z.infer<typeof ImageProcessingResponseSchema>;
export type FileValidation = z.infer<typeof FileValidationSchema>;

// Form types
export type CreateWardrobeItemForm = z.infer<typeof CreateWardrobeItemFormSchema>;
export type UpdateWardrobeItemForm = z.infer<typeof UpdateWardrobeItemFormSchema>;
export type CreateOutfitForm = z.infer<typeof CreateOutfitFormSchema>;
export type UpdateOutfitForm = z.infer<typeof UpdateOutfitFormSchema>;
export type CreateCalendarEntryForm = z.infer<typeof CreateCalendarEntryFormSchema>;
export type UpdateCalendarEntryForm = z.infer<typeof UpdateCalendarEntryFormSchema>;

// API response types
export type ApiResponse<T> = z.infer<ReturnType<typeof ApiResponseSchema<T>>>;
export type SeedUserInput = z.infer<typeof SeedUserInputSchema>;
export type ScoreOutfitInput = z.infer<typeof ScoreOutfitInputSchema>;

// Re-export generation schemas
export {
  WeatherContextSchema,
  ColorCategorySchema,
  FormalityBandSchema,
  CompatibilityScoreSchema,
  EnrichedItemSchema,
  GeneratedOutfitSchema,
  GenerationOptionsSchema,
  SwapOptionsSchema,
} from './generation';

// Re-export generation types
export type {
  WeatherContext,
  ColorCategory,
  FormalityBand,
  CompatibilityScore,
  EnrichedItem,
  GeneratedOutfit,
  GenerationOptions,
  SwapOptions,
} from './generation';
