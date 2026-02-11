/**
 * @deprecated This file is deprecated and should not be used in new code.
 * 
 * This file is kept only for the one-time migration script (scripts/migrate-colors.ts)
 * that extracts colors from existing item names. After migration is complete,
 * the system uses explicit color values from the database color field instead
 * of inferring colors from item names.
 * 
 * New code should:
 * - Use the explicit color field from WardrobeItem
 * - Use lib/data/color-options.ts for color dropdown options
 * - NOT import or use functions from this file
 * 
 * Related: Requirements 3.1 - Color Inference Removal
 */

import { ColorCategory } from '@/lib/types/generation';

/**
 * Color keywords mapped to their canonical color categories
 * 
 * This mapping supports common color variations and synonyms
 * to maximize successful color inference from item names.
 */
const COLOR_KEYWORDS: Record<string, ColorCategory> = {
  // Black
  'black': 'black',
  
  // White
  'white': 'white',
  
  // Grey (consolidated from grey/gray)
  'grey': 'grey',
  'gray': 'grey',
  
  // Navy
  'navy': 'navy',
  
  // Blue
  'blue': 'blue',
  
  // Cream
  'cream': 'cream',
  
  // Khaki
  'khaki': 'khaki',
  
  // Brown
  'brown': 'brown',
  
  // Tan
  'tan': 'tan',
  
  // Green
  'green': 'green',
  
  // Red
  'red': 'red',
  
  // Burgundy
  'burgundy': 'burgundy',
  
  // Olive
  'olive': 'olive',
  
  // Charcoal
  'charcoal': 'charcoal',
};

/**
 * Infers the color category from an item name using keyword matching
 * 
 * This function performs case-insensitive matching of color keywords
 * within the item name. It returns the first matching color found
 * (based on position in the string), or 'unknown' if no color keywords
 * are detected.
 * 
 * @param itemName - The name of the wardrobe item (e.g., "Blue Oxford Shirt")
 * @returns The inferred color category or 'unknown'
 * 
 * @example
 * inferColor("Blue Oxford Shirt") // returns 'blue'
 * inferColor("Black Leather Shoes") // returns 'black'
 * inferColor("Grey Wool Pants") // returns 'grey'
 * inferColor("Casual Shirt") // returns 'unknown'
 * inferColor("NAVY Blazer") // returns 'navy' (case-insensitive)
 */
export function inferColor(itemName: string): ColorCategory {
  // Handle null/undefined/empty strings
  if (!itemName || typeof itemName !== 'string') {
    return 'unknown';
  }
  
  // Convert to lowercase for case-insensitive matching
  const lowerName = itemName.toLowerCase();
  
  // Find all matching colors with their positions
  const matches: Array<{ color: ColorCategory; position: number }> = [];
  
  for (const [keyword, color] of Object.entries(COLOR_KEYWORDS)) {
    // Use word boundary matching to avoid partial matches
    // e.g., "greenish" shouldn't match "green"
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    const match = regex.exec(lowerName);
    if (match) {
      matches.push({ color, position: match.index });
    }
  }
  
  // If no matches found, return unknown
  if (matches.length === 0) {
    return 'unknown';
  }
  
  // Sort by position and return the first one
  matches.sort((a, b) => a.position - b.position);
  return matches[0].color;
}

/**
 * Checks if a color is considered neutral for color harmony scoring
 * 
 * Neutral colors are: black, white, grey, gray, navy, cream, khaki, brown, tan, charcoal
 * These colors generally work well together and with most other colors.
 * 
 * @param color - The color category to check
 * @returns True if the color is neutral, false otherwise
 * 
 * @example
 * isNeutralColor('black') // returns true
 * isNeutralColor('navy') // returns true
 * isNeutralColor('red') // returns false
 * isNeutralColor('unknown') // returns true (treated as neutral)
 */
export function isNeutralColor(color: ColorCategory): boolean {
  const neutralColors: ColorCategory[] = [
    'black',
    'white',
    'grey',
    'navy',
    'cream',
    'khaki',
    'brown',
    'tan',
    'charcoal',
    'unknown', // Unknown colors are treated as neutral to avoid penalizing them
  ];
  
  return neutralColors.includes(color);
}

/**
 * Gets all supported color keywords for validation or display purposes
 * 
 * @returns Array of all supported color keywords
 */
export function getSupportedColorKeywords(): string[] {
  return Object.keys(COLOR_KEYWORDS);
}
