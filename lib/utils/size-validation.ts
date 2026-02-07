/**
 * Size format validation utilities
 * Validates different sizing formats: letter, numeric, and waist/inseam
 */

export type SizeFormat = 'letter' | 'numeric' | 'waist-inseam' | 'measurements';

/**
 * Validate letter size format (XS, S, M, L, XL, XXL, etc.)
 * Supports variations like XS, S, M, L, XL, XXL, XXXL, 2XL, 3XL, etc.
 * @param size - The size string to validate
 * @returns true if valid letter size format
 */
export function isValidLetterSize(size: string): boolean {
  if (!size || typeof size !== 'string') return false;
  
  const trimmed = size.trim().toUpperCase();
  
  // Pattern matches: XS, S, M, L, XL, XXL, XXXL, 2XL, 3XL, 4XL, 5XL
  const letterSizePattern = /^(XXX?S|XX?S|XS|S|M|L|XL|XXL|XXXL|[2-5]XL)$/;
  
  return letterSizePattern.test(trimmed);
}

/**
 * Validate numeric size format (2, 4, 6, 8, 10, etc.)
 * Supports whole numbers and half sizes (e.g., 8.5)
 * @param size - The size string to validate
 * @returns true if valid numeric size format
 */
export function isValidNumericSize(size: string): boolean {
  if (!size || typeof size !== 'string') return false;
  
  const trimmed = size.trim();
  
  // Pattern matches: whole numbers (0-99) and half sizes (e.g., 8.5)
  const numericSizePattern = /^\d{1,2}(\.\d)?$/;
  
  if (!numericSizePattern.test(trimmed)) return false;
  
  // Additional validation: must be a valid number
  const num = parseFloat(trimmed);
  return !isNaN(num) && num >= 0 && num <= 99;
}

/**
 * Validate waist/inseam size format (e.g., "32x34", "30x32")
 * @param size - The size string to validate
 * @returns true if valid waist/inseam format
 */
export function isValidWaistInseamSize(size: string): boolean {
  if (!size || typeof size !== 'string') return false;
  
  const trimmed = size.trim();
  
  // Pattern matches: two numbers separated by 'x' or 'X' (e.g., 32x34, 30X32)
  const waistInseamPattern = /^\d{2,3}[xX]\d{2,3}$/;
  
  if (!waistInseamPattern.test(trimmed)) return false;
  
  // Additional validation: both numbers should be reasonable (10-99 for waist, 20-40 for inseam)
  const [waist, inseam] = trimmed.split(/[xX]/).map(Number);
  
  return (
    !isNaN(waist) && 
    !isNaN(inseam) && 
    waist >= 10 && 
    waist <= 99 && 
    inseam >= 20 && 
    inseam <= 40
  );
}

/**
 * Validate size format based on the specified format type
 * @param size - The size string to validate
 * @param format - The expected format type
 * @returns true if the size matches the specified format
 */
export function isValidSizeFormat(size: string, format: SizeFormat): boolean {
  switch (format) {
    case 'letter':
      return isValidLetterSize(size);
    case 'numeric':
      return isValidNumericSize(size);
    case 'waist-inseam':
      return isValidWaistInseamSize(size);
    case 'measurements':
      // Measurements are validated separately as they're numeric values with units
      return true;
    default:
      return false;
  }
}

/**
 * Validate size against multiple supported formats
 * Returns true if the size is valid in at least one of the supported formats
 * @param size - The size string to validate
 * @param supportedFormats - Array of supported format types
 * @returns true if the size is valid in any supported format
 */
export function isValidSize(size: string, supportedFormats: SizeFormat[]): boolean {
  if (!size || !supportedFormats || supportedFormats.length === 0) {
    return false;
  }
  
  return supportedFormats.some(format => isValidSizeFormat(size, format));
}

/**
 * Detect the format of a size string
 * @param size - The size string to analyze
 * @returns The detected format, or null if no format matches
 */
export function detectSizeFormat(size: string): SizeFormat | null {
  if (isValidLetterSize(size)) return 'letter';
  if (isValidNumericSize(size)) return 'numeric';
  if (isValidWaistInseamSize(size)) return 'waist-inseam';
  return null;
}

/**
 * Get a user-friendly error message for invalid size format
 * @param supportedFormats - Array of supported format types
 * @returns Error message describing valid formats
 */
export function getSizeFormatErrorMessage(supportedFormats: SizeFormat[]): string {
  const formatExamples: Record<SizeFormat, string> = {
    letter: 'letter sizes (e.g., S, M, L, XL)',
    numeric: 'numeric sizes (e.g., 8, 10, 12)',
    'waist-inseam': 'waist/inseam (e.g., 32x34)',
    measurements: 'custom measurements'
  };
  
  const examples = supportedFormats
    .map(format => formatExamples[format])
    .filter(Boolean)
    .join(', ');
  
  return `Please enter a valid size format: ${examples}`;
}
