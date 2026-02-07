/**
 * Text truncation utilities for displaying long text with ellipsis
 * Preserves full text for tooltips and accessibility
 */

/**
 * Truncate text to a maximum length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (!text || typeof text !== 'string') return '';
  
  const trimmed = text.trim();
  
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  
  // Truncate and add ellipsis
  return trimmed.slice(0, maxLength).trim() + '…';
}

/**
 * Check if text needs truncation
 * @param text - The text to check
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns true if text exceeds maxLength
 */
export function needsTruncation(text: string, maxLength: number = 50): boolean {
  if (!text || typeof text !== 'string') return false;
  return text.trim().length > maxLength;
}

/**
 * Truncate text at word boundary to avoid cutting words in half
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns Truncated text at word boundary with ellipsis if needed
 */
export function truncateAtWord(text: string, maxLength: number = 50): string {
  if (!text || typeof text !== 'string') return '';
  
  const trimmed = text.trim();
  
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  
  // Find the last space before maxLength
  const truncated = trimmed.slice(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  // If there's a space, truncate at that point
  if (lastSpaceIndex > 0) {
    return truncated.slice(0, lastSpaceIndex).trim() + '…';
  }
  
  // Otherwise, truncate at maxLength
  return truncated.trim() + '…';
}

/**
 * Get truncation info for a text string
 * Useful for determining whether to show a tooltip
 * @param text - The text to analyze
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns Object with truncation info
 */
export function getTruncationInfo(text: string, maxLength: number = 50): {
  isTruncated: boolean;
  displayText: string;
  fullText: string;
} {
  const fullText = text?.trim() || '';
  const isTruncated = needsTruncation(fullText, maxLength);
  const displayText = isTruncated ? truncateText(fullText, maxLength) : fullText;
  
  return {
    isTruncated,
    displayText,
    fullText
  };
}

/**
 * Truncate text for display in a container with specific width
 * Uses CSS-based truncation approach
 * @param text - The text to display
 * @param containerWidth - Width of the container in pixels (optional)
 * @returns CSS class names for truncation styling
 */
export function getTruncationClasses(): string {
  return 'truncate overflow-hidden text-ellipsis whitespace-nowrap';
}

/**
 * Get multi-line truncation classes
 * Truncates text after a specific number of lines
 * @param lines - Number of lines to show before truncation (default: 2)
 * @returns CSS class names for multi-line truncation
 */
export function getMultiLineTruncationClasses(lines: number = 2): string {
  return `line-clamp-${lines}`;
}
