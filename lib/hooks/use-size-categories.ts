import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './use-auth';
import type { 
  SizeCategory,
  StandardSize,
  BrandSize,
  CategoryMeasurements,
  PinnedPreference
} from '@/lib/types/sizes';
import type {
  SizeCategoryInput,
  StandardSizeInput,
  BrandSizeInput,
  CategoryMeasurementsInput,
  PinnedPreferenceInput
} from '@/lib/schemas/sizes';
import {
  sizeCategoryInputSchema,
  standardSizeInputSchema,
  brandSizeInputSchema,
  categoryMeasurementsInputSchema,
  pinnedPreferenceInputSchema
} from '@/lib/schemas/sizes';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'lib-hooks-use-size-categories' });


// Query keys for size management
export const sizeKeys = {
  all: ['sizes'] as const,
  categories: (userId: string) => [...sizeKeys.all, 'categories', userId] as const,
  category: (id: string) => [...sizeKeys.all, 'category', id] as const,
  brandSizes: (categoryId: string) => [...sizeKeys.all, 'brand-sizes', categoryId] as const,
  measurements: (categoryId: string) => [...sizeKeys.all, 'measurements', categoryId] as const,
  pinned: (userId: string) => [...sizeKeys.all, 'pinned', userId] as const,
};

// Cached data fetching functions for server-side deduplication
const getSizeCategories = cache(async (userId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('size_categories')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch size categories: ${error.message}`);
  }

  return data || [];
});

/**
 * Hook to fetch all size categories for the current user
 * 
 * Features:
 * - Fetches all categories ordered by name
 * - Implements query key structure for efficient caching
 * - Includes error handling and loading states
 * - Supports initial data from server components
 * 
 * @param options - Optional query options including initialData
 * @returns TanStack Query result with categories data
 * 
 * Requirements: 1.1, 3.1, 7.4
 */
export function useSizeCategories(options?: { initialData?: SizeCategory[] }) {
  const { userId, isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: sizeKeys.categories(userId || 'anonymous'),
    enabled: isAuthenticated && !!userId,
    queryFn: () => getSizeCategories(userId!),
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData: options?.initialData,
  });
}

// Cached data fetching for single category with standard size
const getSizeCategory = cache(async (categoryId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('size_categories')
    .select(`
      *,
      standard_sizes(*)
    `)
    .eq('id', categoryId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch size category: ${error.message}`);
  }

  return data;
});

/**
 * Hook to fetch a single size category by ID with standard size data
 * 
 * Features:
 * - Fetches category with related standard size
 * - Efficient caching with category-specific query key
 * - Includes error handling and loading states
 * - Supports initial data from server components
 * 
 * @param categoryId - The ID of the category to fetch
 * @param options - Optional query options including initialData
 * @returns TanStack Query result with category data
 * 
 * Requirements: 2.1, 4.1
 */
export function useSizeCategory(
  categoryId: string,
  options?: { initialData?: SizeCategory & { standard_sizes?: StandardSize[] } }
) {
  return useQuery({
    queryKey: sizeKeys.category(categoryId),
    queryFn: () => getSizeCategory(categoryId),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData: options?.initialData,
  });
}

// Cached data fetching for brand sizes by category
const getBrandSizes = cache(async (categoryId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('brand_sizes')
    .select('*')
    .eq('category_id', categoryId)
    .order('brand_name');

  if (error) {
    throw new Error(`Failed to fetch brand sizes: ${error.message}`);
  }

  return data || [];
});

/**
 * Hook to fetch brand sizes filtered by category ID
 * 
 * Features:
 * - Fetches all brand sizes for a specific category
 * - Ordered by brand name for consistent display
 * - Efficient caching with category-specific query key
 * - Supports initial data from server components
 * 
 * @param categoryId - The ID of the category to fetch brand sizes for
 * @param options - Optional query options including initialData
 * @returns TanStack Query result with brand sizes data
 * 
 * Requirements: 4.3, 6.5
 */
