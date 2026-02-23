/**
 * Color option for dropdown selection
 * 
 * Represents a selectable color with display information
 */
export interface ColorOption {
  value: string;
  label: string;
  hex: string | null;
}

/**
 * Predefined color options for wardrobe item selection
 * 
 * This array includes all colors from COLOR_KEYWORDS plus additional
 * common clothing colors. Colors are organized by category for better UX.
 * 
 * The "Unspecified" option allows users to skip color selection.
 */
export const COLOR_OPTIONS: ColorOption[] = [
  { value: '', label: 'Unspecified', hex: null },

  // Neutrals
  { value: 'black', label: 'Black', hex: '#000000' },
  { value: 'white', label: 'White', hex: '#FFFFFF' },
  { value: 'grey', label: 'Grey', hex: '#808080' },
  { value: 'taupe', label: 'Taupe', hex: '#8B8589' },
  { value: 'charcoal', label: 'Charcoal', hex: '#36454F' },
  { value: 'stone', label: 'Stone', hex: '#D6D2C4' },
  { value: 'ivory', label: 'Ivory', hex: '#FFFFF0' },
  { value: 'cream', label: 'Cream', hex: '#FFFDD0' },
  { value: 'beige', label: 'Beige', hex: '#F5F5DC' },

  // Blues
  { value: 'navy', label: 'Navy', hex: '#0B1C2D' },
  { value: 'blue', label: 'Blue', hex: '#0033A0' },
  { value: 'denim', label: 'Denim', hex: '#3B5F8A' },
  { value: 'light-blue', label: 'Light Blue', hex: '#ADD8E6' },
  { value: 'sky-blue', label: 'Sky Blue', hex: '#87CEEB' },
  { value: 'teal', label: 'Teal', hex: '#008080' },

  // Browns / Earth
  { value: 'brown', label: 'Brown', hex: '#6F4E37' },
  { value: 'tan', label: 'Tan', hex: '#D2B48C' },
  { value: 'khaki', label: 'Khaki', hex: '#C3B091' },
  { value: 'camel', label: 'Camel', hex: '#C19A6B' },
  { value: 'chocolate', label: 'Chocolate', hex: '#4E342E' },

  // Greens
  { value: 'green', label: 'Green', hex: '#2E7D32' },
  { value: 'olive', label: 'Olive', hex: '#556B2F' },
  { value: 'forest', label: 'Forest Green', hex: '#014421' },
  { value: 'sage', label: 'Sage', hex: '#9CAF88' },

  // Reds / Warm
  { value: 'red', label: 'Red', hex: '#C62828' },
  { value: 'burgundy', label: 'Burgundy', hex: '#800020' },
  { value: 'maroon', label: 'Maroon', hex: '#5C1A1B' },
  { value: 'rust', label: 'Rust', hex: '#B7410E' },

  // Yellows / Accents
  { value: 'yellow', label: 'Yellow', hex: '#FBC02D' },
  { value: 'mustard', label: 'Mustard', hex: '#D4A017' },

  // Pinks / Purples
  { value: 'pink', label: 'Pink', hex: '#F4A6B8' },
  { value: 'blush', label: 'Blush', hex: '#F2B6C6' },
  { value: 'purple', label: 'Purple', hex: '#6A1B9A' },
  { value: 'lavender', label: 'Lavender', hex: '#C7B7E2' },

];

/**
 * Gets all color options for dropdown selection
 * 
 * @returns Array of color options with value, label, and hex code
 * 
 * @example
 * const options = getColorOptions();
 * // Returns all COLOR_OPTIONS
 */
export function getColorOptions(): ColorOption[] {
  return COLOR_OPTIONS;
}

/**
 * Gets all valid color values (excluding empty string)
 * 
 * @returns Array of valid color value strings
 * 
 * @example
 * const validColors = getValidColorValues();
 * // Returns ['black', 'white', 'grey', ...]
 */
export function getValidColorValues(): string[] {
  return COLOR_OPTIONS
    .map(option => option.value)
    .filter(value => value !== '');
}

/**
 * Validates if a color value is in the predefined list
 * 
 * @param color - The color value to validate
 * @returns True if the color is valid or empty, false otherwise
 * 
 * @example
 * isValidColor('black') // returns true
 * isValidColor('') // returns true (empty is allowed)
 * isValidColor('invalid') // returns false
 */
export function isValidColor(color: string | null | undefined): boolean {
  if (!color || color === '') {
    return true; // Empty/null is valid (optional field)
  }
  
  return COLOR_OPTIONS.some(option => option.value === color);
}

/**
 * Normalizes a color value for storage
 * 
 * Trims whitespace and converts to lowercase as per requirements 4.4 and 4.5
 * 
 * @param color - The color value to normalize
 * @returns Normalized color value or empty string if null/undefined
 * 
 * @example
 * normalizeColor('  Black  ') // returns 'black'
 * normalizeColor('NAVY') // returns 'navy'
 * normalizeColor(null) // returns ''
 */
export function normalizeColor(color: string | null | undefined): string {
  if (!color) {
    return '';
  }
  
  return color.trim().toLowerCase();
}

/**
 * Gets the color option by value
 * 
 * @param value - The color value to find
 * @returns The color option or undefined if not found
 * 
 * @example
 * getColorOption('black') // returns { value: 'black', label: 'Black', hex: '#000000' }
 * getColorOption('invalid') // returns undefined
 */
export function getColorOption(value: string): ColorOption | undefined {
  return COLOR_OPTIONS.find(option => option.value === value);
}

/**
 * Checks if a color is from the original COLOR_KEYWORDS list
 * 
 * This is useful for migration and backward compatibility checks.
 * 
 * @param color - The color value to check
 * @returns True if the color is from COLOR_KEYWORDS
 * 
 * @example
 * isColorKeyword('black') // returns true
 * isColorKeyword('light-blue') // returns false (extended color)
 */
export function isColorKeyword(color: string): boolean {
  const colorKeywords = [
    'black', 'white', 'grey', 'navy', 'blue',
    'cream', 'khaki', 'brown', 'tan', 'green', 'red',
    'burgundy', 'olive', 'charcoal'
  ];
  
  return colorKeywords.includes(color);
}
