import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { UserPreferences, UserPreferencesSchema } from '@/lib/schemas';
import { useAuth } from './use-auth';


// Create a singleton Supabase client to prevent recreation
const supabase = createClient();

// Query keys for user preferences
export const userPreferencesKeys = {
  all: ['userPreferences'] as const,
  byUser: (userId: string) => ['userPreferences', userId] as const,
};

// Default preferences
const defaultPreferences: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  theme: 'system',
  show_brands: true,
  weather_enabled: true,
  default_tuck_style: 'Untucked',
};

// Fetch user preferences
async function fetchUserPreferences(userId: string): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No preferences found, create default ones
      const newPreferences = {
        user_id: userId,
        ...defaultPreferences,
      };

      const { data: created, error: createError } = await supabase
        .from('user_preferences')
        .insert(newPreferences)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return UserPreferencesSchema.parse(created);
    }
    throw error;
  }

  return UserPreferencesSchema.parse(data);
}

// Update user preferences
async function updateUserPreferences(
  userId: string,
  updates: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from('user_preferences')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return UserPreferencesSchema.parse(data);
}

// Hook to fetch user preferences
export function useUserPreferences() {
  const { user, loading: authLoading } = useAuth();

  // Stable user ID to prevent query key changes
  const userId = user?.id;

  return useQuery({
    queryKey: userPreferencesKeys.byUser(userId || ''),
    queryFn: () => fetchUserPreferences(userId!),
    enabled: !!userId && !authLoading,
    staleTime: 15 * 60 * 1000, // 15 minutes - prevent frequent refetches
    gcTime: 60 * 60 * 1000, // 1 hour - keep in cache longer
    retry: 1, // Retry once only
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    structuralSharing: false, // Disable to prevent deep comparison issues
  });
}

// Hook to update user preferences
export function useUpdateUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) =>
      updateUserPreferences(user!.id, updates),
    onMutate: async (updates) => {
      if (!user?.id) return;

      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: userPreferencesKeys.byUser(user.id) });

      // Snapshot the previous value
      const previousPreferences = queryClient.getQueryData<UserPreferences>(
        userPreferencesKeys.byUser(user.id)
      );

      // Optimistically update to the new value
      if (previousPreferences) {
        const optimisticData = {
          ...previousPreferences,
          ...updates,
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData<UserPreferences>(
          userPreferencesKeys.byUser(user.id),
          optimisticData
        );
      }

      return { previousPreferences };
    },
    onError: (_err, _updates, context) => {
      // Rollback on error
      if (context?.previousPreferences && user?.id) {
        queryClient.setQueryData(
          userPreferencesKeys.byUser(user.id),
          context.previousPreferences
        );
      }
    },
    onSuccess: (data) => {
      // Update the cache with the actual server response without triggering refetch
      if (user?.id) {
        queryClient.setQueryData(userPreferencesKeys.byUser(user.id), data);
      }
    },
    onSettled: () => {
      // Don't invalidate queries to prevent refetch loops
      // The optimistic update and onSuccess should handle cache updates
    },
  });
}

// Hook to reset preferences to defaults
export function useResetUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => updateUserPreferences(user!.id, defaultPreferences),
    onSuccess: (data) => {
      // Update cache directly instead of invalidating to prevent refetch
      if (user?.id) {
        queryClient.setQueryData(userPreferencesKeys.byUser(user.id), data);
      }
    },
    onSettled: () => {
      // Don't invalidate to prevent unnecessary refetches
    },
  });
}

// Hook to get a specific preference value
export function usePreference<K extends keyof UserPreferences>(key: K): UserPreferences[K] | undefined {
  const { data: preferences } = useUserPreferences();
  return preferences?.[key];
}

// Hook to update a specific preference
export function useUpdatePreference() {
  const updatePreferences = useUpdateUserPreferences();

  return {
    updatePreference: <K extends keyof UserPreferences>(
      key: K,
      value: UserPreferences[K]
    ) => {
      return updatePreferences.mutate({ [key]: value } as any);
    },
    isLoading: updatePreferences.isPending,
    error: updatePreferences.error,
  };
}