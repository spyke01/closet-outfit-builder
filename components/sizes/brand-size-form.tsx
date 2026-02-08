'use client'

/**
 * BrandSizeForm Component
 * 
 * Form for adding/editing brand-specific sizes with:
 * - Searchable brand name dropdown with free text fallback
 * - Optional item type field
 * - Size input field
 * - 5-point fit scale selector
 * - Optional notes textarea
 * - react-hook-form integration with zodResolver
 * - Proper ARIA labels and autocomplete attributes
 * - Functional setState for stable callbacks
 * 
 * Requirements: 6.1-6.4, 14.1-14.3
 */

import { useCallback, useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Check } from 'lucide-react'
import { brandSizeInputSchema, type BrandSizeInput } from '@/lib/schemas/sizes'
import { useCreateBrandSize, useBrandSizes } from '@/lib/hooks/use-size-categories'
import type { BrandSize } from '@/lib/types/sizes'

export interface BrandSizeFormProps {
  categoryId: string
  brandSize?: BrandSize // Undefined for new, populated for edit
  onSave: () => void
  onCancel: () => void
}

/**
 * Fit scale labels and descriptions
 */
const FIT_SCALE_OPTIONS = [
  { value: 1, label: 'Runs Small', description: 'Size down' },
  { value: 2, label: 'Slightly Small', description: 'Consider sizing down' },
  { value: 3, label: 'True to Size', description: 'Order your usual size' },
  { value: 4, label: 'Slightly Large', description: 'Consider sizing up' },
  { value: 5, label: 'Runs Large', description: 'Size up' },
]

