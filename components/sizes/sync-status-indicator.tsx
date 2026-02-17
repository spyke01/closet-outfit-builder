'use client';

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
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { useOfflineSync } from '@/lib/hooks/use-offline-sync';
import type { QueuedMutation, SyncConflict, SyncEntityData } from '@/lib/utils/offline-sync';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface SyncStatusIndicatorProps {
  /**
   * Callback to execute a queued mutation
   */
  executeMutation?: (mutation: QueuedMutation) => Promise<{ conflict?: boolean; serverData?: SyncEntityData }>;
  
  /**
   * Callback when conflicts are detected
   */
  onConflicts?: (conflicts: SyncConflict[]) => void;
  
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
            <RefreshCw className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            <span className="text-primary">Syncing...</span>
          </>
        )}
        
        {!isSyncing && hasQueuedMutations && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{queueCount}</span>
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
        <Alert variant="destructive" className="flex gap-3 p-4">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <AlertDescription className="text-sm">
            <strong>Sync failed:</strong> {syncError}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Offline notice */}
      {!online && hasQueuedMutations && (
        <div className="flex gap-3 p-4 bg-secondary/20 border border-secondary/40 rounded-lg">
          <CloudOff className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-foreground">
            You&apos;re offline. Your changes will sync automatically when you&apos;re back online.
          </div>
        </div>
      )}
      
      {/* Manual sync button */}
      {online && hasQueuedMutations && !isSyncing && executeMutation && (
        <button
          type="button"
          onClick={sync}
          className="px-4 py-2 border border-border rounded-md hover:bg-secondary/70 hover:border-foreground/25 transition-colors text-sm w-full sm:w-auto"
        >
          <RefreshCw className="inline mr-2 h-4 w-4" aria-hidden="true" />
          Sync Now
        </button>
      )}
      
      {/* Detailed status */}
      {showDetails && (
        <div className="text-xs text-muted-foreground space-y-1">
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
