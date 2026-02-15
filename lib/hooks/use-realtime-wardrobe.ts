'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-client';
import { useAuth } from './use-auth';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscribe to realtime updates for wardrobe items
 * Automatically invalidates TanStack Query cache when changes occur
 *
 * This hook listens for background removal status changes and image URL updates
 * via Supabase Realtime, then invalidates the query cache to trigger UI re-renders.
 */
export function useWardrobeRealtime() {
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Only subscribe if authenticated
    if (!isAuthenticated || !userId) {
      return;
    }

    const supabase = createClient();

    // Create a unique channel for this user's wardrobe items
    const channel = supabase
      .channel(`wardrobe-changes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'wardrobe_items',
          filter: `user_id=eq.${userId}`, // Only get changes for this user
        },
        (payload) => {
          console.log('[Realtime] Wardrobe change:', payload.eventType, payload);

          // Invalidate cache to trigger refetch
          // This ensures data consistency and is simpler than direct cache updates
          queryClient.invalidateQueries({
            queryKey: queryKeys.wardrobe.items(userId),
          });

          // Also invalidate the specific item if it's an UPDATE/DELETE
          if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            const itemId = (payload.new?.id || payload.old?.id) as string;
            if (itemId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.wardrobe.item(itemId),
              });
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to wardrobe changes');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error:', err);
        }
        if (status === 'TIMED_OUT') {
          console.error('[Realtime] Connection timed out');
        }
      });

    channelRef.current = channel;

    // Cleanup function: unsubscribe when component unmounts
    return () => {
      console.log('[Realtime] Unsubscribing from wardrobe changes');
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, isAuthenticated, queryClient]);

  return {
    isConnected: channelRef.current?.state === 'joined',
  };
}
