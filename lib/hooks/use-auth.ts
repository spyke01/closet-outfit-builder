import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// Create a singleton Supabase client to prevent recreation
const supabase = createClient();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Remove supabase.auth dependency to prevent re-runs

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