/**
 * Zod validation schemas for My Sizes feature
 * 
 * These schemas provide runtime type validation for all size-related data.
 * Used with react-hook-form via zodResolver for form validation and
 * with TanStack Query mutations for API validation.
 * 
 * @example Form validation with react-hook-form
 * ```typescript
 * import { useForm } from 'react-hook-form';
 * import { zodResolver } from '@hookform/resolvers/zod';
 * import { sizeCategoryInputSchema, type SizeCategoryInput } from '@/lib/schemas/sizes';
 * 
 * function AddCategoryForm() {
 *   const form = useForm<SizeCategoryInput>({
 *     resolver: zodResolver(sizeCategoryInputSchema),
 *     defaultValues: {
 *       name: '',
 *       supported_formats: ['letter'],
 *       is_system_category: false
 *     }
 *   });
 * 
 *   return (
 *     <form onSubmit={form.handleSubmit((data) => console.log(data))}>
 *       <input {...form.register('name')} />
 *       {form.formState.errors.name && (
 *         <span>{form.formState.errors.name.message}</span>
 *       )}
 *     </form>
 *   );
 * }
 * ```
 * 
 * @example Mutation validation with TanStack Query
 * ```typescript
 * import { useMutation, useQueryClient } from '@tanstack/react-query';
 * import { sizeCategoryInputSchema } from '@/lib/schemas/sizes';
 * import { createClient } from '@/lib/supabase/client';
 * 
 * function useCreateCategory() {
 *   const queryClient = useQueryClient();
 *   const supabase = createClient();
 * 
 *   return useMutation({
 *     mutationFn: async (data: unknown) => {
 *       // Validate with Zod before sending to database
 *       const validated = sizeCategoryInputSchema.parse(data);
 * 
 *       const { data: category, error } = await supabase
 *         .from('size_categories')
 *         .insert(validated)
 *         .select()
 *         .single();
 * 
 *       if (error) throw error;
 *       return category;
 *     },
 *     onSuccess: () => {
 *       queryClient.invalidateQueries({ queryKey: ['sizes', 'categories'] });
 *     }
 *   });
 * }
 * ```
 */

import { z } from 'zod';

/**
 * Sizing format enum schema
 */
export const sizingFormatSchema = z.enum([
  'letter',
  'numeric',
  'waist-inseam',
  'measurements'
]);

/**
 * Display mode enum schema
 */
export const displayModeSchema = z.enum([
  'standard',
  'dual',
  'preferred-brand'
]);

/**
 * Measurement unit enum schema
 */
export const measurementUnitSchema = z.enum(['imperial', 'metric']);

/**
 * Size category schema
 * Validates clothing category data
 */
export const sizeCategorySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1, 'Category name is required').max(50, 'Category name must be 50 characters or less'),
  icon: z.string().optional(),
  supported_formats: z.array(sizingFormatSchema).min(1, 'At least one sizing format is required'),
  is_system_category: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

/**
 * Letter size validation (XS, S, M, L, XL, XXL, etc.)
 */
const letterSizeRegex = /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d*XS|\d*XL)$/i;

/**
 * Numeric size validation (2, 4, 6, 8, 10, etc.)
 */
const numericSizeRegex = /^\d+(\.\d+)?$/;

/**
 * Waist/inseam size validation (30x32, 32x34, etc.)
 */
const waistInseamSizeRegex = /^\d+x\d+$/;

/**
 * Size value validation - accepts multiple formats
 */
export const sizeValueSchema = z.string()
  .min(1, 'Size is required')
  .max(20, 'Size must be 20 characters or less')
  .refine(
    (val) => {
      return letterSizeRegex.test(val) || 
             numericSizeRegex.test(val) || 
             waistInseamSizeRegex.test(val);
    },
    {
      message: 'Size must be in letter format (S, M, L), numeric format (8, 10), or waist/inseam format (32x34)'
    }
  );

/**
 * Standard size schema
 * Validates user's standard/primary size for a category
 */
export const standardSizeSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  user_id: z.string().uuid(),
  primary_size: sizeValueSchema,
  secondary_size: sizeValueSchema.optional(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

/**
 * Fit scale validation (1-5: runs small to runs large)
 */
export const fitScaleSchema = z.number()
  .int('Fit scale must be a whole number')
  .min(1, 'Fit scale must be between 1 and 5')
  .max(5, 'Fit scale must be between 1 and 5');

/**
 * Brand size schema
 * Validates brand-specific size overrides
 */
export const brandSizeSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  user_id: z.string().uuid(),
  brand_name: z.string().min(1, 'Brand name is required').max(100, 'Brand name must be 100 characters or less'),
  item_type: z.string().max(100, 'Item type must be 100 characters or less').optional(),
  size: sizeValueSchema,
  fit_scale: fitScaleSchema,
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

/**
 * Measurement value validation (positive numbers only)
 */
export const measurementValueSchema = z.number()
  .positive('Measurement must be a positive number')
  .finite('Measurement must be a valid number');

/**
 * Category measurements schema
 * Validates body measurements for a category
 */
export const categoryMeasurementsSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  user_id: z.string().uuid(),
  measurements: z.record(z.string(), measurementValueSchema),
  unit: measurementUnitSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

/**
 * Pinned preference schema
 * Validates pinned card preferences and display settings
 */
export const pinnedPreferenceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  category_id: z.string().uuid(),
  display_order: z.number().int().nonnegative('Display order must be a non-negative number'),
  display_mode: displayModeSchema,
  preferred_brand_id: z.string().uuid().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

/**
 * Form input schemas (omit auto-generated fields)
 * Use these with react-hook-form zodResolver
 */

export const sizeCategoryInputSchema = sizeCategorySchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true
});

export const standardSizeInputSchema = standardSizeSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true
});

export const brandSizeInputSchema = brandSizeSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true
});

export const categoryMeasurementsInputSchema = categoryMeasurementsSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true
});

export const pinnedPreferenceInputSchema = pinnedPreferenceSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true
});

/**
 * Type inference from schemas
 * Use these types in components and hooks
 */
export type SizingFormat = z.infer<typeof sizingFormatSchema>;
export type DisplayMode = z.infer<typeof displayModeSchema>;
export type MeasurementUnit = z.infer<typeof measurementUnitSchema>;
export type SizeCategory = z.infer<typeof sizeCategorySchema>;
export type StandardSize = z.infer<typeof standardSizeSchema>;
export type BrandSize = z.infer<typeof brandSizeSchema>;
export type CategoryMeasurements = z.infer<typeof categoryMeasurementsSchema>;
export type PinnedPreference = z.infer<typeof pinnedPreferenceSchema>;

export type SizeCategoryInput = z.infer<typeof sizeCategoryInputSchema>;
export type StandardSizeInput = z.infer<typeof standardSizeInputSchema>;
export type BrandSizeInput = z.infer<typeof brandSizeInputSchema>;
export type CategoryMeasurementsInput = z.infer<typeof categoryMeasurementsInputSchema>;
export type PinnedPreferenceInput = z.infer<typeof pinnedPreferenceInputSchema>;