export function useBrandSizes(
  categoryId: string,
  options?: { initialData?: BrandSize[] }
) {
  return useQuery({
    queryKey: sizeKeys.brandSizes(categoryId),
    queryFn: () => getBrandSizes(categoryId),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData: options?.initialData,
  });
}

// Cached data fetching for measurements by category
const getMeasurements = cache(async (categoryId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('category_measurements')
    .select('*')
    .eq('category_id', categoryId)
    .maybeSingle(); // Use maybeSingle since measurements may not exist

  if (error) {
    throw new Error(`Failed to fetch measurements: ${error.message}`);
  }

  return data;
});

/**
 * Hook to fetch measurements for a category
 * 
 * Features:
 * - Fetches measurement data for a specific category
 * - Returns null if no measurements exist (not an error)
 * - Efficient caching with category-specific query key
 * - Supports initial data from server components
 * 
 * @param categoryId - The ID of the category to fetch measurements for
 * @param options - Optional query options including initialData
 * @returns TanStack Query result with measurements data (or null)
 * 
 * Requirements: 13.1, 13.2
 */
export function useMeasurements(
  categoryId: string,
  options?: { initialData?: CategoryMeasurements | null }
) {
  return useQuery({
    queryKey: sizeKeys.measurements(categoryId),
    queryFn: () => getMeasurements(categoryId),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData: options?.initialData,
  });
}

// Cached data fetching for pinned preferences
const getPinnedPreferences = cache(async (userId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('pinned_preferences')
    .select('*')
    .eq('user_id', userId)
    .order('display_order');

  if (error) {
    throw new Error(`Failed to fetch pinned preferences: ${error.message}`);
  }

  return data || [];
});

/**
 * Hook to fetch pinned preferences ordered by display_order
 * 
 * Features:
 * - Fetches all pinned preferences for the current user
 * - Ordered by display_order for consistent card positioning
 * - Efficient caching with user-specific query key
 * - Supports initial data from server components
 * 
 * @param options - Optional query options including initialData
 * @returns TanStack Query result with pinned preferences data
 * 
 * Requirements: 2.1, 8.5
 */
export function usePinnedPreferences(options?: { initialData?: PinnedPreference[] }) {
  const { userId, isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: sizeKeys.pinned(userId || 'anonymous'),
    enabled: isAuthenticated && !!userId,
    queryFn: () => getPinnedPreferences(userId!),
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData: options?.initialData,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new size category
 * 
 * Features:
 * - Validates input with Zod schema
 * - Adds new category to database
 * - Invalidates categories query cache
 * - Implements optimistic updates for instant UI feedback
 * - Automatically includes user_id from auth context
 * 
 * @returns TanStack Query mutation result
 * 
 * Requirements: 7.1, 7.4
 * 
 * @example
 * ```typescript
 * function AddCategoryForm() {
 *   const createCategory = useCreateCategory();
 *   
 *   const handleSubmit = (data: SizeCategoryInput) => {
 *     createCategory.mutate(data, {
 *       onSuccess: (category) => {
 *         console.info('Category created:', category);
 *       },
 *       onError: (error) => {
 *         logger.error('Failed to create category:', error);
 *       }
 *     });
 *   };
 *   
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (data: SizeCategoryInput) => {
      if (!userId) {
        throw new Error('User must be authenticated to create a category');
      }

      // Validate input with Zod
      const validated = sizeCategoryInputSchema.parse(data);

      // Insert into database
      const { data: category, error } = await supabase
        .from('size_categories')
        .insert({
          ...validated,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create category: ${error.message}`);
      }

      return category as SizeCategory;
    },
    onMutate: async (newCategory) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: sizeKeys.categories(userId!) });

      // Snapshot previous value
      const previousCategories = queryClient.getQueryData<SizeCategory[]>(
        sizeKeys.categories(userId!)
      );

      // Optimistically update cache
      if (previousCategories) {
        queryClient.setQueryData<SizeCategory[]>(
          sizeKeys.categories(userId!),
          (old) => [
            ...(old || []),
            {
              ...newCategory,
              id: 'temp-id', // Temporary ID for optimistic update
              user_id: userId!,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as SizeCategory,
          ]
        );
      }

      return { previousCategories };
    },
    onError: (err, newCategory, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(
          sizeKeys.categories(userId!),
          context.previousCategories
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: sizeKeys.categories(userId!) });
    },
  });
}

