/**
 * Sync Status Indicator Component
 * 
 * Displays the current sync status and allows manual sync trigger.
 * Shows:
 * - Online/offline status
 * - Queued mutations count
 * - Sync in progress indicator
 * - Sync errors
 * 
 * Requirements: 10.4, 12.5
 */

'use client';

import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { useOfflineSync } from '@/lib/hooks/use-offline-sync';

export interface SyncStatusIndicatorProps {
  /**
   * Callback to execute a queued mutation
   */
  executeMutation?: (mutation: any) => Promise<any>;
  
  /**
   * Callback when conflicts are detected
   */
  onConflicts?: (conflicts: any[]) => void;
  
  /**
   * Whether to show detailed status (default: false)
   */
  showDetails?: boolean;
}

export function SyncStatusIndicator({
  executeMutation,
  onConflicts,
  showDetails = false,
}: SyncStatusIndicatorProps) {
  const {
    online,
    syncStatus,
    sync,
    hasQueuedMutations,
    isSyncing,
    syncError,
  } = useOfflineSync({
    executeMutation,
    onConflicts,
    autoSync: true,
  });
  
  const queueCount = syncStatus.hasQueuedMutations ? 'pending changes' : '';
  
  if (!showDetails && online && !hasQueuedMutations && !syncError) {
    // Don't show anything when everything is synced and online
    return null;
  }
  
  return (
    <div className="space-y-2">
      {/* Status indicator */}
      <div className="flex items-center gap-2 text-sm">
        {online ? (
          <>
            <Cloud className="h-4 w-4 text-green-600" aria-hidden="true" />
            <span className="text-green-700">Online</span>
          </>
        ) : (
          <>
            <CloudOff className="h-4 w-4 text-orange-600" aria-hidden="true" />
            <span className="text-orange-700">Offline</span>
          </>
        )}
        
        {isSyncing && (
          <>
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" />
            <span className="text-blue-700">Syncing...</span>
          </>
        )}
        
        {!isSyncing && hasQueuedMutations && (
          <>
            <span className="text-gray-600">•</span>
            <span className="text-gray-700">{queueCount}</span>
          </>
        )}
        
        {!isSyncing && !hasQueuedMutations && online && (
          <>
            <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
            <span className="text-green-700">All changes synced</span>
          </>
        )}
      </div>
      
      {/* Sync error alert */}
      {syncError && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-red-800">
            <strong>Sync failed:</strong> {syncError}
          </div>
        </div>
      )}
      
      {/* Offline notice */}
      {!online && hasQueuedMutations && (
        <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <CloudOff className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-blue-800">
            You're offline. Your changes will sync automatically when you're back online.
          </div>
        </div>
      )}
      
      {/* Manual sync button */}
      {online && hasQueuedMutations && !isSyncing && executeMutation && (
        <button
          type="button"
          onClick={sync}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm w-full sm:w-auto"
        >
          <RefreshCw className="inline mr-2 h-4 w-4" aria-hidden="true" />
          Sync Now
        </button>
      )}
      
      {/* Detailed status */}
      {showDetails && (
        <div className="text-xs text-gray-600 space-y-1">
          {syncStatus.lastQueuedAt && (
            <p>
              Last queued: {new Date(syncStatus.lastQueuedAt).toLocaleString()}
            </p>
          )}
          {syncStatus.lastSyncedAt && (
            <p>
              Last synced: {new Date(syncStatus.lastSyncedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
