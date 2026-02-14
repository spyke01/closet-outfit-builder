'use client'

/**
 * ErrorDisplay Component
 * 
 * Reusable component for displaying user-friendly error messages.
 * Handles different error types with appropriate messaging and actions.
 * 
 * Features:
 * - Connection failure errors with retry option
 * - Constraint violation errors with user-friendly messages
 * - Generic error fallback
 * - Accessible error announcements with ARIA live regions
 * - Optional retry callback
 * 
 * Requirements: 10.1, 12.3
 */

import { useCallback } from 'react'
import { AlertCircle, RefreshCw, X } from 'lucide-react'

export interface ErrorDisplayProps {
  error: Error | string | null
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

/**
 * Parse error message and determine error type
 */
function parseError(error: Error | string): {
  type: 'connection' | 'constraint' | 'auth' | 'generic'
  message: string
  userMessage: string
} {
  const errorMessage = typeof error === 'string' ? error : error.message

  // Connection failures
  if (
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('Network request failed') ||
    errorMessage.includes('Unable to connect')
  ) {
    return {
      type: 'connection',
      message: errorMessage,
      userMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
    }
  }

  // Constraint violations
  if (
    errorMessage.includes('unique constraint') ||
    errorMessage.includes('duplicate key') ||
    errorMessage.includes('already exists')
  ) {
    return {
      type: 'constraint',
      message: errorMessage,
      userMessage: 'This item already exists. Please use a different name or update the existing item.',
    }
  }

  // Foreign key violations
  if (
    errorMessage.includes('foreign key') ||
    errorMessage.includes('not found') ||
    errorMessage.includes('does not exist')
  ) {
    return {
      type: 'constraint',
      message: errorMessage,
      userMessage: 'The referenced item could not be found. It may have been deleted.',
    }
  }

  // Authentication errors
  if (
    errorMessage.includes('authenticated') ||
    errorMessage.includes('Access denied') ||
    errorMessage.includes('Unauthorized')
  ) {
    return {
      type: 'auth',
      message: errorMessage,
      userMessage: 'You must be signed in to perform this action.',
    }
  }

  // Generic error
  return {
    type: 'generic',
    message: errorMessage,
    userMessage: errorMessage,
  }
}

/**
 * ErrorDisplay Component
 * 
 * Displays error messages with appropriate styling and actions.
 * 
 * @param error - Error object or string to display
 * @param onRetry - Optional callback for retry action
 * @param onDismiss - Optional callback for dismiss action
 * @param className - Optional additional CSS classes
 */
export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  className = '',
}: ErrorDisplayProps) {
  const handleRetry = useCallback(() => {
    onRetry?.()
  }, [onRetry])

  const handleDismiss = useCallback(() => {
    onDismiss?.()
  }, [onDismiss])

  if (!error) return null

  const { type, userMessage } = parseError(error)
  const isWarningType = type === 'connection' || type === 'auth'

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={`rounded-lg border p-4 ${
        isWarningType
          ? 'border-warning/40 bg-warning-light text-warning-dark dark:border-warning/60 dark:bg-warning-dark/20 dark:text-amber-200'
          : 'border-danger/40 bg-danger-light text-danger-dark dark:border-danger/60 dark:bg-danger-dark/20 dark:text-red-200'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* Error icon */}
        <AlertCircle
          className={`h-5 w-5 flex-shrink-0 ${
            isWarningType
              ? 'text-warning dark:text-amber-300'
              : 'text-danger dark:text-red-300'
          }`}
          aria-hidden="true"
        />

        {/* Error message */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${
              isWarningType
                ? 'text-warning-dark dark:text-amber-200'
                : 'text-danger-dark dark:text-red-200'
            }`}
          >
            {userMessage}
          </p>

          {/* Action buttons */}
          {(onRetry || onDismiss) && (
            <div className="mt-3 flex items-center gap-2">
              {onRetry && (
                <button
                  onClick={handleRetry}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isWarningType
                      ? 'bg-warning text-warning-dark hover:opacity-90 focus-visible:ring-ring dark:text-amber-950'
                      : 'bg-destructive text-destructive-foreground hover:opacity-90 focus-visible:ring-ring'
                  }`}
                  aria-label="Retry action"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Retry
                </button>
              )}

              {onDismiss && (
                <button
                  onClick={handleDismiss}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isWarningType
                      ? 'text-warning-dark hover:bg-warning-light/50 focus-visible:ring-ring dark:text-amber-200 dark:hover:bg-warning-dark/30'
                      : 'text-danger-dark hover:bg-danger-light/50 focus-visible:ring-ring dark:text-red-200 dark:hover:bg-danger-dark/30'
                  }`}
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