export function BrandSizeForm({ 
  categoryId, 
  brandSize, 
  onSave, 
  onCancel 
}: BrandSizeFormProps) {
  // Fetch existing brand sizes to populate dropdown
  const { data: existingBrandSizes = [] } = useBrandSizes(categoryId)
  
  // Create brand size mutation
  const createBrandSize = useCreateBrandSize()
  
  // Brand name search state
  const [brandSearchQuery, setBrandSearchQuery] = useState('')
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  
  // Extract unique brand names from existing brand sizes
  const uniqueBrandNames = useMemo(() => {
    const names = new Set<string>()
    existingBrandSizes.forEach(bs => {
      if (bs.brand_name) {
        names.add(bs.brand_name)
      }
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [existingBrandSizes])
  
  // Filter brand names based on search query
  const filteredBrandNames = useMemo(() => {
    if (!brandSearchQuery) return uniqueBrandNames
    const query = brandSearchQuery.toLowerCase()
    return uniqueBrandNames.filter(name => 
      name.toLowerCase().includes(query)
    )
  }, [uniqueBrandNames, brandSearchQuery])
  
  // Initialize form with react-hook-form and zodResolver
  const form = useForm<BrandSizeInput>({
    resolver: zodResolver(brandSizeInputSchema),
    defaultValues: {
      category_id: categoryId,
      brand_name: brandSize?.brand_name || '',
      item_type: brandSize?.item_type || '',
      size: brandSize?.size || '',
      fit_scale: brandSize?.fit_scale || 3, // Default to "True to Size"
      notes: brandSize?.notes || '',
    },
  })
  
  // Watch brand_name field for search functionality
  const brandNameValue = form.watch('brand_name')
  
  // Update search query when brand_name changes
  useEffect(() => {
    setBrandSearchQuery(brandNameValue || '')
  }, [brandNameValue])
  
  // Handle brand name selection from dropdown
  const handleBrandSelect = useCallback((brandName: string) => {
    form.setValue('brand_name', brandName, { shouldValidate: true })
    setShowBrandDropdown(false)
  }, [form])
  
  // Handle form submission
  const onSubmit = useCallback(async (data: BrandSizeInput) => {
    try {
      await createBrandSize.mutateAsync(data)
      onSave()
    } catch (error) {
      // Error handling is done by the mutation hook
      console.error('Failed to save brand size:', error)
    }
  }, [createBrandSize, onSave])
  
  return (
    <form 
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6"
    >
      {/* Brand Name Field with Searchable Dropdown */}
      <div className="form-field">
        <label 
          htmlFor="brand-name" 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Brand Name <span className="text-red-500" aria-label="required">*</span>
        </label>
        <div className="relative">
          <input
            id="brand-name"
            type="text"
            autoComplete="organization"
            {...form.register('brand_name')}
            onFocus={() => setShowBrandDropdown(true)}
            onBlur={() => {
              // Delay to allow click on dropdown item
              setTimeout(() => setShowBrandDropdown(false), 200)
            }}
            aria-required="true"
            aria-invalid={!!form.formState.errors.brand_name}
            aria-describedby="brand-name-error brand-name-hint"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Nike, Levi's, Gap"
          />
          
          {/* Dropdown with previously entered brand names */}
          {showBrandDropdown && filteredBrandNames.length > 0 && (
            <div 
              className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
              role="listbox"
              aria-label="Previously entered brand names"
            >
              {filteredBrandNames.map((brandName) => (
                <button
                  key={brandName}
                  type="button"
                  onClick={() => handleBrandSelect(brandName)}
                  className="w-full px-3 py-2 text-left text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                  role="option"
                  aria-selected={brandNameValue === brandName}
                >
                  {brandName}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <span id="brand-name-hint" className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter the clothing brand name
        </span>
        
        {form.formState.errors.brand_name && (
          <span 
            id="brand-name-error" 
            role="alert" 
            className="block mt-1 text-sm text-red-600 dark:text-red-400"
          >
            {form.formState.errors.brand_name.message}
          </span>
        )}
      </div>
      
      {/* Item Type Field (Optional) */}
      <div className="form-field">
        <label 
          htmlFor="item-type" 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Item Type <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          id="item-type"
          type="text"
          autoComplete="off"
          {...form.register('item_type')}
          aria-describedby="item-type-hint"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Jeans, Dress Shirt, Sneakers"
        />
        <span id="item-type-hint" className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
          Specify the type of item (e.g., "Jeans", "Dress Shirt")
        </span>
      </div>
      
      {/* Size Field */}
      <div className="form-field">
        <label 
          htmlFor="size-value" 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Size <span className="text-red-500" aria-label="required">*</span>
        </label>
        <input
          id="size-value"
          type="text"
          autoComplete="off"
          {...form.register('size')}
          aria-required="true"
          aria-invalid={!!form.formState.errors.size}
          aria-describedby="size-error size-format-hint"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., M, 32, 32x34"
        />
        <span id="size-format-hint" className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter size in any supported format
        </span>
        {form.formState.errors.size && (
          <span 
            id="size-error" 
            role="alert" 
            className="block mt-1 text-sm text-red-600 dark:text-red-400"
          >
            {form.formState.errors.size.message}
          </span>
        )}
      </div>
      
      {/* Fit Scale Selector */}
      <div className="form-field">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Fit Scale <span className="text-red-500" aria-label="required">*</span>
        </label>
        <div 
          role="radiogroup" 
          aria-label="Fit scale selector"
          className="space-y-2"
        >
          {FIT_SCALE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-colors bg-white dark:bg-gray-800"
            >
              <input
                type="radio"
                value={option.value}
                {...form.register('fit_scale', { valueAsNumber: true })}
                className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                aria-describedby={`fit-scale-${option.value}-description`}
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {option.label}
                </div>
                <div 
                  id={`fit-scale-${option.value}-description`}
                  className="text-xs text-gray-500 dark:text-gray-400"
                >
                  {option.description}
                </div>
              </div>
            </label>
          ))}
        </div>
        {form.formState.errors.fit_scale && (
          <span 
            role="alert" 
            className="block mt-2 text-sm text-red-600 dark:text-red-400"
          >
            {form.formState.errors.fit_scale.message}
          </span>
        )}
      </div>
      
      {/* Notes Field (Optional) */}
      <div className="form-field">
        <label 
          htmlFor="notes" 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Notes <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          {...form.register('notes')}
          aria-describedby="notes-hint"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          placeholder="Add any additional notes about this brand's sizing..."
        />
        <span id="notes-hint" className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
          Optional notes about fit, quality, or sizing quirks
        </span>
        {form.formState.errors.notes && (
          <span 
            role="alert" 
            className="block mt-1 text-sm text-red-600 dark:text-red-400"
          >
            {form.formState.errors.notes.message}
          </span>
        )}
      </div>
      
      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="Cancel adding brand size"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={form.formState.isSubmitting || createBrandSize.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Save brand size"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {form.formState.isSubmitting || createBrandSize.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
      
      {/* Error message from mutation */}
      {createBrandSize.isError && (
        <div 
          role="alert" 
          className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
        >
          <p className="text-sm text-red-800 dark:text-red-300">
            Failed to save brand size. Please try again.
          </p>
        </div>
      )}
    </form>
  )
}