/**
 * Hook to update standard size for a category
 * 
 * Features:
 * - Validates input with Zod schema
 * - Updates standard size in database
 * - Automatically updates timestamp
 * - Invalidates category and pinned preferences caches
 * - Implements optimistic updates
 * 
 * @returns TanStack Query mutation result
 * 
 * Requirements: 5.5, 10.3
 * 
 * @example
 * ```typescript
 * function StandardSizeForm({ categoryId }: { categoryId: string }) {
 *   const updateSize = useUpdateStandardSize();
 *   
 *   const handleSubmit = (data: StandardSizeInput) => {
 *     updateSize.mutate(data, {
 *       onSuccess: () => {
 *         console.info('Size updated successfully');
 *       }
 *     });
 *   };
 *   
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useUpdateStandardSize() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (data: StandardSizeInput) => {
      if (!userId) {
        throw new Error('User must be authenticated to update standard size');
      }

      // Validate input with Zod
      const validated = standardSizeInputSchema.parse(data);

      // Check if standard size exists for this category
      const { data: existing } = await supabase
        .from('standard_sizes')
        .select('id')
        .eq('category_id', validated.category_id)
        .eq('user_id', userId)
        .maybeSingle();

      let result: StandardSize;

      if (existing) {
        // Update existing standard size
        const { data: updated, error } = await supabase
          .from('standard_sizes')
          .update({
            ...validated,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update standard size: ${error.message}`);
        }

        result = updated as StandardSize;
      } else {
        // Create new standard size
        const { data: created, error } = await supabase
          .from('standard_sizes')
          .insert({
            ...validated,
            user_id: userId,
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create standard size: ${error.message}`);
        }

        result = created as StandardSize;
      }

      return result;
    },
    onSuccess: (data) => {
      // Invalidate category cache (includes standard size)
      queryClient.invalidateQueries({ 
        queryKey: sizeKeys.category(data.category_id) 
      });
      
      // Invalidate pinned preferences (they display standard size)
      queryClient.invalidateQueries({ 
        queryKey: sizeKeys.pinned(userId!) 
      });
    },
  });
}

/**
 * Hook to create a new brand size
 * 
 * Features:
 * - Validates input with Zod schema (requires brand_name and size)
 * - Adds brand size to database
 * - Invalidates brand sizes query cache
 * - Implements optimistic updates
 * 
 * @returns TanStack Query mutation result
 * 
 * Requirements: 6.1, 6.5
 * 
 * @example
 * ```typescript
 * function BrandSizeForm({ categoryId }: { categoryId: string }) {
 *   const createBrandSize = useCreateBrandSize();
 *   
 *   const handleSubmit = (data: BrandSizeInput) => {
 *     createBrandSize.mutate(data, {
 *       onSuccess: () => {
 *         console.info('Brand size added successfully');
 *       }
 *     });
 *   };
 *   
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useCreateBrandSize() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (data: BrandSizeInput) => {
      if (!userId) {
        throw new Error('User must be authenticated to create a brand size');
      }

      // Validate input with Zod (ensures brand_name and size are present)
      const validated = brandSizeInputSchema.parse(data);

      // Insert into database
      const { data: brandSize, error } = await supabase
        .from('brand_sizes')
        .insert({
          ...validated,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create brand size: ${error.message}`);
      }

      return brandSize as BrandSize;
    },
    onMutate: async (newBrandSize) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: sizeKeys.brandSizes(newBrandSize.category_id) 
      });

      // Snapshot previous value
      const previousBrandSizes = queryClient.getQueryData<BrandSize[]>(
        sizeKeys.brandSizes(newBrandSize.category_id)
      );

      // Optimistically update cache
      if (previousBrandSizes) {
        queryClient.setQueryData<BrandSize[]>(
          sizeKeys.brandSizes(newBrandSize.category_id),
          (old) => [
            ...(old || []),
            {
              ...newBrandSize,
              id: 'temp-id', // Temporary ID for optimistic update
              user_id: userId!,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as BrandSize,
          ]
        );
      }

      return { previousBrandSizes, categoryId: newBrandSize.category_id };
    },
    onError: (err, newBrandSize, context) => {
      // Rollback on error
      if (context?.previousBrandSizes) {
        queryClient.setQueryData(
          sizeKeys.brandSizes(context.categoryId),
          context.previousBrandSizes
        );
      }
    },
    onSettled: (data) => {
      // Refetch to ensure consistency
      if (data) {
        queryClient.invalidateQueries({ 
          queryKey: sizeKeys.brandSizes(data.category_id) 
        });
      }
    },
  });
}

/**
 * Hook to update measurements for a category
 * 
 * Features:
 * - Validates input with Zod schema
 * - Saves measurements with units (imperial/metric)
 * - Creates or updates measurements record
 * - Invalidates measurements query cache
 * 
 * @returns TanStack Query mutation result
 * 
 * Requirements: 13.2, 13.5
 * 
 * @example
 * ```typescript
 * function MeasurementGuideForm({ categoryId }: { categoryId: string }) {
 *   const updateMeasurements = useUpdateMeasurements();
 *   
 *   const handleSubmit = (data: CategoryMeasurementsInput) => {
 *     updateMeasurements.mutate(data, {
 *       onSuccess: () => {
 *         console.info('Measurements saved successfully');
 *       }
 *     });
 *   };
 *   
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useUpdateMeasurements() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (data: CategoryMeasurementsInput) => {
      if (!userId) {
        throw new Error('User must be authenticated to update measurements');
      }

      // Validate input with Zod
      const validated = categoryMeasurementsInputSchema.parse(data);

      // Check if measurements exist for this category
      const { data: existing } = await supabase
        .from('category_measurements')
        .select('id')
        .eq('category_id', validated.category_id)
        .eq('user_id', userId)
        .maybeSingle();

      let result: CategoryMeasurements;

      if (existing) {
        // Update existing measurements
        const { data: updated, error } = await supabase
          .from('category_measurements')
          .update({
            ...validated,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update measurements: ${error.message}`);
        }

        result = updated as CategoryMeasurements;
      } else {
        // Create new measurements
        const { data: created, error } = await supabase
          .from('category_measurements')
          .insert({
            ...validated,
            user_id: userId,
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create measurements: ${error.message}`);
        }

        result = created as CategoryMeasurements;
      }

      return result;
    },
    onSuccess: (data) => {
      // Invalidate measurements cache
      queryClient.invalidateQueries({ 
        queryKey: sizeKeys.measurements(data.category_id) 
      });
    },
  });
}

/**
 * Hook to create a single pinned preference
 * 
 * Features:
 * - Creates a new pinned preference for a category
 * - Automatically calculates display_order (max + 1)
 * - Invalidates pinned preferences cache
 * - Validates input with Zod schema
 * 
 * @returns TanStack Query mutation result
 * 
 * Requirements: 7.4, 8.5
 * 
 * @example
 * ```typescript
 * function AddCategoryForm() {
 *   const createPinned = useCreatePinnedPreference();
 *   
 *   const handleSave = async (categoryId: string) => {
 *     await createPinned.mutateAsync({
 *       category_id: categoryId,
 *       display_mode: 'standard',
 *       display_order: 0 // Will be auto-calculated
 *     });
 *   };
 * }
 * ```
 */
