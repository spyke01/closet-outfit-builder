import { WardrobeItem, Category } from '../types';

/**
 * Interface for legacy wardrobe data structure
 */
interface LegacyWardrobeItem {
  id: string;
  name: string;
  category: Category;
  color?: string;
  material?: string;
  capsuleTags?: string[];
  season?: string[];
  formality?: string;
  formalityScore?: number;
  image?: string;
  active?: boolean;
  // Note: brand field doesn't exist in legacy data
}

interface LegacyWardrobeData {
  items: LegacyWardrobeItem[];
}

interface MigratedWardrobeData {
  items: WardrobeItem[];
}

/**
 * Validates that a migrated wardrobe item has the correct structure
 */
export const validateMigratedItem = (item: any): item is WardrobeItem => {
  if (!item || typeof item !== 'object') return false;
  
  // Required fields
  if (typeof item.id !== 'string' || !item.id) return false;
  if (typeof item.name !== 'string' || !item.name) return false;
  if (typeof item.category !== 'string' || !item.category) return false;
  
  // Valid category check
  const validCategories: Category[] = [
    "Jacket/Overshirt", "Shirt", "Undershirt", "Pants", "Shoes", "Belt", "Watch"
  ];
  if (!validCategories.includes(item.category as Category)) return false;
  
  // Optional fields type checking
  if (item.brand !== undefined && typeof item.brand !== 'string') return false;
  if (item.color !== undefined && typeof item.color !== 'string') return false;
  if (item.material !== undefined && typeof item.material !== 'string') return false;
  if (item.capsuleTags !== undefined && !Array.isArray(item.capsuleTags)) return false;
  if (item.season !== undefined && !Array.isArray(item.season)) return false;
  if (item.formality !== undefined && typeof item.formality !== 'string') return false;
  if (item.formalityScore !== undefined && typeof item.formalityScore !== 'number') return false;
  if (item.image !== undefined && typeof item.image !== 'string') return false;
  if (item.active !== undefined && typeof item.active !== 'boolean') return false;
  
  return true;
};

/**
 * Determines if an item should be migrated from Shirt to Undershirt category
 */
const shouldMigrateToUndershirt = (item: LegacyWardrobeItem): boolean => {
  const name = item.name.toLowerCase();
  
  // Check for T-shirt indicators in the name
  const tshirtIndicators = [
    'tee',
    't-shirt',
    'tshirt',
    'crew neck tee',
    'v-neck tee',
    'basic tee'
  ];
  
  return tshirtIndicators.some(indicator => name.includes(indicator));
};

/**
 * Migrates wardrobe data to support the new category structure and brand field
 * 
 * Changes made:
 * 1. Adds brand field (undefined by default)
 * 2. Migrates T-shirt items from "Shirt" to "Undershirt" category
 * 3. Validates the migrated data structure
 * 
 * @param legacyData - The original wardrobe data
 * @returns Migrated wardrobe data with new structure
 * @throws Error if migration fails or validation fails
 */
