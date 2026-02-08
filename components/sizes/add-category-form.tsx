'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateCategory, useCreatePinnedPreference } from '@/lib/hooks/use-size-categories';
import { sizeCategoryInputSchema, type SizeCategoryInput, type SizingFormat } from '@/lib/schemas/sizes';

export interface AddCategoryFormProps {
  onSave: () => void;
  onCancel: () => void;
}

const SIZING_FORMAT_OPTIONS: { value: SizingFormat; label: string; description: string }[] = [
  {
    value: 'letter',
    label: 'Letter Sizes',
    description: 'XS, S, M, L, XL, etc.',
  },
  {
    value: 'numeric',
    label: 'Numeric Sizes',
    description: '2, 4, 6, 8, 10, etc.',
  },
  {
    value: 'waist-inseam',
    label: 'Waist/Inseam',
    description: '30x32, 32x34, etc.',
  },
  {
    value: 'measurements',
    label: 'Measurements',
    description: 'Custom body measurements',
  },
];

const ICON_OPTIONS = ['👕', '👖', '👟', '🧥', '👔', '🧢', '🧤', '🧣', '👗', '👠'];

/**
 * AddCategoryForm Component
 * 
 * Form for creating new size categories with validation.
 * 
 * Features:
 * - Category name input with validation
 * - Optional icon selection
 * - Multi-select for supported sizing formats
 * - "Pin to top" toggle
 * - Integrates with react-hook-form and zodResolver
 * - Proper ARIA labels and error message associations
 * - Optionally creates pinned preference if "Pin to top" is checked
 * 
 * Requirements: 7.1, 7.4
 */
export function AddCategoryForm({ onSave, onCancel }: AddCategoryFormProps) {
  const createCategory = useCreateCategory();
  const createPinnedPreference = useCreatePinnedPreference();
  const [selectedIcon, setSelectedIcon] = useState<string | undefined>();

  const form = useForm<SizeCategoryInput & { pin_to_top?: boolean }>({
    resolver: zodResolver(
      sizeCategoryInputSchema.extend({
        pin_to_top: sizeCategoryInputSchema.shape.is_system_category.optional(),
      })
    ),
    defaultValues: {
      name: '',
      supported_formats: ['letter'],
      is_system_category: false,
      pin_to_top: false,
    },
  });

  const selectedFormats = form.watch('supported_formats');

  const toggleFormat = (format: SizingFormat) => {
    const current = selectedFormats || [];
    if (current.includes(format)) {
      // Don't allow removing the last format
      if (current.length > 1) {
        form.setValue(
          'supported_formats',
          current.filter((f) => f !== format)
        );
      }
    } else {
      form.setValue('supported_formats', [...current, format]);
    }
  };

  const onSubmit = async (data: SizeCategoryInput & { pin_to_top?: boolean }) => {
    try {
      const categoryData: SizeCategoryInput = {
        name: data.name,
        icon: selectedIcon,
        supported_formats: data.supported_formats,
        is_system_category: false,
      };

      // Create the category
      const newCategory = await createCategory.mutateAsync(categoryData);

      // If "Pin to top" is checked, create pinned preference
      if (data.pin_to_top && newCategory) {
        await createPinnedPreference.mutateAsync({
          category_id: newCategory.id,
          display_mode: 'standard',
        });
      }

      onSave();
    } catch (error) {
      // Error handling - form errors are already set by react-hook-form
      console.error('Failed to create category:', error);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Category Name */}
      <div className="space-y-2">
        <Label htmlFor="category-name">
          Category Name <span aria-label="required" className="text-red-500">*</span>
        </Label>
        <Input
          id="category-name"
          type="text"
          autoComplete="off"
          placeholder="e.g., Tops, Bottoms, Footwear"
          {...form.register('name')}
          aria-required="true"
          aria-invalid={!!form.formState.errors.name}
          aria-describedby={
            form.formState.errors.name ? 'category-name-error' : 'category-name-hint'
          }
        />
        <p id="category-name-hint" className="text-sm text-gray-600 dark:text-gray-400">
          Choose a descriptive name for this clothing category
        </p>
        {form.formState.errors.name && (
          <p
            id="category-name-error"
            role="alert"
            className="text-sm text-red-600 dark:text-red-400"
          >
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      {/* Icon Selection */}
      <div className="space-y-2">
        <Label htmlFor="icon-selection">Icon (Optional)</Label>
        <div
          id="icon-selection"
          role="radiogroup"
          aria-label="Select category icon"
          className="flex flex-wrap gap-2"
        >
          {ICON_OPTIONS.map((icon) => (
            <button
              key={icon}
              type="button"
              role="radio"
              aria-checked={selectedIcon === icon}
              onClick={() => setSelectedIcon(selectedIcon === icon ? undefined : icon)}
              className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                selectedIcon === icon
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                  : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
              }`}
              aria-label={`Select ${icon} icon`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Supported Sizing Formats */}
      <div className="space-y-2">
        <Label>
          Supported Sizing Formats <span aria-label="required" className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Select all formats that apply to this category
        </p>
        <div className="space-y-3" role="group" aria-label="Sizing format options">
          {SIZING_FORMAT_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-start gap-3">
              <Checkbox
                id={`format-${option.value}`}
                checked={selectedFormats?.includes(option.value)}
                onCheckedChange={() => toggleFormat(option.value)}
                aria-describedby={`format-${option.value}-description`}
              />
              <div className="flex-1">
                <label
                  htmlFor={`format-${option.value}`}
                  className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  {option.label}
                </label>
                <p
                  id={`format-${option.value}-description`}
                  className="text-sm text-gray-600 dark:text-gray-400"
                >
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        {form.formState.errors.supported_formats && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {form.formState.errors.supported_formats.message}
          </p>
        )}
      </div>

      {/* Pin to Top Toggle */}
      <div className="flex items-center gap-3">
        <Checkbox
          id="pin-to-top"
          {...form.register('pin_to_top')}
          aria-describedby="pin-to-top-description"
        />
        <div className="flex-1">
          <label
            htmlFor="pin-to-top"
            className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            Pin to top
          </label>
          <p id="pin-to-top-description" className="text-sm text-gray-600 dark:text-gray-400">
            Show this category in your pinned cards for quick access
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={createCategory.isPending}
          className="flex-1"
          aria-label="Cancel category creation"
        >
          <X className="mr-2 h-4 w-4" aria-hidden="true" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createCategory.isPending}
          className="flex-1"
          aria-label="Save new category"
        >
          <Check className="mr-2 h-4 w-4" aria-hidden="true" />
          {createCategory.isPending ? 'Saving...' : 'Save Category'}
        </Button>
      </div>

      {/* Error message for mutation failures */}
      {(createCategory.isError || createPinnedPreference.isError) && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
        >
          Failed to create category. Please try again.
        </div>
      )}
    </form>
  );
}