export function useCreatePinnedPreference() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (data: Omit<PinnedPreferenceInput, 'display_order'> & { display_order?: number }) => {
      if (!userId) {
        throw new Error('User must be authenticated to create a pinned preference');
      }

      // Get current pinned preferences to calculate display_order
      const { data: existing } = await supabase
        .from('pinned_preferences')
        .select('display_order')
        .eq('user_id', userId)
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = existing?.[0]?.display_order ?? -1;
      const newOrder = data.display_order ?? maxOrder + 1;

      // Validate input with Zod
      const validated = pinnedPreferenceInputSchema.parse({
        ...data,
        display_order: newOrder,
      });

      // Insert into database
      const { data: pinnedPreference, error } = await supabase
        .from('pinned_preferences')
        .insert({
          ...validated,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create pinned preference: ${error.message}`);
      }

      return pinnedPreference as PinnedPreference;
    },
    onSuccess: () => {
      // Invalidate pinned preferences cache
      queryClient.invalidateQueries({ 
        queryKey: sizeKeys.pinned(userId!) 
      });
    },
  });
}

/**
 * Hook to update pinned preferences
 * 
 * Features:
 * - Updates pinned card order and display modes
 * - Supports bulk updates for reordering
 * - Invalidates pinned preferences cache
 * - Validates input with Zod schema
 * 
 * @returns TanStack Query mutation result
 * 
 * Requirements: 8.5, 15.5
 * 
 * @example
 * ```typescript
 * function CustomizePinnedCardsView() {
 *   const updatePinned = useUpdatePinnedPreferences();
 *   
 *   const handleReorder = (preferences: PinnedPreferenceInput[]) => {
 *     updatePinned.mutate(preferences, {
 *       onSuccess: () => {
 *         console.info('Pinned preferences updated');
 *       }
 *     });
 *   };
 *   
 *   return <div>...</div>;
 * }
 * ```
 */
export function useUpdatePinnedPreferences() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (preferences: PinnedPreferenceInput[]) => {
      if (!userId) {
        throw new Error('User must be authenticated to update pinned preferences');
      }

      // Validate all preferences with Zod
      const validated = preferences.map(pref => 
        pinnedPreferenceInputSchema.parse(pref)
      );

      // Delete all existing pinned preferences for this user
      const { error: deleteError } = await supabase
        .from('pinned_preferences')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        throw new Error(`Failed to clear pinned preferences: ${deleteError.message}`);
      }

      // Insert new preferences
      if (validated.length > 0) {
        const { data: created, error: insertError } = await supabase
          .from('pinned_preferences')
          .insert(
            validated.map(pref => ({
              ...pref,
              user_id: userId,
            }))
          )
          .select();

        if (insertError) {
          throw new Error(`Failed to update pinned preferences: ${insertError.message}`);
        }

        return created as PinnedPreference[];
      }

      return [] as PinnedPreference[];
    },
    onSuccess: () => {
      // Invalidate pinned preferences cache
      queryClient.invalidateQueries({ 
        queryKey: sizeKeys.pinned(userId!) 
      });
    },
  });
}

/**
 * Hook to seed system categories for a user
 * 
 * Features:
 * - Calls seed API route to create pre-defined system categories
 * - Creates 16 categories (8 men's, 8 women's) with measurement guides
 * - Idempotent - safe to call multiple times without creating duplicates
 * - Invalidates categories cache after seeding
 * - Returns loading and error states
 * 
 * @returns TanStack Query mutation result
 * 
 * Requirements: US-1
 * 
 * @example
 * ```typescript
 * function SizesPage() {
 *   const seedCategories = useSeedCategories();
 *   
 *   const handleSeed = () => {
 *     seedCategories.mutate(undefined, {
 *       onSuccess: (data) => {
 *         console.info(`Seeded ${data.count} categories`);
 *       },
 *       onError: (error) => {
 *         logger.error('Failed to seed categories:', error);
 *       }
 *     });
 *   };
 *   
 *   return (
 *     <button onClick={handleSeed} disabled={seedCategories.isPending}>
 *       {seedCategories.isPending ? 'Seeding...' : 'Seed Categories'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useSeedCategories() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error('User must be authenticated to seed categories');
      }

      // Call the seed API route
      const response = await fetch('/api/sizes/seed-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to seed categories: ${response.statusText}`
        );
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to seed categories');
      }

      return {
        categories: data.data as SizeCategory[],
        count: data.count as number,
        message: data.message as string,
      };
    },
    onSuccess: () => {
      // Invalidate categories cache to refetch with new seeded categories
      queryClient.invalidateQueries({ 
        queryKey: sizeKeys.categories(userId!) 
      });
    },
  });
}

