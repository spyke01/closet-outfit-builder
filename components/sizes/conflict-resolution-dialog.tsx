'use client';

/**
 * Conflict Resolution Dialog Component
 * 
 * Displays sync conflicts and allows users to choose resolution strategy:
 * - Keep my changes (use local data)
 * - Use server version (discard local changes)
 * - View both (show side-by-side comparison)
 * 
 * Requirements: 12.5
 */
import { useState, useEffect } from 'react';
import { AlertCircle, Check, X, Eye } from 'lucide-react';
import type { SyncConflict, ConflictResolution } from '@/lib/utils/offline-sync';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface ConflictResolutionDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  
  /**
   * Conflicts to resolve
   */
  conflicts: SyncConflict[];
  
  /**
   * Callback when user chooses a resolution
   */
  onResolve: (conflictId: string, resolution: ConflictResolution) => void;
  
  /**
   * Callback when dialog is closed
   */
  onClose: () => void;
}

export function ConflictResolutionDialog({
  isOpen,
  conflicts,
  onResolve,
  onClose,
}: ConflictResolutionDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewingBoth, setViewingBoth] = useState(false);
  
  // Reset state when conflicts change
  useEffect(() => {
    setCurrentIndex(0);
    setViewingBoth(false);
  }, [conflicts]);
  
  // Handle escape key to close dialog
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  if (conflicts.length === 0 || !isOpen) {
    return null;
  }
  
  const currentConflict = conflicts[currentIndex];
  const isLastConflict = currentIndex === conflicts.length - 1;
  
  const handleResolve = (resolution: ConflictResolution) => {
    if (resolution === 'view-both') {
      setViewingBoth(true);
      return;
    }
    
    onResolve(currentConflict.id, resolution);
    
    if (isLastConflict) {
      onClose();
    } else {
      setCurrentIndex(prev => prev + 1);
      setViewingBoth(false);
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const formatData = (data: Record<string, unknown> | null | undefined) => {
    if (!data) return {};
    
    // Format common fields for display
    const fields: Record<string, string> = {};

    if (data.name) fields['Name'] = String(data.name);
    if (data.primary_size) fields['Primary Size'] = String(data.primary_size);
    if (data.secondary_size) fields['Secondary Size'] = String(data.secondary_size);
    if (data.brand_name) fields['Brand'] = String(data.brand_name);
    if (data.size) fields['Size'] = String(data.size);
    if (data.fit_scale) fields['Fit Scale'] = String(data.fit_scale);
    if (data.notes) fields['Notes'] = String(data.notes);
    if (data.measurements) fields['Measurements'] = JSON.stringify(data.measurements, null, 2);
    if (data.display_mode) fields['Display Mode'] = String(data.display_mode);
    if (data.display_order !== undefined) fields['Display Order'] = String(data.display_order);
    
    return fields;
  };
  
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-dialog-title"
        aria-describedby="conflict-dialog-description"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="border-b p-6">
            <h2 id="conflict-dialog-title" className="text-xl font-semibold">
              Sync Conflict Detected
              {conflicts.length > 1 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({currentIndex + 1} of {conflicts.length})
                </span>
              )}
            </h2>
            <p id="conflict-dialog-description" className="mt-2 text-sm text-muted-foreground">
              Your local changes conflict with changes made on another device or session.
              Choose how to resolve this conflict.
            </p>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Alert */}
            <Alert variant="warning" className="flex gap-3 p-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <AlertDescription className="text-sm">
                <strong>{currentConflict.entity}</strong> was modified both locally and on the server.
              </AlertDescription>
            </Alert>
            
            {!viewingBoth ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Local version */}
                  <div className="rounded-lg border border-secondary/40 bg-secondary/20 p-4">
                    <h3 className="font-semibold text-foreground mb-2">
                      Your Changes
                    </h3>
                    <p className="text-sm text-primary mb-3">
                      Modified: {formatTimestamp(currentConflict.localTimestamp)}
                    </p>
                    <div className="space-y-2 text-sm">
                      {Object.entries(formatData(currentConflict.localData)).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span>{' '}
                          <span className="text-muted-foreground">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Server version */}
                  <div className="rounded-lg border border-border bg-muted p-4">
                    <h3 className="font-semibold text-foreground mb-2">
                      Server Version
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Modified: {formatTimestamp(currentConflict.serverTimestamp)}
                    </p>
                    <div className="space-y-2 text-sm">
                      {Object.entries(formatData(currentConflict.serverData)).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span>{' '}
                          <span className="text-muted-foreground">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => handleResolve('view-both')}
                    className="px-4 py-2 border border-border rounded-md hover:bg-secondary/70 hover:border-foreground/25 transition-colors w-full sm:w-auto"
                  >
                    <Eye className="inline mr-2 h-4 w-4" aria-hidden="true" />
                    View Both
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve('use-server')}
                    className="px-4 py-2 border border-border rounded-md hover:bg-secondary/70 hover:border-foreground/25 transition-colors w-full sm:w-auto"
                  >
                    <X className="inline mr-2 h-4 w-4" aria-hidden="true" />
                    Use Server Version
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve('keep-local')}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 transition-colors w-full sm:w-auto"
                  >
                    <Check className="inline mr-2 h-4 w-4" aria-hidden="true" />
                    Keep My Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Side-by-Side Comparison</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium">Field</th>
                          <th className="text-left py-2 px-3 font-medium bg-secondary/20">Your Changes</th>
                          <th className="text-left py-2 px-3 font-medium bg-muted">Server Version</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys({
                          ...formatData(currentConflict.localData),
                          ...formatData(currentConflict.serverData),
                        }).map(key => {
                          const localValue = formatData(currentConflict.localData)[key];
                          const serverValue = formatData(currentConflict.serverData)[key];
                          const isDifferent = localValue !== serverValue;
                          
                          return (
                            <tr key={key} className={isDifferent ? 'bg-yellow-50' : ''}>
                              <td className="py-2 px-3 font-medium">{key}</td>
                              <td className="py-2 px-3 bg-secondary/20">{localValue || '-'}</td>
                              <td className="py-2 px-3 bg-muted">{serverValue || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-3 text-xs text-muted-foreground">
                    <p>
                      <strong>Your changes:</strong> {formatTimestamp(currentConflict.localTimestamp)}
                    </p>
                    <p>
                      <strong>Server version:</strong> {formatTimestamp(currentConflict.serverTimestamp)}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setViewingBoth(false)}
                    className="px-4 py-2 border border-border rounded-md hover:bg-secondary/70 hover:border-foreground/25 transition-colors w-full sm:w-auto"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve('use-server')}
                    className="px-4 py-2 border border-border rounded-md hover:bg-secondary/70 hover:border-foreground/25 transition-colors w-full sm:w-auto"
                  >
                    <X className="inline mr-2 h-4 w-4" aria-hidden="true" />
                    Use Server Version
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve('keep-local')}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 transition-colors w-full sm:w-auto"
                  >
                    <Check className="inline mr-2 h-4 w-4" aria-hidden="true" />
                    Keep My Changes
                  </button>
                </div>
              </div>
            )}
            
            {conflicts.length > 1 && !isLastConflict && (
              <p className="text-sm text-muted-foreground text-center">
                {conflicts.length - currentIndex - 1} more conflict{conflicts.length - currentIndex - 1 !== 1 ? 's' : ''} to resolve
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
