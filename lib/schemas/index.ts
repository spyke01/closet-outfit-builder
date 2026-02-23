import { z } from 'zod';

// Base schemas for reusability
const UUIDSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID format');
const TimestampSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, 'Invalid datetime format');
const CalendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');
const SafeCalendarNotesSchema = z.string()
  .max(500, 'Notes too long')
  .regex(/^[A-Za-z0-9\s]*$/, 'Notes can only contain letters, numbers, and spaces');

// Background removal schemas
export const BgRemovalStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

export const ReplicateResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['starting', 'processing', 'succeeded', 'failed', 'canceled']),
  output: z.string().url().nullable().optional(), // URL to processed image
  error: z.string().nullable().optional(),
  logs: z.string().nullable().optional(),
});

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
  bg_removal_status: BgRemovalStatusSchema.default('pending'),
  bg_removal_started_at: z.string().nullable().optional(),
  bg_removal_completed_at: z.string().nullable().optional(),
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

export const TripSchema = z.object({
  id: UUIDSchema.optional(),
  user_id: UUIDSchema.optional(),
  name: z.string().min(1).max(100),
  destination_text: z.string().min(1).max(120),
  destination_lat: z.number().min(-90).max(90).nullable().optional(),
  destination_lon: z.number().min(-180).max(180).nullable().optional(),
  start_date: CalendarDateSchema,
  end_date: CalendarDateSchema,
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const TripDaySchema = z.object({
  id: UUIDSchema.optional(),
  trip_id: UUIDSchema,
  day_date: CalendarDateSchema,
  slot_number: z.number().int().min(1).max(5).default(1),
  slot_label: z.string().max(40).nullable().optional(),
  weather_context: z.record(z.string(), z.unknown()).nullable().optional(),
  outfit_id: UUIDSchema.nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const TripPackItemSchema = z.object({
  id: UUIDSchema.optional(),
  trip_id: UUIDSchema,
  wardrobe_item_id: UUIDSchema.nullable().optional(),
  label: z.string().min(1).max(120).regex(/^[A-Za-z0-9\s]*$/, 'Label can only contain letters, numbers, and spaces'),
  packed: z.boolean().default(false),
  source: z.enum(['from_outfit', 'manual']),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

// Account tier schema for user preferences/profile UX.
// Billing entitlements should use effectivePlanCode ('free' | 'plus' | 'pro').
export const AccountTierSchema = z.enum(['starter', 'plus', 'pro']);

// User preferences schema
export const UserPreferencesSchema = z.object({
  id: UUIDSchema.optional(),
  user_id: UUIDSchema,
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  show_brands: z.boolean().default(true),
  weather_enabled: z.boolean().default(true),
  default_tuck_style: z.enum(['Tucked', 'Untucked']).default('Untucked'),
  account_tier: AccountTierSchema.default('starter'),
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
  bgRemovalStatus: BgRemovalStatusSchema.optional(),
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

const TripFormBaseSchema = TripSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
});

export const CreateTripFormSchema = TripFormBaseSchema.superRefine((trip, context) => {
  const start = new Date(`${trip.start_date}T12:00:00`);
  const end = new Date(`${trip.end_date}T12:00:00`);
  if (end.getTime() < start.getTime()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date must be on or after start date',
      path: ['end_date'],
    });
    return;
  }

  const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  if (diffDays > 30) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Trip length cannot exceed 30 days',
      path: ['end_date'],
    });
  }
});

export const UpdateTripFormSchema = TripFormBaseSchema.partial().extend({
  id: UUIDSchema,
}).superRefine((trip, context) => {
  if (!trip.start_date || !trip.end_date) return;

  const start = new Date(`${trip.start_date}T12:00:00`);
  const end = new Date(`${trip.end_date}T12:00:00`);
  if (end.getTime() < start.getTime()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date must be on or after start date',
      path: ['end_date'],
    });
    return;
  }

  const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  if (diffDays > 30) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Trip length cannot exceed 30 days',
      path: ['end_date'],
    });
  }
});

export const CreateTripDayFormSchema = TripDaySchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  item_ids: z.array(UUIDSchema).optional(),
});

export const UpdateTripDayFormSchema = CreateTripDayFormSchema.partial().extend({
  id: UUIDSchema,
  slot_number: z.number().int().min(1).max(5).optional(),
});

export const CreateTripPackItemFormSchema = TripPackItemSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const UpdateTripPackItemFormSchema = CreateTripPackItemFormSchema.partial().extend({
  id: UUIDSchema,
});

// Outfit image generation schemas
export const GenerationStatusSchema = z.enum([
  'pending', 'generating', 'completed', 'failed', 'cancelled',
]);

export const GenerationLogStatusSchema = z.enum([
  'success', 'failed', 'cancelled',
]);