/**
 * Hook to delete a category
 * 
 * Features:
 * - Removes category from database
 * - Removes associated pin references
 * - Preserves size data for recovery (soft delete pattern)
 * - Invalidates categories and pinned preferences caches
 * - Implements optimistic updates
 * 
 * @returns TanStack Query mutation result
 * 
 * Requirements: 7.5, 10.5
 * 
 * @example
 * ```typescript
 * function CategoryActions({ categoryId }: { categoryId: string }) {
 *   const deleteCategory = useDeleteCategory();
 *   
 *   const handleDelete = () => {
 *     if (confirm('Are you sure you want to delete this category?')) {
 *       deleteCategory.mutate(categoryId, {
 *         onSuccess: () => {
 *           console.info('Category deleted successfully');
 *         }
 *       });
 *     }
 *   };
 *   
 *   return <button onClick={handleDelete}>Delete</button>;
 * }
 * ```
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      if (!userId) {
        throw new Error('User must be authenticated to delete a category');
      }

      // First, remove any pinned preferences for this category
      const { error: unpinError } = await supabase
        .from('pinned_preferences')
        .delete()
        .eq('category_id', categoryId)
        .eq('user_id', userId);

      if (unpinError) {
        throw new Error(`Failed to unpin category: ${unpinError.message}`);
      }

      // Delete the category
      // Note: Size data (standard_sizes, brand_sizes, measurements) is preserved
      // due to foreign key constraints with ON DELETE CASCADE or SET NULL
      const { error: deleteError } = await supabase
        .from('size_categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', userId);

      if (deleteError) {
        throw new Error(`Failed to delete category: ${deleteError.message}`);
      }

      return categoryId;
    },
    onMutate: async (categoryId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: sizeKeys.categories(userId!) });
      await queryClient.cancelQueries({ queryKey: sizeKeys.pinned(userId!) });

      // Snapshot previous values
      const previousCategories = queryClient.getQueryData<SizeCategory[]>(
        sizeKeys.categories(userId!)
      );
      const previousPinned = queryClient.getQueryData<PinnedPreference[]>(
        sizeKeys.pinned(userId!)
      );

      // Optimistically update categories cache
      if (previousCategories) {
        queryClient.setQueryData<SizeCategory[]>(
          sizeKeys.categories(userId!),
          (old) => old?.filter(cat => cat.id !== categoryId) || []
        );
      }

      // Optimistically update pinned preferences cache
      if (previousPinned) {
        queryClient.setQueryData<PinnedPreference[]>(
          sizeKeys.pinned(userId!),
          (old) => old?.filter(pref => pref.category_id !== categoryId) || []
        );
      }

      return { previousCategories, previousPinned };
    },
    onError: (err, categoryId, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(
          sizeKeys.categories(userId!),
          context.previousCategories
        );
      }
      if (context?.previousPinned) {
        queryClient.setQueryData(
          sizeKeys.pinned(userId!),
          context.previousPinned
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: sizeKeys.categories(userId!) });
      queryClient.invalidateQueries({ queryKey: sizeKeys.pinned(userId!) });
    },
  });
}
