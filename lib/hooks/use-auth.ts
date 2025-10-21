import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// Create a singleton Supabase client to prevent recreation
const supabase = createClient();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Memoize the auth state change handler to prevent effect re-runs
  const handleAuthStateChange = useCallback((event: string, session: any) => {
    setUser(session?.user ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleAuthStateChange]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    userId: user?.id || null,
  };
}

// Helper function to get current user ID
export function getCurrentUserId(): string {
  // This is a synchronous function that should be used carefully
  // In practice, you'd want to use the useAuth hook in components
  // For now, we'll throw an error to indicate proper auth context is needed
  throw new Error('Use useAuth hook to get user ID in components');
}