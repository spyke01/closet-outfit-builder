import React from 'react';
import { Loader2 } from 'lucide-react';
import type { BgRemovalStatus } from '@/lib/types/database';

export interface ProcessingIndicatorProps {
  status?: BgRemovalStatus;
  className?: string;
}

/**
 * ProcessingIndicator - Shows a subtle animated badge when background removal is in progress
 *
 * Displays:
 * - 'pending': Queued icon/badge
 * - 'processing': Animated spinner
 * - 'completed' or 'failed': Hidden
 *
 * Accessibility: Includes aria-live="polite" for screen reader announcements
 */
export function ProcessingIndicator({ status, className = '' }: ProcessingIndicatorProps) {
  // Hide indicator if status is completed, failed, or undefined
  if (!status || status === 'completed' || status === 'failed') {
    return null;
  }

  const isPending = status === 'pending';
  const isProcessing = status === 'processing';

  return (
    <div
      className={`absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/90 backdrop-blur-sm shadow-sm ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {isProcessing && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Processing...
          </span>
        </>
      )}
      {isPending && (
        <>
          <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/50 border-t-muted-foreground animate-spin" />
          <span className="text-xs font-medium text-muted-foreground">
            Queued
          </span>
        </>
      )}
    </div>
  );
}
