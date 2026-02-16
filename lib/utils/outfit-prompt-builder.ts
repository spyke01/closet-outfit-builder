export interface OutfitPromptItem {
  name: string;
  category: string;
  color: string;
  material?: string;
  brand?: string;
  formality_score?: number;
  tuck_style?: string;
}

export interface BuildOutfitPromptOptions {
  items: OutfitPromptItem[];
  tuck_style?: 'Tucked' | 'Untucked';
}

export function validateOutfitItems(
  items: OutfitPromptItem[]
):
  | { valid: true; items: OutfitPromptItem[] }
  | { valid: false; invalidItems: string[] } {
  const invalidItems: string[] = [];

  for (const item of items) {
    if (!item.category?.trim() || !item.color?.trim()) {
      invalidItems.push(item.name || '(unnamed item)');
    }
  }

  if (invalidItems.length > 0) {
    return { valid: false, invalidItems };
  }

  return { valid: true, items };
}

export function buildOutfitPrompt(options: BuildOutfitPromptOptions): string {
  const { items, tuck_style } = options;

  if (items.length === 0) {
    throw new Error('Cannot build outfit prompt: items array is empty.');
  }

  const validation = validateOutfitItems(items);
  if (!validation.valid) {
    throw new Error(
      `Cannot build outfit prompt: items missing required fields (category + color): ${validation.invalidItems.join(', ')}`
    );
  }

  const itemLines = items.map((item) => {
    const parts = [item.color];
    if (item.material?.trim()) {
      parts.push(item.material.trim());
    }
    parts.push(item.name);
    return `- A ${parts.join(' ')} (${item.category})`;
  });

  const resolvedTuckStyle =
    tuck_style ?? (items.find((i) => i.tuck_style)?.tuck_style as 'Tucked' | 'Untucked' | undefined);

  const garmentRequirements = [
    '- All items must be fully visible with no cropping',
    '- Realistic proportions and accurate construction for each item',
    '- Clear fabric texture and material detail for every garment',
    '- Even soft studio lighting across all items',
    '- Clean, sharp edges on each item',
    '- Items arranged in a natural, aesthetically pleasing flat-lay layout',
  ];

  if (resolvedTuckStyle) {
    garmentRequirements.push(
      `- Shirt styled ${resolvedTuckStyle.toLowerCase()} into pants/bottoms`
    );
  }

  const brandLines: string[] = [];
  const itemsWithBrands = items.filter((item) => item.brand?.trim());

  if (itemsWithBrands.length > 0) {
    for (const item of itemsWithBrands) {
      brandLines.push(
        `- ${item.name}: Subtle ${item.brand!.trim()} styling, no exaggerated logos`
      );
    }
  } else {
    brandLines.push('- No specific brand styling required');
  }

  return [
    '## Flat-Lay Outfit Composition Prompt',
    '',
    'Create a high-resolution product-style image of a complete outfit arranged in a **flat-lay composition** on a clean, neutral surface, viewed from directly above (bird\'s-eye view).',
    '',
    '### Items in This Outfit',
    '',
    ...itemLines,
    '',
    '### Garment Requirements',
    '',
    ...garmentRequirements,
    '',
    '### Background & Surface',
    '',
    '- Clean, neutral surface (light wood, marble, or off-white fabric)',
    '- Consistent, even surface texture',
    '- Subtle soft shadows beneath items for depth',
    '- No distracting patterns or colors on the surface',
    '- No additional props or decorations',
    '',
    '### Style Requirements',
    '',
    '- Minimal, modern fashion editorial aesthetic',
    '- No model or mannequin',
    '- Items arranged as if carefully placed for a lookbook photo',
    '- Natural spacing between items',
    '- Accessories placed near relevant garments',
    '- Clean, professional presentation',
    '',
    '### Brand Handling',
    '',
    ...brandLines,
    '',
    '### Output Specifications',
    '',
    '- Square image (1:1 aspect ratio)',
    '- Generous padding around the arrangement',
    '- Balanced composition suitable for web display',
    '- High detail and photorealistic rendering',
    '- WebP format compatible',
  ].join('\n');
}
