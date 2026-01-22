import { useQuery } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-client';
import type { 
  Category, 
  CreateCategoryInput, 
  UpdateCategoryInput 
} from '@/lib/types/database';
import { CategorySchema } from '@/lib/schemas';

import { useAuth } from './use-auth';

// Fetch all categories for the current user
export function useCategories() {
  const supabase = createClient();
  const { userId, isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.wardrobe.categories(userId || 'anonymous'),
    enabled: isAuthenticated && !!userId,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch categories: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories change less frequently
  });
}

// Fetch a single category by ID
export function useCategory(id: string) {
  const supabase = createClient();
  
  return useQuery({
    queryKey: queryKeys.wardrobe.category(id),
    queryFn: async (): Promise<Category> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch category: ${error.message}`);
      }

      return data;
    },
    enabled: !!id,
  });
}

// Fetch anchor categories (categories that can be used as anchor items)
export function useAnchorCategories() {
  const supabase = createClient();
  const { userId, isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['wardrobe', 'anchor-categories', userId || 'anonymous'],
    enabled: isAuthenticated && !!userId,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_anchor_item', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch anchor categories: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - anchor categories are very stable
  });
}

// Create a new category
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput): Promise<Category> => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Validate input with Zod
      const validatedInput = CategorySchema.omit({ 
        id: true, 
        user_id: true, 
        created_at: true, 
        updated_at: true 
      }).parse(input);
      
      const { data, error } = await supabase
        .from('categories')
        .insert({
          ...validatedInput,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create category: ${error.message}`);
      }

      return data;
    },
    onMutate: async (newCategory) => {
      if (!userId) return { previousCategories: null };

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.wardrobe.categories(userId) });

      // Snapshot the previous value
      const previousCategories = queryClient.getQueryData<Category[]>(
        queryKeys.wardrobe.categories(userId)
      );

      // Optimistically update to the new value
      if (previousCategories) {
        const optimisticCategory: Category = {
          id: `temp-${Date.now()}`,
          user_id: userId,
          ...newCategory,
          is_anchor_item: newCategory.is_anchor_item || false,
          display_order: newCategory.display_order || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Insert in the correct position based on display_order
        const sortedCategories = [...previousCategories, optimisticCategory].sort((a, b) => {
          if (a.display_order !== b.display_order) {
            return a.display_order - b.display_order;
          }
          return a.name.localeCompare(b.name);
        });

        queryClient.setQueryData<Category[]>(
          queryKeys.wardrobe.categories(userId),
          sortedCategories
        );
      }

      return { previousCategories };
    },
    onError: (err, newCategory, context) => {
      // Rollback on error
      if (context?.previousCategories && userId) {
        queryClient.setQueryData(
          queryKeys.wardrobe.categories(userId),
          context.previousCategories
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.all });
    },
  });
}

