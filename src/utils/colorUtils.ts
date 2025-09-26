// Color keyword to hex code mapping
const COLOR_MAP: Record<string, string> = {
  // Whites and Creams
  'white': '#FFFFFF',
  'cream': '#F5F5DC',
  'ivory': '#FFFFF0',
  'off-white': '#FAF0E6',
  'eggshell': '#F0EAD6',
  
  // Grays
  'light grey': '#D3D3D3',
  'light gray': '#D3D3D3',
  'grey': '#808080',
  'gray': '#808080',
  'charcoal': '#36454F',
  'slate': '#708090',
  'stone': '#B0A695',
  
  // Blues
  'navy': '#000080',
  'blue': '#0066CC',
  'light blue': '#87CEEB',
  'royal blue': '#4169E1',
  'steel blue': '#4682B4',
  'deep navy': '#1B1B3A',
  
  // Browns
  'brown': '#8B4513',
  'dark brown': '#654321',
  'light brown': '#CD853F',
  'tan': '#D2B48C',
  'light tan': '#F5DEB3',
  'beige': '#F5F5DC',
  'khaki': '#C3B091',
  'camel': '#C19A6B',
  
  // Greens
  'olive': '#808000',
  'green': '#008000',
  'forest green': '#228B22',
  'sage': '#9CAF88',
  
  // Blacks
  'black': '#000000',
  'jet black': '#0C0C0C',
  
  // Reds
  'red': '#FF0000',
  'burgundy': '#800020',
  'maroon': '#800000',
  
  // Other colors
  'yellow': '#FFFF00',
  'orange': '#FFA500',
  'purple': '#800080',
  'pink': '#FFC0CB',
  'gold': '#FFD700',
  'silver': '#C0C0C0',
  
  // Denim specific
  'medium': '#4F7CAC', // For medium jeans/denim
  'dark': '#2F4F4F',   // For dark denim
  'light': '#B0C4DE',  // For light denim
  
  // Pattern-specific colors
  'striped': '#E5E5E5', // Neutral for striped patterns
  'plaid': '#8B4513',   // Brown for plaid patterns
  'checkered': '#D3D3D3', // Light gray for checkered patterns
};

/**
 * Extracts colors from item name based on color keywords
 * Returns array of hex codes if colors are found, empty array otherwise
 */
export const extractColorsFromName = (itemName: string): string[] => {
  const lowerName = itemName.toLowerCase();
  const foundColors: string[] = [];
  
  // Sort by length (longest first) to match more specific colors first
  const sortedColors = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);
  
  // Special handling for parentheses patterns like "(White/Navy)"
  const parenthesesMatch = lowerName.match(/\(([^)]+)\)/);
  if (parenthesesMatch) {
    const colorsInParens = parenthesesMatch[1];
    // Split by common separators
    const colorParts = colorsInParens.split(/[/,&\s]+/).filter(part => part.trim());
    
    for (const part of colorParts) {
      for (const colorKeyword of sortedColors) {
        if (part.trim().includes(colorKeyword)) {
          foundColors.push(COLOR_MAP[colorKeyword]);
          break; // Only match first color per part
        }
      }
    }
  }
  
  // If we found colors in parentheses, return those
  if (foundColors.length > 0) {
    return foundColors;
  }
  
  // Otherwise, search the entire name
  // Track which parts of the name we've already matched to avoid overlaps
  let processedName = lowerName;
  
  for (const colorKeyword of sortedColors) {
    if (processedName.includes(colorKeyword)) {
      foundColors.push(COLOR_MAP[colorKeyword]);
      // Remove the matched color to avoid overlapping matches
      processedName = processedName.replace(colorKeyword, '');
    }
  }
  
  return foundColors;
};

/**
 * Extracts color from item name based on color keywords
 * Returns hex code if color is found, null otherwise
 * @deprecated Use extractColorsFromName for multi-color support
 */
export const extractColorFromName = (itemName: string): string | null => {
  const colors = extractColorsFromName(itemName);
  return colors.length > 0 ? colors[0] : null;
};

/**
 * Gets a contrasting text color (black or white) for a given background color
 */
export const getContrastColor = (hexColor: string): string => {
  // Remove # if present
  const color = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

/**
 * Adds a new color keyword to the color map
 */
export const addColorKeyword = (keyword: string, hexCode: string): void => {
  COLOR_MAP[keyword.toLowerCase()] = hexCode;
};

/**
 * Gets all available color keywords
 */
export const getAvailableColors = (): Record<string, string> => {
  return { ...COLOR_MAP };
};

/**
 * Debug function to test color extraction
 */
