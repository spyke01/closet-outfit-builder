/**
 * Hook for managing offline sync for My Sizes feature
 * 
 * Features:
 * - Monitors online/offline status
 * - Automatically syncs queued mutations when connection is restored
 * - Provides sync status to UI components
 * - Handles conflict detection and resolution
 * 
 * Requirements: 10.1, 10.4, 12.5
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getOfflineQueue,
  getSyncStatus,
  syncQueuedMutations,
  setupOnlineListeners,
  isOnline,
  updateSyncStatus,
  type SyncStatus,
  type SyncConflict,
  type QueuedMutation,
} from '@/lib/utils/offline-sync';

export interface UseOfflineSyncOptions {
  /**
   * Callback to execute a queued mutation
   * Should return the result or throw an error
   */
  executeMutation?: (mutation: QueuedMutation) => Promise<any>;
  
  /**
   * Callback when conflicts are detected
   */
  onConflicts?: (conflicts: SyncConflict[]) => void;
  
  /**
   * Auto-sync when coming online (default: true)
   */
  autoSync?: boolean;
}

export function useOfflineSync(options: UseOfflineSyncOptions = {}) {
  const { executeMutation, onConflicts, autoSync = true } = options;
  const queryClient = useQueryClient();
  
  const [online, setOnline] = useState(isOnline());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  
  // Update sync status from localStorage
  const refreshSyncStatus = useCallback(() => {
    setSyncStatus(getSyncStatus());
  }, []);
  
  // Sync queued mutations
  const sync = useCallback(async () => {
    if (!executeMutation) {
      console.warn('No executeMutation function provided to useOfflineSync');
      return;
    }
    
    if (!online) {
      console.log('Cannot sync while offline');
      return;
    }
    
    const queue = getOfflineQueue();
    if (queue.length === 0) {
      return;
    }
    
    try {
      const detectedConflicts = await syncQueuedMutations(queryClient, executeMutation);
      
      if (detectedConflicts.length > 0) {
        setConflicts(detectedConflicts);
        onConflicts?.(detectedConflicts);
      }
      
      refreshSyncStatus();
    } catch (error) {
      console.error('Sync failed:', error);
      refreshSyncStatus();
    }
  }, [online, executeMutation, queryClient, onConflicts, refreshSyncStatus]);
  
  // Set up online/offline listeners
  useEffect(() => {
    const cleanup = setupOnlineListeners(
      () => {
        setOnline(true);
        updateSyncStatus({ syncError: undefined });
      },
      () => {
        setOnline(false);
      }
    );
    
    return cleanup;
  }, []);
  
  // Auto-sync when coming online
  useEffect(() => {
    if (online && autoSync && syncStatus.hasQueuedMutations && !syncStatus.isSyncing) {
      // Small delay to ensure connection is stable
      const timer = setTimeout(() => {
        sync();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [online, autoSync, syncStatus.hasQueuedMutations, syncStatus.isSyncing, sync]);
  
  // Listen for sync status changes
  useEffect(() => {
    const handleSyncStatusChange = (event: CustomEvent<SyncStatus>) => {
      setSyncStatus(event.detail);
    };
    
    window.addEventListener('sync-status-changed', handleSyncStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('sync-status-changed', handleSyncStatusChange as EventListener);
    };
  }, []);
  
  return {
    online,
    syncStatus,
    conflicts,
    sync,
    refreshSyncStatus,
    hasQueuedMutations: syncStatus.hasQueuedMutations,
    isSyncing: syncStatus.isSyncing,
    syncError: syncStatus.syncError,
  };
}
