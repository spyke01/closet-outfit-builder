import { WardrobeItem } from '../types';

/**
 * Formats an item name with optional brand display
 * @param item - The wardrobe item to format
 * @param showBrand - Whether to include brand information
 * @returns Formatted item name
 */
export const formatItemName = (item: WardrobeItem, showBrand: boolean): string => {
  if (!item || !item.name) {
    return '';
  }

  // If brand display is disabled or no brand exists, return just the name
  if (!showBrand || !item.brand || item.brand.trim() === '') {
    return item.name;
  }

  // Return "Brand Item (Color)" format
  return `${item.brand} ${item.name}`;
};