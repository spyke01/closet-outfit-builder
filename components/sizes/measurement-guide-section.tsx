'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Save from 'lucide-react/dist/esm/icons/save';
import X from 'lucide-react/dist/esm/icons/x';
import { useUpdateMeasurements } from '@/lib/hooks/use-size-categories';
import { convertUnit, formatMeasurement, getPreferredUnit, setPreferredUnit } from '@/lib/utils/measurements';
import type { CategoryMeasurements, MeasurementUnit } from '@/lib/types/sizes';
import type { SizeCategory } from '@/lib/types/sizes';

/**
 * Props for MeasurementGuideSection component
 */
export interface MeasurementGuideSectionProps {
  measurements: CategoryMeasurements | null;
  category: SizeCategory;
  categoryId: string;
}

/**
 * Category-specific measurement field definitions
 * Maps category names to their relevant measurement fields
 */
const CATEGORY_MEASUREMENT_FIELDS: Record<string, { field: string; label: string }[]> = {
  // Tops: chest, waist, hip
  'Tops': [
    { field: 'chest', label: 'Chest' },
    { field: 'waist', label: 'Waist' },
    { field: 'hip', label: 'Hip' },
  ],
  'Shirt': [
    { field: 'chest', label: 'Chest' },
    { field: 'waist', label: 'Waist' },
    { field: 'hip', label: 'Hip' },
  ],
  'T-Shirt': [
    { field: 'chest', label: 'Chest' },
    { field: 'waist', label: 'Waist' },
  ],
  // Bottoms: waist, inseam
  'Bottoms': [
    { field: 'waist', label: 'Waist' },
    { field: 'inseam', label: 'Inseam' },
  ],
  'Pants': [
    { field: 'waist', label: 'Waist' },
    { field: 'inseam', label: 'Inseam' },
  ],
  'Jeans': [
    { field: 'waist', label: 'Waist' },
    { field: 'inseam', label: 'Inseam' },
  ],
  // Footwear: foot length, foot width
  'Footwear': [
    { field: 'foot_length', label: 'Foot Length' },
    { field: 'foot_width', label: 'Foot Width' },
  ],
  'Shoes': [
    { field: 'foot_length', label: 'Foot Length' },
    { field: 'foot_width', label: 'Foot Width' },
  ],
};

/**
 * Get measurement fields for a category
 * Falls back to generic body measurements if category not found
 */
function getMeasurementFields(categoryName: string): { field: string; label: string }[] {
  // Try exact match first
  if (CATEGORY_MEASUREMENT_FIELDS[categoryName]) {
    return CATEGORY_MEASUREMENT_FIELDS[categoryName];
  }
  
  // Try partial match (e.g., "Dress Shirt" contains "Shirt")
  for (const [key, fields] of Object.entries(CATEGORY_MEASUREMENT_FIELDS)) {
    if (categoryName.toLowerCase().includes(key.toLowerCase())) {
      return fields;
    }
  }
  
  // Default to chest/waist/hip for unknown categories
  return [
    { field: 'chest', label: 'Chest' },
    { field: 'waist', label: 'Waist' },
    { field: 'hip', label: 'Hip' },
  ];
}

/**
 * Form schema for measurement inputs
 * Validates that all measurements are positive numbers
 */
const measurementFormSchema = z.object({
  measurements: z.record(z.string(), z.number().positive('Must be a positive number')),
  unit: z.enum(['imperial', 'metric']),
});

type MeasurementFormData = z.infer<typeof measurementFormSchema>;

/**
 * MeasurementGuideSection Component
 * 
 * Displays and manages body measurements for a clothing category.
 * 
 * Features:
 * - Category-specific measurement fields (chest/waist/hip for tops, waist/inseam for bottoms, etc.)
 * - Unit toggle (imperial ↔ metric) with automatic conversion
 * - Numeric input fields with validation
 * - Edit/save mode with optimistic updates
 * - Hydration-safe unit preference from localStorage
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 * 
 * @example
 * ```tsx
 * <MeasurementGuideSection
 *   measurements={measurements}
 *   category={category}
 *   categoryId={category.id}
 * />
 * ```
 */
