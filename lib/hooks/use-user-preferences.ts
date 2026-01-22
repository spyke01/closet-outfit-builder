import { useQuery } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { UserPreferences, UserPreferencesSchema } from '@/lib/schemas';
import { useAuth } from './use-auth';

// Default preferences
const defaultPreferences: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  theme: 'system',
  show_brands: true,
  weather_enabled: true,
  default_tuck_style: 'Untucked',
};

// Hook to fetch user preferences
export function useUserPreferences() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ['user-preferences', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      
      const supabase = createClient();
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

          if (createError) throw createError;
          return UserPreferencesSchema.parse(created);
        }
        throw error;
      }

      return UserPreferencesSchema.parse(data);
    },
    enabled: !!userId,
  });
}

// Hook to update user preferences
export function useUpdateUserPreferences() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!userId) throw new Error('No user ID');
      
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return UserPreferencesSchema.parse(data);
    },
    onSuccess: () => {
      // Simple invalidation - let TanStack Query handle the rest
      queryClient.invalidateQueries({ queryKey: ['user-preferences', userId] });
    },
  });
}

// Hook to reset preferences to defaults
export function useResetUserPreferences() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('No user ID');
      
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_preferences')
        .update(defaultPreferences)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return UserPreferencesSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences', userId] });
    },
  });
}

// Hook to get a specific preference value
export function usePreference<K extends keyof UserPreferences>(key: K): UserPreferences[K] | undefined {
  const { data: preferences } = useUserPreferences();
  return preferences?.[key];
}