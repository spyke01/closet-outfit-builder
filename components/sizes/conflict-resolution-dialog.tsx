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

'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Check, X, Eye } from 'lucide-react';
import type { SyncConflict, ConflictResolution } from '@/lib/utils/offline-sync';

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
  
  const formatData = (data: any) => {
    if (!data) return {};
    
    // Format common fields for display
    const fields: Record<string, any> = {};
    
    if (data.name) fields['Name'] = data.name;
    if (data.primary_size) fields['Primary Size'] = data.primary_size;
    if (data.secondary_size) fields['Secondary Size'] = data.secondary_size;
    if (data.brand_name) fields['Brand'] = data.brand_name;
    if (data.size) fields['Size'] = data.size;
    if (data.fit_scale) fields['Fit Scale'] = data.fit_scale;
    if (data.notes) fields['Notes'] = data.notes;
    if (data.measurements) fields['Measurements'] = JSON.stringify(data.measurements, null, 2);
    if (data.display_mode) fields['Display Mode'] = data.display_mode;
    if (data.display_order !== undefined) fields['Display Order'] = data.display_order;
    
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
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b p-6">
            <h2 id="conflict-dialog-title" className="text-xl font-semibold">
              Sync Conflict Detected
              {conflicts.length > 1 && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({currentIndex + 1} of {conflicts.length})
                </span>
              )}
            </h2>
            <p id="conflict-dialog-description" className="mt-2 text-sm text-gray-600">
              Your local changes conflict with changes made on another device or session.
              Choose how to resolve this conflict.
            </p>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Alert */}
            <div className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-yellow-800">
                <strong>{currentConflict.entity}</strong> was modified both locally and on the server.
              </p>
            </div>
            
            {!viewingBoth ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Local version */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      Your Changes
                    </h3>
                    <p className="text-sm text-blue-700 mb-3">
                      Modified: {formatTimestamp(currentConflict.localTimestamp)}
                    </p>
                    <div className="space-y-2 text-sm">
                      {Object.entries(formatData(currentConflict.localData)).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span>{' '}
                          <span className="text-gray-700">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Server version */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Server Version
                    </h3>
                    <p className="text-sm text-gray-700 mb-3">
                      Modified: {formatTimestamp(currentConflict.serverTimestamp)}
                    </p>
                    <div className="space-y-2 text-sm">
                      {Object.entries(formatData(currentConflict.serverData)).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span>{' '}
                          <span className="text-gray-700">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => handleResolve('view-both')}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-full sm:w-auto"
                  >
                    <Eye className="inline mr-2 h-4 w-4" aria-hidden="true" />
                    View Both
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve('use-server')}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-full sm:w-auto"
                  >
                    <X className="inline mr-2 h-4 w-4" aria-hidden="true" />
                    Use Server Version
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve('keep-local')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors w-full sm:w-auto"
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
                          <th className="text-left py-2 px-3 font-medium bg-blue-50">Your Changes</th>
                          <th className="text-left py-2 px-3 font-medium bg-gray-50">Server Version</th>
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
                              <td className="py-2 px-3 bg-blue-50">{localValue || '-'}</td>
                              <td className="py-2 px-3 bg-gray-50">{serverValue || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-600">
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
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-full sm:w-auto"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve('use-server')}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-full sm:w-auto"
                  >
                    <X className="inline mr-2 h-4 w-4" aria-hidden="true" />
                    Use Server Version
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve('keep-local')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors w-full sm:w-auto"
                  >
                    <Check className="inline mr-2 h-4 w-4" aria-hidden="true" />
                    Keep My Changes
                  </button>
                </div>
              </div>
            )}
            
            {conflicts.length > 1 && !isLastConflict && (
              <p className="text-sm text-gray-600 text-center">
                {conflicts.length - currentIndex - 1} more conflict{conflicts.length - currentIndex - 1 !== 1 ? 's' : ''} to resolve
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
