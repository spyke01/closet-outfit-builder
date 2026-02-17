import { createLogger } from './logger';

const logger = createLogger({ component: 'lib-utils-offline-sync' });


/**
 * Offline Sync Manager for My Sizes Feature
 * 
 * Handles mutation queueing when offline and syncing when connection is restored.
 * Detects conflicts via timestamp comparison and provides resolution options.
 * 
 * Requirements: 10.1, 10.4, 12.5
 */

import { QueryClient } from '@tanstack/react-query';

export interface QueuedMutation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'category' | 'standard_size' | 'brand_size' | 'measurements' | 'pinned_preference';
  data: SyncEntityData;
  timestamp: number;
  userId: string;
}

export interface SyncConflict {
  id: string;
  entity: string;
  localData: SyncEntityData;
  serverData: SyncEntityData;
  localTimestamp: number;
  serverTimestamp: number;
}

export type ConflictResolution = 'keep-local' | 'use-server' | 'view-both';

const QUEUE_STORAGE_KEY = 'my-sizes-offline-queue';
const SYNC_STATUS_KEY = 'my-sizes-sync-status';

/**
 * Get the offline mutation queue from localStorage
 */
export function getOfflineQueue(): QueuedMutation[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    logger.error('Failed to read offline queue:', error);
    return [];
  }
}

/**
 * Add a mutation to the offline queue
 */
export function queueMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const queue = getOfflineQueue();
    const newMutation: QueuedMutation = {
      ...mutation,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    queue.push(newMutation);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    
    // Update sync status
    updateSyncStatus({ hasQueuedMutations: true, lastQueuedAt: Date.now() });
  } catch (error) {
    logger.error('Failed to queue mutation:', error);
  }
}

/**
 * Remove a mutation from the queue
 */
export function removeMutationFromQueue(mutationId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const queue = getOfflineQueue();
    const filtered = queue.filter(m => m.id !== mutationId);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(filtered));
    
    // Update sync status
    if (filtered.length === 0) {
      updateSyncStatus({ hasQueuedMutations: false });
    }
  } catch (error) {
    logger.error('Failed to remove mutation from queue:', error);
  }
}

/**
 * Clear the entire offline queue
 */
export function clearOfflineQueue(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
    updateSyncStatus({ hasQueuedMutations: false });
  } catch (error) {
    logger.error('Failed to clear offline queue:', error);
  }
}

/**
 * Get sync status
 */
export interface SyncStatus {
  hasQueuedMutations: boolean;
  lastQueuedAt?: number;
  lastSyncedAt?: number;
  isSyncing: boolean;
  syncError?: string;
}

export function getSyncStatus(): SyncStatus {
  if (typeof window === 'undefined') {
    return { hasQueuedMutations: false, isSyncing: false };
  }
  
  try {
    const stored = localStorage.getItem(SYNC_STATUS_KEY);
    return stored ? JSON.parse(stored) : { hasQueuedMutations: false, isSyncing: false };
  } catch (error) {
    logger.error('Failed to read sync status:', error);
    return { hasQueuedMutations: false, isSyncing: false };
  }
}

/**
 * Update sync status
 */
export function updateSyncStatus(updates: Partial<SyncStatus>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const current = getSyncStatus();
    const updated = { ...current, ...updates };
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updated));
    
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('sync-status-changed', { detail: updated }));
  } catch (error) {
    logger.error('Failed to update sync status:', error);
  }
}

/**
 * Detect conflicts by comparing timestamps
 */
export function detectConflict(
  localData: SyncEntityData | null,
  serverData: SyncEntityData | null
): boolean {
  if (!localData || !serverData || !localData.updated_at || !serverData.updated_at) {
    return false;
  }
  const localTimestamp = new Date(localData.updated_at).getTime();
  const serverTimestamp = new Date(serverData.updated_at).getTime();
  
  // Conflict if server data is newer than local data
  return serverTimestamp > localTimestamp;
}

/**
 * Create a conflict object for resolution
 */
export function createConflict(
  entity: string,
  localData: SyncEntityData,
  serverData: SyncEntityData
): SyncConflict {
  return {
    id: localData.id || serverData.id || '',
    entity,
    localData,
    serverData,
    localTimestamp: localData.updated_at ? new Date(localData.updated_at).getTime() : 0,
    serverTimestamp: serverData.updated_at ? new Date(serverData.updated_at).getTime() : 0,
  };
}

/**
 * Sync queued mutations when online
 * Returns conflicts that need user resolution
 */
export async function syncQueuedMutations(
  queryClient: QueryClient,
  executeMutation: (mutation: QueuedMutation) => Promise<{ conflict?: boolean; serverData?: SyncEntityData }>
): Promise<SyncConflict[]> {
  const queue = getOfflineQueue();
  
  if (queue.length === 0) {
    return [];
  }
  
  updateSyncStatus({ isSyncing: true, syncError: undefined });
  
  const conflicts: SyncConflict[] = [];
  const processed: string[] = [];
  
  try {
    for (const mutation of queue) {
      try {
        // Execute the mutation
        const result = await executeMutation(mutation);
        
        // Check for conflicts (server data newer than local)
        if (mutation.type === 'update' && result.conflict && result.serverData) {
          conflicts.push(createConflict(mutation.entity, mutation.data, result.serverData));
        }
        
        // Mark as processed
        processed.push(mutation.id);
      } catch (error) {
        logger.error(`Failed to sync mutation ${mutation.id}:`, error);
        // Continue with other mutations
      }
    }
    
    // Remove successfully processed mutations
    processed.forEach(id => removeMutationFromQueue(id));
    
    updateSyncStatus({
      isSyncing: false,
      lastSyncedAt: Date.now(),
      hasQueuedMutations: getOfflineQueue().length > 0,
    });
    
    return conflicts;
  } catch (error) {
    updateSyncStatus({
      isSyncing: false,
      syncError: error instanceof Error ? error.message : 'Unknown sync error',
    });
    throw error;
  }
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Set up online/offline event listeners
 */
export function setupOnlineListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
export interface SyncEntityData {
  id?: string;
  updated_at?: string;
  [key: string]: unknown;
}
