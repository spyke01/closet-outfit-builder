import { useQuery } from '@tanstack/react-query';
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
