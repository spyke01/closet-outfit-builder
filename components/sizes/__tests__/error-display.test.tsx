/**
 * ErrorDisplay Component Tests
 * 
 * Tests for error display component including:
 * - Validation error display
 * - Database error messages
 * - Connection failure handling
 * - Retry functionality
 * - Dismiss functionality
 * - Accessibility compliance
 * 
 * Requirements: 1.3, 6.1, 10.1, 12.1, 12.2, 12.3
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorDisplay } from '../error-display'

describe('ErrorDisplay', () => {
  describe('Error Type Detection', () => {
    it('should detect connection failures', () => {
      const error = new Error('Failed to fetch')
      render(<ErrorDisplay error={error} />)
      
      expect(screen.getByRole('alert')).toHaveTextContent(
        /unable to connect to the server/i
      )
    })

    it('should detect constraint violations', () => {
      const error = new Error('unique constraint violation')
      render(<ErrorDisplay error={error} />)
      
      expect(screen.getByRole('alert')).toHaveTextContent(
        /already exists/i
      )
    })

    it('should detect foreign key violations', () => {
      const error = new Error('foreign key constraint failed')
      render(<ErrorDisplay error={error} />)
      
      expect(screen.getByRole('alert')).toHaveTextContent(
        /could not be found/i
      )
    })

    it('should detect authentication errors', () => {
      const error = new Error('User must be authenticated')
      render(<ErrorDisplay error={error} />)
      
      expect(screen.getByRole('alert')).toHaveTextContent(
        /must be signed in/i
      )
    })

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong')
      render(<ErrorDisplay error={error} />)
      
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong'
      )
    })

    it('should handle string errors', () => {
      render(<ErrorDisplay error="Custom error message" />)
      
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Custom error message'
      )
    })
  })

  describe('Retry Functionality', () => {
    it('should display retry button when onRetry is provided', () => {
      const onRetry = vi.fn()
      render(<ErrorDisplay error="Test error" onRetry={onRetry} />)
      
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn()
      render(<ErrorDisplay error="Test error" onRetry={onRetry} />)
      
      const retryButton = screen.getByRole('button', { name: /retry/i })
      fireEvent.click(retryButton)
      
      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('should not display retry button when onRetry is not provided', () => {
      render(<ErrorDisplay error="Test error" />)
      
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })
  })

  describe('Dismiss Functionality', () => {
    it('should display dismiss button when onDismiss is provided', () => {
      const onDismiss = vi.fn()
      render(<ErrorDisplay error="Test error" onDismiss={onDismiss} />)
      
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
    })

    it('should call onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn()
      render(<ErrorDisplay error="Test error" onDismiss={onDismiss} />)
      
      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      fireEvent.click(dismissButton)
      
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('should not display dismiss button when onDismiss is not provided', () => {
      render(<ErrorDisplay error="Test error" />)
      
      expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument()
    })
  })

  describe('Null Error Handling', () => {
    it('should not render anything when error is null', () => {
      const { container } = render(<ErrorDisplay error={null} />)
      
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Accessibility', () => {
    it('should have role="alert" for screen readers', () => {
      render(<ErrorDisplay error="Test error" />)
      
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should have aria-live="polite" for dynamic updates', () => {
      render(<ErrorDisplay error="Test error" />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-live', 'polite')
    })

    it('should have aria-atomic="true" for complete announcements', () => {
      render(<ErrorDisplay error="Test error" />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-atomic', 'true')
    })

    it('should have aria-label on retry button', () => {
      const onRetry = vi.fn()
      render(<ErrorDisplay error="Test error" onRetry={onRetry} />)
      
      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toHaveAttribute('aria-label', 'Retry action')
    })

    it('should have aria-label on dismiss button', () => {
      const onDismiss = vi.fn()
      render(<ErrorDisplay error="Test error" onDismiss={onDismiss} />)
      
      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss error')
    })

    it('should hide icon from screen readers with aria-hidden', () => {
      render(<ErrorDisplay error="Test error" />)
      
      const alert = screen.getByRole('alert')
      const icon = alert.querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Visual Styling', () => {
    it('should apply connection error styling for connection failures', () => {
      const error = new Error('Failed to fetch')
      render(<ErrorDisplay error={error} />)
      
      const alert = screen.getByRole('alert')
      expect(alert.className).toContain('border-warning')
    })

    it('should apply auth error styling for authentication errors', () => {
      const error = new Error('User must be authenticated')
      render(<ErrorDisplay error={error} />)
      
      const alert = screen.getByRole('alert')
      expect(alert.className).toContain('border-warning')
    })

    it('should apply generic error styling for other errors', () => {
      const error = new Error('Something went wrong')
      render(<ErrorDisplay error={error} />)
      
      const alert = screen.getByRole('alert')
      expect(alert.className).toContain('border-danger')
    })

    it('should apply custom className when provided', () => {
      render(<ErrorDisplay error="Test error" className="custom-class" />)
      
      const alert = screen.getByRole('alert')
      expect(alert.className).toContain('custom-class')
    })
  })

  describe('User-Friendly Messages', () => {
    it('should provide user-friendly message for connection failures', () => {
      const error = new Error('Network request failed')
      render(<ErrorDisplay error={error} />)
      
      expect(screen.getByRole('alert')).toHaveTextContent(
        /check your internet connection/i
      )
    })

    it('should provide user-friendly message for duplicate entries', () => {
      const error = new Error('duplicate key value violates unique constraint')
      render(<ErrorDisplay error={error} />)
      
      expect(screen.getByRole('alert')).toHaveTextContent(
        /already exists/i
      )
    })

    it('should provide user-friendly message for missing references', () => {
      const error = new Error('Category not found')
      render(<ErrorDisplay error={error} />)
      
      expect(screen.getByRole('alert')).toHaveTextContent(
        /could not be found/i
      )
    })
  })

  describe('Multiple Actions', () => {
    it('should display both retry and dismiss buttons when both callbacks provided', () => {
      const onRetry = vi.fn()
      const onDismiss = vi.fn()
      render(<ErrorDisplay error="Test error" onRetry={onRetry} onDismiss={onDismiss} />)
      
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
    })

    it('should call correct callback for each button', () => {
      const onRetry = vi.fn()
      const onDismiss = vi.fn()
      render(<ErrorDisplay error="Test error" onRetry={onRetry} onDismiss={onDismiss} />)
      
      fireEvent.click(screen.getByRole('button', { name: /retry/i }))
      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onDismiss).not.toHaveBeenCalled()
      
      fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
      expect(onDismiss).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledTimes(1) // Still 1 from before
    })
  })
})
