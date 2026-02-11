import { z } from 'zod';

/**
 * Weather Context Schema
 * 
 * Validates normalized weather data for outfit generation.
 * Ensures temperature bands, precipitation flags, and target weight
 * are within expected ranges.
 */
export const WeatherContextSchema = z.object({
  // Temperature classification (exactly one should be true)
  isCold: z.boolean(),
  isMild: z.boolean(),
  isWarm: z.boolean(),
  isHot: z.boolean(),
  
  // Precipitation
  isRainLikely: z.boolean(),
  
  // Temperature swing
  dailySwing: z.number().min(0, 'Daily swing cannot be negative'),
  hasLargeSwing: z.boolean(),
  
  // Target warmth level (0-3)
  targetWeight: z.number().int().min(0).max(3),
  
  // Raw values for reference
  currentTemp: z.number(),
  highTemp: z.number(),
  lowTemp: z.number(),
  precipChance: z.number().min(0).max(1),
}).refine(
  (data) => {
    // Exactly one temperature band should be true
    const bands = [data.isCold, data.isMild, data.isWarm, data.isHot];
    const trueCount = bands.filter(b => b).length;
    return trueCount === 1;
  },
  {
    message: 'Exactly one temperature band (isCold, isMild, isWarm, isHot) must be true',
  }
).refine(
  (data) => {
    // High temp should be >= low temp
    return data.highTemp >= data.lowTemp;
  },
  {
    message: 'High temperature must be greater than or equal to low temperature',
  }
);

/**
 * Color Category Schema
 * 
 * Validates color classifications inferred from item names.
 */
export const ColorCategorySchema = z.enum([
  'black', 'white', 'grey', 'gray', 'navy', 'blue',
  'cream', 'khaki', 'brown', 'tan', 'green', 'red',
  'burgundy', 'olive', 'charcoal', 'unknown'
]);

/**
 * Formality Band Schema
 * 
 * Validates formality classifications derived from formality scores.
 */
export const FormalityBandSchema = z.enum(['casual', 'smart-casual', 'refined']);

/**
 * Compatibility Score Schema
 * 
 * Validates multi-dimensional compatibility scoring.
 * All scores must be between 0 and 1.
 */
export const CompatibilityScoreSchema = z.object({
  weatherFit: z.number().min(0).max(1),
  formalityAlignment: z.number().min(0).max(1),
  colorHarmony: z.number().min(0).max(1),
  capsuleCohesion: z.number().min(0).max(1),
  total: z.number().min(0).max(1),
});

/**
 * Enriched Item Schema
 * 
 * Validates wardrobe items with computed metadata.
 * Note: This extends the base WardrobeItemSchema with additional fields.
 */
export const EnrichedItemSchema = z.object({
  // Base WardrobeItem fields (simplified for validation)
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  category_id: z.string().uuid(),
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  formality_score: z.number().int().min(1).max(10).nullable().optional(),
  capsule_tags: z.array(z.string()).nullable().optional(),
  season: z.array(z.string()).nullable().optional(),
  image_url: z.string().nullable().optional(),
  active: z.boolean(),
  external_id: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  category: z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    name: z.string(),
    is_anchor_item: z.boolean(),
    display_order: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
  }).optional(),
  
  // Enriched fields
  formalityBand: FormalityBandSchema,
  weatherWeight: z.number().int().min(0).max(3),
});

/**
 * Generated Outfit Schema
 * 
 * Validates complete generated outfits with all metadata.
 * Ensures required categories (shirt, pants, shoes) are present.
 */
export const GeneratedOutfitSchema = z.object({
  items: z.object({
    jacket: EnrichedItemSchema.optional(),
    overshirt: EnrichedItemSchema.optional(),
    shirt: EnrichedItemSchema, // Required
    undershirt: EnrichedItemSchema.optional(),
    pants: EnrichedItemSchema, // Required
    shoes: EnrichedItemSchema, // Required
    belt: EnrichedItemSchema.optional(),
    watch: EnrichedItemSchema.optional(),
  }),
  
  itemIds: z.array(z.string().uuid()).min(3, 'At least 3 items required (shirt, pants, shoes)'),
  
  scores: z.object({
    overall: CompatibilityScoreSchema,
    pairwise: z.record(z.string(), CompatibilityScoreSchema),
  }),
  
  swappable: z.record(z.string(), z.boolean()),
  
  weatherContext: WeatherContextSchema,
  generatedAt: z.date(),
});

/**
 * Generation Options Schema
 * 
 * Validates input parameters for outfit generation.
 */
export const GenerationOptionsSchema = z.object({
  wardrobeItems: z.array(z.any()).min(3, 'At least 3 wardrobe items required'), // Simplified validation
  weatherContext: WeatherContextSchema,
  excludeItems: z.array(z.string().uuid()).optional(),
  preferredCapsules: z.array(z.string()).optional(),
});

/**
 * Swap Options Schema
 * 
 * Validates input parameters for item swapping.
 */
export const SwapOptionsSchema = z.object({
  currentOutfit: GeneratedOutfitSchema,
  category: z.string().min(1, 'Category is required'),
  wardrobeItems: z.array(z.any()).min(1, 'At least 1 wardrobe item required'), // Simplified validation
  weatherContext: WeatherContextSchema,
});

// Type inference from schemas
export type WeatherContext = z.infer<typeof WeatherContextSchema>;
export type ColorCategory = z.infer<typeof ColorCategorySchema>;
export type FormalityBand = z.infer<typeof FormalityBandSchema>;
export type CompatibilityScore = z.infer<typeof CompatibilityScoreSchema>;
export type EnrichedItem = z.infer<typeof EnrichedItemSchema>;
export type GeneratedOutfit = z.infer<typeof GeneratedOutfitSchema>;
export type GenerationOptions = z.infer<typeof GenerationOptionsSchema>;
export type SwapOptions = z.infer<typeof SwapOptionsSchema>;
