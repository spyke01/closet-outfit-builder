'use client'

/**
 * StandardSizeForm Component
 * 
 * Form for adding/editing standard sizes for a category.
 * Supports all sizing formats (letter, numeric, waist/inseam, measurements).
 * Validates input based on category's supported formats.
 * Integrates with react-hook-form and zodResolver for validation.
 * 
 * Requirements: 5.1-5.4
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { standardSizeInputSchema, type StandardSizeInput } from '@/lib/schemas/sizes'
import type { StandardSize, SizingFormat } from '@/lib/types/sizes'
import { useUpdateStandardSize } from '@/lib/hooks/use-size-categories'

export interface StandardSizeFormProps {
  categoryId: string
  standardSize?: StandardSize
  supportedFormats: SizingFormat[]
  onSave: () => void
  onCancel: () => void
}

export function StandardSizeForm({
  categoryId,
  standardSize,
  supportedFormats,
  onSave,
  onCancel
}: StandardSizeFormProps) {
  const updateStandardSize = useUpdateStandardSize()

  const form = useForm<StandardSizeInput>({
    resolver: zodResolver(standardSizeInputSchema),
    defaultValues: {
      category_id: categoryId,
      primary_size: standardSize?.primary_size || '',
      secondary_size: standardSize?.secondary_size || undefined,
      notes: standardSize?.notes || undefined
    }
  })

  const onSubmit = async (data: StandardSizeInput) => {
    try {
      await updateStandardSize.mutateAsync(data)
      onSave()
    } catch (error) {
      console.error('Failed to update standard size:', error)
    }
  }

  // Generate placeholder text based on supported formats
  const getSizePlaceholder = () => {
    const examples: string[] = []
    if (supportedFormats.includes('letter')) examples.push('M')
    if (supportedFormats.includes('numeric')) examples.push('10')
    if (supportedFormats.includes('waist-inseam')) examples.push('32x34')
    return examples.length > 0 ? `e.g., ${examples.join(', ')}` : 'Enter size'
  }

  // Generate helper text based on supported formats
  const getFormatHelperText = () => {
    const formats: string[] = []
    if (supportedFormats.includes('letter')) formats.push('letter (S, M, L)')
    if (supportedFormats.includes('numeric')) formats.push('numeric (8, 10)')
    if (supportedFormats.includes('waist-inseam')) formats.push('waist/inseam (32x34)')
    if (supportedFormats.includes('measurements')) formats.push('measurements')
    
    return formats.length > 0 
      ? `Supported formats: ${formats.join(', ')}`
      : 'Enter size in any format'
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {standardSize ? 'Edit Standard Size' : 'Add Standard Size'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close form"
          className="p-1 text-muted-foreground hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Primary Size Field */}
        <div className="form-field">
          <label 
            htmlFor="primary-size" 
            className="block text-sm font-medium text-muted-foreground"
          >
            Primary Size <span className="text-red-500" aria-label="required">*</span>
          </label>
          <input
            id="primary-size"
            type="text"
            autoComplete="off"
            placeholder={getSizePlaceholder()}
            aria-required="true"
            aria-invalid={!!form.formState.errors.primary_size}
            aria-describedby="primary-size-hint primary-size-error"
            className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm"
            {...form.register('primary_size')}
          />
          <p id="primary-size-hint" className="mt-1 text-xs text-muted-foreground">
            {getFormatHelperText()}
          </p>
          {form.formState.errors.primary_size && (
            <p 
              id="primary-size-error" 
              role="alert" 
              className="mt-1 text-sm text-red-600 dark:text-red-400"
            >
              {form.formState.errors.primary_size.message}
            </p>
          )}
        </div>

        {/* Secondary Size Field (Optional) */}
        <div className="form-field">
          <label 
            htmlFor="secondary-size" 
            className="block text-sm font-medium text-muted-foreground"
          >
            Secondary Size <span className="text-muted-foreground text-xs">(optional)</span>
          </label>
          <input
            id="secondary-size"
            type="text"
            autoComplete="off"
            placeholder={getSizePlaceholder()}
            aria-invalid={!!form.formState.errors.secondary_size}
            aria-describedby="secondary-size-hint secondary-size-error"
            className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm"
            {...form.register('secondary_size')}
          />
          <p id="secondary-size-hint" className="mt-1 text-xs text-muted-foreground">
            Optional alternative size (e.g., for between sizes)
          </p>
          {form.formState.errors.secondary_size && (
            <p 
              id="secondary-size-error" 
              role="alert" 
              className="mt-1 text-sm text-red-600 dark:text-red-400"
            >
              {form.formState.errors.secondary_size.message}
            </p>
          )}
        </div>

        {/* Notes Field (Optional) */}
        <div className="form-field">
          <label 
            htmlFor="size-notes" 
            className="block text-sm font-medium text-muted-foreground"
          >
            Notes <span className="text-muted-foreground text-xs">(optional)</span>
          </label>
          <textarea
            id="size-notes"
            rows={3}
            placeholder="Add any notes about fit, preferences, or sizing details..."
            aria-invalid={!!form.formState.errors.notes}
            aria-describedby="size-notes-hint size-notes-error"
            className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm resize-none"
            {...form.register('notes')}
          />
          <p id="size-notes-hint" className="mt-1 text-xs text-muted-foreground">
            Maximum 500 characters
          </p>
          {form.formState.errors.notes && (
            <p 
              id="size-notes-error" 
              role="alert" 
              className="mt-1 text-sm text-red-600 dark:text-red-400"
            >
              {form.formState.errors.notes.message}
            </p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          disabled={updateStandardSize.isPending}
          className="px-4 py-2 text-sm font-medium text-muted-foreground text-foreground bg-card border border-border rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={updateStandardSize.isPending}
          className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateStandardSize.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Error Display */}
      {updateStandardSize.isError && (
        <div 
          role="alert" 
          className="p-3 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
        >
          Failed to save standard size. Please try again.
        </div>
      )}
    </form>
  )
}