export function MeasurementGuideSection({
  measurements,
  category,
  categoryId,
}: MeasurementGuideSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentUnit, setCurrentUnit] = useState<MeasurementUnit>('imperial');
  const [isHydrated, setIsHydrated] = useState(false);
  
  const updateMeasurements = useUpdateMeasurements();
  
  // Get measurement fields for this category
  const measurementFields = getMeasurementFields(category.name);
  
  // Initialize form with current measurements or empty values
  const form = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementFormSchema),
    defaultValues: {
      measurements: measurements?.measurements || {},
      unit: measurements?.unit || 'imperial',
    },
  });
  
  // Hydration-safe unit preference loading
  useEffect(() => {
    const preferredUnit = getPreferredUnit();
    setCurrentUnit(preferredUnit);
    setIsHydrated(true);
  }, []);
  
  // Update form when measurements change
  useEffect(() => {
    if (measurements) {
      form.reset({
        measurements: measurements.measurements,
        unit: measurements.unit,
      });
      setCurrentUnit(measurements.unit);
    }
  }, [measurements, form]);
  
  /**
   * Handle unit toggle
   * Converts all measurement values to the new unit system
   */
  const handleUnitToggle = useCallback(() => {
    const newUnit: MeasurementUnit = currentUnit === 'imperial' ? 'metric' : 'imperial';
    const currentMeasurements = form.getValues('measurements');
    
    // Convert all measurements to new unit
    const convertedMeasurements: Record<string, number> = {};
    for (const [field, value] of Object.entries(currentMeasurements)) {
      if (typeof value === 'number') {
        convertedMeasurements[field] = convertUnit(value, currentUnit, newUnit);
      }
    }
    
    // Update form with converted values
    form.setValue('measurements', convertedMeasurements);
    form.setValue('unit', newUnit);
    setCurrentUnit(newUnit);
    
    // Save preference to localStorage
    setPreferredUnit(newUnit);
  }, [currentUnit, form]);
  
  /**
   * Handle form submission
   * Saves measurements to database
   */
  const onSubmit = useCallback(async (data: MeasurementFormData) => {
    try {
      await updateMeasurements.mutateAsync({
        category_id: categoryId,
        measurements: data.measurements,
        unit: data.unit,
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save measurements:', error);
      // Error is handled by the mutation hook
    }
  }, [categoryId, updateMeasurements]);
  
  /**
   * Handle cancel
   * Resets form to original values
   */
  const handleCancel = useCallback(() => {
    form.reset({
      measurements: measurements?.measurements || {},
      unit: measurements?.unit || 'imperial',
    });
    setCurrentUnit(measurements?.unit || 'imperial');
    setIsEditing(false);
  }, [measurements, form]);
  
  // Don't render until hydrated to prevent mismatch
  if (!isHydrated) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Measurement Guide</h3>
        </div>
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header with edit button and unit toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Measurement Guide</h3>
        <div className="flex items-center gap-2">
          {/* Unit toggle */}
          <button
            type="button"
            onClick={handleUnitToggle}
            disabled={isEditing}
            className="px-3 py-1 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Switch to ${currentUnit === 'imperial' ? 'metric' : 'imperial'} units`}
          >
            {currentUnit === 'imperial' ? 'in' : 'cm'}
          </button>
          
          {/* Edit/Save/Cancel buttons */}
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="Edit measurements"
            >
              <Edit className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateMeasurements.isPending}
                className="p-2 rounded-md hover:bg-green-100 text-green-600 disabled:opacity-50"
                aria-label="Save measurements"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={updateMeasurements.isPending}
                className="p-2 rounded-md hover:bg-red-100 text-red-600 disabled:opacity-50"
                aria-label="Cancel editing"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Measurement fields */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {measurementFields.map(({ field, label }) => {
          const value = form.watch(`measurements.${field}`);
          const error = form.formState.errors.measurements?.[field];
          
          return (
            <div key={field} className="space-y-1">
              <label
                htmlFor={`measurement-${field}`}
                className="block text-sm font-medium text-gray-700"
              >
                {label}
              </label>
              
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    id={`measurement-${field}`}
                    type="number"
                    step="0.1"
                    min="0"
                    {...form.register(`measurements.${field}`, {
                      valueAsNumber: true,
                    })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-invalid={!!error}
                    aria-describedby={error ? `measurement-${field}-error` : undefined}
                  />
                  <span className="text-sm text-gray-500 w-8">
                    {currentUnit === 'imperial' ? 'in' : 'cm'}
                  </span>
                </div>
              ) : (
                <div className="text-base">
                  {value !== undefined && value !== null
                    ? formatMeasurement(value, currentUnit)
                    : <span className="text-gray-400">Not set</span>
                  }
                </div>
              )}
              
              {error && (
                <p
                  id={`measurement-${field}-error`}
                  role="alert"
                  className="text-sm text-red-600"
                >
                  {error.message}
                </p>
              )}
            </div>
          );
        })}
      </form>
      
      {/* Loading/error states */}
      {updateMeasurements.isPending && (
        <div className="text-sm text-gray-500" aria-live="polite">
          Saving measurements...
        </div>
      )}
      
      {updateMeasurements.isError && (
        <div className="text-sm text-red-600" role="alert" aria-live="polite">
          Failed to save measurements. Please try again.
        </div>
      )}
      
      {updateMeasurements.isSuccess && !isEditing && (
        <div className="text-sm text-green-600" aria-live="polite">
          Measurements saved successfully
        </div>
      )}
    </div>
  );
}
