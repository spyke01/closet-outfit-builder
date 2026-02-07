/**
 * Typography utilities for proper text formatting
 * Following Vercel React best practices for typography
 */

/**
 * Replace three dots with proper ellipsis character
 * @param text - Text containing "..."
 * @returns Text with proper ellipsis "…"
 */
export function formatEllipsis(text: string): string {
  return text.replace(/\.\.\./g, '…');
}

/**
 * Replace straight quotes with curly quotes
 * @param text - Text containing straight quotes
 * @returns Text with curly quotes
 */
export function formatCurlyQuotes(text: string): string {
  // Replace opening and closing double quotes
  let result = text.replace(/"([^"]*)"/g, '\u201C$1\u201D');
  
  // Replace opening and closing single quotes
  result = result.replace(/'([^']*)'/g, '\u2018$1\u2019');
  
  return result;
}

/**
 * Add non-breaking space between number and unit
 * @param value - Numeric value
 * @param unit - Unit string (e.g., "px", "ms", "°F")
 * @returns Formatted string with non-breaking space
 */
export function formatUnit(value: number | string, unit: string): string {
  return `${value}\u00A0${unit}`;
}

/**
 * Format keyboard shortcut with non-breaking spaces
 * @param keys - Array of key names
 * @returns Formatted shortcut string
 */
export function formatShortcut(keys: string[]): string {
  return keys.join('\u00A0+\u00A0');
}

/**
 * Format temperature with proper degree symbol and non-breaking space
 * @param temp - Temperature value
 * @param unit - Temperature unit ('C' or 'F')
 * @returns Formatted temperature string
 */
export function formatTemperature(temp: number, unit: 'C' | 'F' = 'F'): string {
  return `${Math.round(temp)}°${unit}`;
}

/**
 * Format loading text with proper ellipsis
 * @param action - Action being performed (e.g., "Loading", "Saving")
 * @returns Formatted loading text
 */
export function formatLoadingText(action: string): string {
  return formatEllipsis(`${action}...`);
}

/**
 * Apply tabular nums class for number columns
 * Useful for tables and lists with numeric data
 */
export const TABULAR_NUMS_CLASS = 'tabular-nums';

/**
 * Apply non-breaking space class
 * Useful for keeping units and values together
 */
export const NBSP_CLASS = 'nbsp';