export const GeneratedOutfitImageSchema = z.object({
  id: UUIDSchema.optional(),
  outfit_id: UUIDSchema,
  user_id: UUIDSchema.optional(),
  image_url: z.string(),
  storage_path: z.string(),
  status: GenerationStatusSchema,
  is_primary: z.boolean().default(false),
  prompt_text: z.string().optional(),
  prompt_hash: z.string().optional(),
  model_version: z.string().default('google-deepmind/imagen-4'),
  generation_duration_ms: z.number().int().positive().optional(),
  cost_cents: z.number().int().min(0).optional(),
  error_message: z.string().optional(),
  retry_of: UUIDSchema.nullable().optional(),
  retry_expires_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const ImageGenerationUsageSchema = z.object({
  id: UUIDSchema.optional(),
  user_id: UUIDSchema,
  monthly_count: z.number().int().min(0).default(0),
  monthly_reset_at: z.string(),
  hourly_timestamps: z.array(z.string()).default([]),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const GenerateOutfitImageRequestSchema = z.object({
  outfit_id: UUIDSchema,
  retry_of: UUIDSchema.optional(),
});

export const GenerateOutfitImageResponseSchema = z.object({
  success: z.boolean(),
  image: GeneratedOutfitImageSchema.optional(),
  error: z.string().optional(),
  quota_remaining: z.object({
    monthly: z.number().int().min(0),
    hourly: z.number().int().min(0),
  }).optional(),
});

// Wardrobe item image generation schemas
export const GenerateWardrobeItemImageRequestSchema = z.object({
  wardrobe_item_id: UUIDSchema,
  is_retry: z.boolean().optional().default(false),
});

export const GenerateWardrobeItemImageResponseSchema = z.object({
  success: z.boolean(),
  image_url: z.string().optional(),
  error: z.string().optional(),
  error_code: z.string().optional(),
  quota_remaining: z.object({
    monthly: z.number().int().min(0),
    hourly: z.number().int().min(0),
  }).optional(),
});

// Type inference from schemas
export type Category = z.infer<typeof CategorySchema>;
export type WardrobeItem = z.infer<typeof WardrobeItemSchema>;
export type Outfit = z.infer<typeof OutfitSchema>;
export type OutfitItem = z.infer<typeof OutfitItemSchema>;
export type CalendarEntry = z.infer<typeof CalendarEntrySchema>;
export type CalendarEntryItem = z.infer<typeof CalendarEntryItemSchema>;
export type Trip = z.infer<typeof TripSchema>;
export type TripDay = z.infer<typeof TripDaySchema>;
export type TripPackItem = z.infer<typeof TripPackItemSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type OutfitSelection = z.infer<typeof OutfitSelectionSchema>;
export type ImageUpload = z.infer<typeof ImageUploadSchema>;
export type ImageProcessingRequest = z.infer<typeof ImageProcessingRequestSchema>;
export type ImageProcessingResponse = z.infer<typeof ImageProcessingResponseSchema>;
export type FileValidation = z.infer<typeof FileValidationSchema>;
export type GeneratedOutfitImage = z.infer<typeof GeneratedOutfitImageSchema>;
export type ImageGenerationUsage = z.infer<typeof ImageGenerationUsageSchema>;
export type GenerateOutfitImageRequest = z.infer<typeof GenerateOutfitImageRequestSchema>;
export type GenerateOutfitImageResponse = z.infer<typeof GenerateOutfitImageResponseSchema>;
export type GenerateWardrobeItemImageRequest = z.infer<typeof GenerateWardrobeItemImageRequestSchema>;
export type GenerateWardrobeItemImageResponse = z.infer<typeof GenerateWardrobeItemImageResponseSchema>;

// Form types
export type CreateWardrobeItemForm = z.infer<typeof CreateWardrobeItemFormSchema>;
export type UpdateWardrobeItemForm = z.infer<typeof UpdateWardrobeItemFormSchema>;
export type CreateOutfitForm = z.infer<typeof CreateOutfitFormSchema>;
export type UpdateOutfitForm = z.infer<typeof UpdateOutfitFormSchema>;
export type CreateCalendarEntryForm = z.infer<typeof CreateCalendarEntryFormSchema>;
export type UpdateCalendarEntryForm = z.infer<typeof UpdateCalendarEntryFormSchema>;
export type CreateTripForm = z.infer<typeof CreateTripFormSchema>;
export type UpdateTripForm = z.infer<typeof UpdateTripFormSchema>;
export type CreateTripDayForm = z.infer<typeof CreateTripDayFormSchema>;
export type UpdateTripDayForm = z.infer<typeof UpdateTripDayFormSchema>;
export type CreateTripPackItemForm = z.infer<typeof CreateTripPackItemFormSchema>;
export type UpdateTripPackItemForm = z.infer<typeof UpdateTripPackItemFormSchema>;

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
