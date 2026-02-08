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
  if (!error) return null

  const { type, userMessage } = parseError(error)

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry()
    }
  }, [onRetry])

  const handleDismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss()
    }
  }, [onDismiss])

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={`rounded-lg border p-4 ${
        type === 'connection'
          ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20'
          : type === 'auth'
          ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* Error icon */}
        <AlertCircle
          className={`h-5 w-5 flex-shrink-0 ${
            type === 'connection'
              ? 'text-orange-600 dark:text-orange-400'
              : type === 'auth'
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-red-600 dark:text-red-400'
          }`}
          aria-hidden="true"
        />

        {/* Error message */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${
              type === 'connection'
                ? 'text-orange-800 dark:text-orange-300'
                : type === 'auth'
                ? 'text-yellow-800 dark:text-yellow-300'
                : 'text-red-800 dark:text-red-300'
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
                    type === 'connection'
                      ? 'bg-orange-600 text-white hover:bg-orange-700 focus-visible:ring-orange-500 dark:bg-orange-500 dark:hover:bg-orange-600'
                      : type === 'auth'
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700 focus-visible:ring-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600'
                      : 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600'
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
                    type === 'connection'
                      ? 'text-orange-700 hover:bg-orange-100 focus-visible:ring-orange-500 dark:text-orange-300 dark:hover:bg-orange-900/40'
                      : type === 'auth'
                      ? 'text-yellow-700 hover:bg-yellow-100 focus-visible:ring-yellow-500 dark:text-yellow-300 dark:hover:bg-yellow-900/40'
                      : 'text-red-700 hover:bg-red-100 focus-visible:ring-red-500 dark:text-red-300 dark:hover:bg-red-900/40'
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