export const migrateWardrobeData = (legacyData: LegacyWardrobeData): MigratedWardrobeData => {
  if (!legacyData || !Array.isArray(legacyData.items)) {
    throw new Error('Invalid legacy data: items array is required');
  }
  
  const migratedItems: WardrobeItem[] = [];
  const migrationLog: string[] = [];
  
  for (const item of legacyData.items) {
    try {
      // Create migrated item with brand field and standardized name
      const standardizedName = standardizeItemName(item.name);
      const migratedItem: WardrobeItem = {
        ...item,
        name: standardizedName,
        brand: undefined, // Add brand field with default value
      };
      
      // Log name changes
      if (standardizedName !== item.name) {
        migrationLog.push(`Standardized name: "${item.name}" -> "${standardizedName}"`);
      }
      
      // Handle T-shirt to Undershirt category migration
      if (item.category === "Shirt" && shouldMigrateToUndershirt(item)) {
        migratedItem.category = "Undershirt";
        migrationLog.push(`Migrated "${item.name}" from Shirt to Undershirt category`);
      }
      
      // Validate the migrated item
      if (!validateMigratedItem(migratedItem)) {
        throw new Error(`Validation failed for item: ${item.id}`);
      }
      
      migratedItems.push(migratedItem);
    } catch (error) {
      throw new Error(`Failed to migrate item ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Log migration summary
  if (migrationLog.length > 0) {
    console.log('Migration completed with the following changes:');
    migrationLog.forEach(log => console.log(`  - ${log}`));
  } else {
    console.log('Migration completed with no category changes needed');
  }
  
  return {
    items: migratedItems
  };
};

/**
 * Standardizes item names to use consistent "Item (Color)" format
 * 
 * Converts various naming patterns to the standard format:
 * - "White OCBD" -> "OCBD (White)"
 * - "Navy Tee" -> "Tee (Navy)"
 * - "Dark Brown Loafers" -> "Loafers (Dark Brown)"
 * - "OCBD (White)" -> "OCBD (White)" (already correct)
 * 
 * @param name - The original item name
 * @returns Standardized name in "Item (Color)" format
 */
export const standardizeItemName = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return name;
  }
  
  const trimmedName = name.trim();
  
  // If already in correct format "Item (Color)", return as-is
  const correctFormatMatch = trimmedName.match(/^(.+)\s+\((.+)\)$/);
  if (correctFormatMatch) {
    return trimmedName;
  }
  
  // Handle "White/Navy Striped Linen" -> "Striped Linen (White/Navy)" first
  // Look for pattern like "Color1/Color2 Rest of Name"
  const complexColorMatch = trimmedName.match(/^([A-Za-z]+\/[A-Za-z]+)\s+(.+)$/);
  if (complexColorMatch) {
    const [, color, itemType] = complexColorMatch;
    return `${itemType} (${color})`;
  }
  
  // Multi-word colors (must be checked before single colors)
  const multiWordColors = [
    'light grey', 'light gray', 'dark grey', 'dark gray', 'light blue', 'dark blue', 'navy blue',
    'dark brown', 'light brown', 'medium brown', 'light tan', 'dark tan',
    'deep navy', 'bright white', 'off white', 'cream white'
  ];
  
  // Check for multi-word colors at the beginning (preserve original case)
  for (const color of multiWordColors) {
    const multiWordStartRegex = new RegExp(`^(${color})\\s+(.+)$`, 'i');
    const multiWordStartMatch = trimmedName.match(multiWordStartRegex);
    if (multiWordStartMatch) {
      const [, originalColor, itemType] = multiWordStartMatch;
      return `${itemType} (${originalColor})`;
    }
  }
  
  // Check for multi-word colors at the end (preserve original case)
  for (const color of multiWordColors) {
    const multiWordEndRegex = new RegExp(`^(.+)\\s+(${color})$`, 'i');
    const multiWordEndMatch = trimmedName.match(multiWordEndRegex);
    if (multiWordEndMatch) {
      const [, itemType, originalColor] = multiWordEndMatch;
      return `${itemType} (${originalColor})`;
    }
  }
  
  // Single colors
  const singleColors = [
    'white', 'black', 'navy', 'grey', 'gray', 'blue', 'brown', 'green', 'red', 'yellow', 'orange', 'purple', 'pink',
    'beige', 'tan', 'khaki', 'olive', 'cream', 'charcoal', 'camel', 'light', 'dark', 'deep', 'bright', 'pale', 'medium'
  ];
  
  // Check for single colors at the beginning (preserve original case)
  for (const color of singleColors) {
    const singleStartRegex = new RegExp(`^(${color})\\s+(.+)$`, 'i');
    const singleStartMatch = trimmedName.match(singleStartRegex);
    if (singleStartMatch) {
      const [, originalColor, itemType] = singleStartMatch;
      return `${itemType} (${originalColor})`;
    }
  }
  
  // Check for single colors at the end (preserve original case)
  for (const color of singleColors) {
    const singleEndRegex = new RegExp(`^(.+)\\s+(${color})$`, 'i');
    const singleEndMatch = trimmedName.match(singleEndRegex);
    if (singleEndMatch) {
      const [, itemType, originalColor] = singleEndMatch;
      return `${itemType} (${originalColor})`;
    }
  }
  
  // If no color pattern detected, return original name
  return trimmedName;
};

/**
 * Formats item names with brand support based on user settings
 * 
 * Formats item names according to the following rules:
 * - When showBrand is true AND item has brand: "Brand Item (Color)"
 * - When showBrand is false OR item has no brand: "Item (Color)"
 * - Handles cases where brand is undefined, empty, or null
 * 
 * @param item - The wardrobe item to format
 * @param showBrand - Whether to display brand information
 * @returns Formatted item name
 */
export const formatItemName = (item: WardrobeItem, showBrand: boolean): string => {
  if (!item || !item.name) {
    return '';
  }
  
  // If showBrand is false or item has no brand, return standard name
  if (!showBrand || !item.brand || item.brand.trim() === '') {
    return item.name;
  }
  
  // Extract the base name and color from the standardized format
  const nameMatch = item.name.match(/^(.+)\s+\((.+)\)$/);
  
  if (nameMatch) {
    // Item name is in "Item (Color)" format
    const [, itemType, color] = nameMatch;
    return `${item.brand} ${itemType} (${color})`;
  } else {
    // Item name doesn't have color in parentheses
    return `${item.brand} ${item.name}`;
  }
};

/**
 * Validates the complete migrated wardrobe data structure
 */
export const validateMigratedData = (data: any): data is MigratedWardrobeData => {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.items)) return false;
  
  return data.items.every((item: any) => validateMigratedItem(item));
};