// Update an existing category
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateCategoryInput): Promise<Category> => {
      // Validate input with Zod
      const validatedInput = CategorySchema.omit({ 
        user_id: true, 
        created_at: true, 
        updated_at: true 
      }).partial().extend({ id: CategorySchema.shape.id }).parse(input);
      
      const { id, ...updateData } = validatedInput;
      
      const { data, error } = await supabase
        .from('categories')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update category: ${error.message}`);
      }

      return data;
    },
    onMutate: async (updatedCategory) => {
      if (!userId) return { previousCategories: null, previousCategory: null };

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.wardrobe.categories(userId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.wardrobe.category(updatedCategory.id) });

      // Snapshot the previous values
      const previousCategories = queryClient.getQueryData<Category[]>(
        queryKeys.wardrobe.categories(userId)
      );
      const previousCategory = queryClient.getQueryData<Category>(
        queryKeys.wardrobe.category(updatedCategory.id)
      );

      // Optimistically update the categories list
      if (previousCategories && userId) {
        const optimisticCategories = previousCategories.map(category =>
          category.id === updatedCategory.id
            ? { ...category, ...updatedCategory, updated_at: new Date().toISOString() }
            : category
        ).sort((a, b) => {
          if (a.display_order !== b.display_order) {
            return a.display_order - b.display_order;
          }
          return a.name.localeCompare(b.name);
        });

        queryClient.setQueryData(queryKeys.wardrobe.categories(userId), optimisticCategories);
      }

      // Optimistically update the single category
      if (previousCategory) {
        queryClient.setQueryData(
          queryKeys.wardrobe.category(updatedCategory.id),
          { ...previousCategory, ...updatedCategory, updated_at: new Date().toISOString() }
        );
      }

      return { previousCategories, previousCategory };
    },
    onError: (err, updatedCategory, context) => {
      // Rollback on error
      if (context?.previousCategories && userId) {
        queryClient.setQueryData(
          queryKeys.wardrobe.categories(userId),
          context.previousCategories
        );
      }
      if (context?.previousCategory) {
        queryClient.setQueryData(
          queryKeys.wardrobe.category(updatedCategory.id),
          context.previousCategory
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.category(variables.id) });
      
      // If anchor status changed, invalidate anchor categories
      if (variables.is_anchor_item !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['wardrobe', 'anchor-categories', userId] });
      }
    },
  });
}

// Delete a category
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Check if category has any items
      const { data: items, error: itemsError } = await supabase
        .from('wardrobe_items')
        .select('id')
        .eq('category_id', id)
        .eq('active', true)
        .limit(1);

      if (itemsError) {
        throw new Error(`Failed to check category items: ${itemsError.message}`);
      }

      if (items && items.length > 0) {
        throw new Error('Cannot delete category that contains wardrobe items');
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete category: ${error.message}`);
      }
    },
    onMutate: async (deletedId) => {
      if (!userId) return { previousCategories: null };

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.wardrobe.categories(userId) });

      // Snapshot the previous value
      const previousCategories = queryClient.getQueryData<Category[]>(
        queryKeys.wardrobe.categories(userId)
      );

      // Optimistically remove the category
      if (previousCategories) {
        const optimisticCategories = previousCategories.filter(category => category.id !== deletedId);
        queryClient.setQueryData(queryKeys.wardrobe.categories(userId), optimisticCategories);
      }

      return { previousCategories };
    },
    onError: (err, deletedId, context) => {
      // Rollback on error
      if (context?.previousCategories && userId) {
        queryClient.setQueryData(
          queryKeys.wardrobe.categories(userId),
          context.previousCategories
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.all });
      queryClient.invalidateQueries({ queryKey: ['wardrobe', 'anchor-categories', userId] });
    },
  });
}

// Reorder categories by updating display_order
export function useReorderCategories() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (categoryOrders: { id: string; display_order: number }[]): Promise<void> => {
      // Update all categories in a single transaction
      const updates = categoryOrders.map(({ id, display_order }) => 
        supabase
          .from('categories')
          .update({ 
            display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      
      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`Failed to reorder categories: ${errors[0].error?.message}`);
      }
    },
    onMutate: async (categoryOrders) => {
      if (!userId) return;
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.wardrobe.categories(userId) });

      // Snapshot the previous value
      const previousCategories = queryClient.getQueryData<Category[]>(
        queryKeys.wardrobe.categories(userId)
      );

      // Optimistically update the order
      if (previousCategories) {
        const orderMap = new Map(categoryOrders.map(co => [co.id, co.display_order]));
        
        const optimisticCategories = previousCategories.map(category => ({
          ...category,
          display_order: orderMap.get(category.id) ?? category.display_order,
          updated_at: new Date().toISOString(),
        })).sort((a, b) => {
          if (a.display_order !== b.display_order) {
            return a.display_order - b.display_order;
          }
          return a.name.localeCompare(b.name);
        });

        queryClient.setQueryData(queryKeys.wardrobe.categories(userId), optimisticCategories);
      }

      return { previousCategories };
    },
    onError: (err, categoryOrders, context) => {
      // Rollback on error
      if (context?.previousCategories && userId) {
        queryClient.setQueryData(
          queryKeys.wardrobe.categories(userId),
          context.previousCategories
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.categories(userId) });
      }
    },
  });
}