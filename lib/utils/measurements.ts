/**
 * Measurement utility functions for unit conversion and formatting
 * Supports imperial (inches) and metric (centimeters) units
 */

export type MeasurementUnit = 'imperial' | 'metric';

/**
 * Convert a measurement value between imperial and metric units
 * @param value - The numeric value to convert
 * @param fromUnit - The source unit system
 * @param toUnit - The target unit system
 * @returns The converted value
 */
export function convertUnit(
  value: number,
  fromUnit: MeasurementUnit,
  toUnit: MeasurementUnit
): number {
  if (fromUnit === toUnit) return value;
  
  if (fromUnit === 'imperial' && toUnit === 'metric') {
    // inches to centimeters
    return value * 2.54;
  } else {
    // centimeters to inches
    return value / 2.54;
  }
}

/**
 * Format a measurement value for display with appropriate unit label
 * @param value - The numeric value to format
 * @param unit - The unit system
 * @returns Formatted string with value and unit label (e.g., "40.5 in" or "102.9 cm")
 */
export function formatMeasurement(
  value: number,
  unit: MeasurementUnit
): string {
  const rounded = Math.round(value * 10) / 10; // 1 decimal place
  const unitLabel = unit === 'imperial' ? 'in' : 'cm';
  return `${rounded} ${unitLabel}`;
}

/**
 * Get the user's preferred unit system from localStorage
 * Uses a synchronous approach to prevent hydration mismatches
 * @returns The preferred unit system, defaults to 'imperial'
 */
export function getPreferredUnit(): MeasurementUnit {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return 'imperial'; // Default for SSR
  }
  
  try {
    const stored = localStorage.getItem('preferred-unit');
    if (stored === 'metric' || stored === 'imperial') {
      return stored;
    }
  } catch (error) {
    // localStorage might not be available (private browsing, etc.)
    console.warn('Failed to read preferred unit from localStorage:', error);
  }
  
  return 'imperial'; // Default fallback
}

/**
 * Save the user's preferred unit system to localStorage
 * @param unit - The unit system to save
 */
export function setPreferredUnit(unit: MeasurementUnit): void {
  if (typeof window === 'undefined') {
    return; // No-op on server
  }
  
  try {
    localStorage.setItem('preferred-unit', unit);
  } catch (error) {
    console.warn('Failed to save preferred unit to localStorage:', error);
  }
}

/**
 * Hook for managing unit preference with hydration-safe initialization
 * This prevents hydration mismatches by using useEffect for initial load
 */
export function usePreferredUnit() {
  // This will be implemented when we create the React hooks
  // For now, this is a placeholder to document the pattern
  throw new Error('usePreferredUnit hook not yet implemented');
}
