/**
 * Builds a product-style image generation prompt for a wardrobe item.
 * Follows the same section format as scripts/generate-wardrobe-item-images.ts.
 */

const SUBCATEGORY_MATERIAL_MAP: Record<string, string> = {
  'T-Shirt': 'cotton jersey',
  Polo: 'cotton pique',
  OCBD: 'oxford cotton',
  'Dress Shirt': 'cotton poplin',
  Blouse: 'silk blend',
  'Tank Top': 'cotton rib',
  Sweater: 'wool knit',
  Cardigan: 'knit wool blend',
  Hoodie: 'cotton fleece',
  'Quarter Zip': 'merino wool knit',
  Jeans: 'denim',
  Chinos: 'cotton twill',
  Trousers: 'wool blend',
  Shorts: 'cotton twill',
  Skirt: 'cotton blend',
  Leggings: 'stretch jersey',
  Sneakers: 'leather and mesh',
  Loafers: 'leather',
  Boots: 'leather',
  'Dress Shoes': 'polished leather',
  Heels: 'leather',
  Flats: 'leather',
  Sandals: 'leather',
  Blazer: 'wool blend',
  Sportcoat: 'textured wool',
  Jacket: 'cotton canvas',
  Coat: 'wool blend',
  'Mini Dress': 'crepe',
  'Midi Dress': 'silk blend',
  'Maxi Dress': 'lightweight cotton',
  'Cocktail Dress': 'satin blend',
  'Casual Dress': 'cotton jersey',
  Belt: 'leather',
  Tie: 'silk',
  Watch: 'stainless steel',
  Scarf: 'wool',
};

export interface WardrobeItemPromptInput {
  name: string;
  category: string;
  color: string;
  brand?: string;
  material?: string;
}

function resolveMaterial(name: string, material?: string): string {
  if (material && material.trim().length > 0) {
    return material.trim();
  }
  return SUBCATEGORY_MATERIAL_MAP[name] ?? 'fabric';
}

export function buildWardrobeItemPrompt(item: WardrobeItemPromptInput): string {
  const color = item.color.trim();
  const material = resolveMaterial(item.name, item.material);
  const garment = item.name.trim();
  const brand = item.brand?.trim() || '';

  return [
    '## White Background Garment Image Generator Prompt',
    '',
    `Create a high-resolution product-style PNG image of a **${color} ${material} ${garment}** on a pure solid white background (#FFFFFF).`,
    '',
    '### Garment Requirements',
    '',
    '- The garment must be fully visible from top to bottom',
    '- No cropping of sleeves, hems, collars, cuffs, waistbands, or edges',
    '- Centered and perfectly straight',
    '- Realistic proportions and accurate construction',
    '- Clear fabric texture and material detail',
    '- Even soft studio lighting',
    '- Clean, sharp edges suitable for compositing',
    '- No distortion',
    '',
    '### Background Requirements',
    '',
    '- Pure solid white background (#FFFFFF) only',
    '- No transparency or alpha channel',
    '- No checkerboard, grid, or tiled pattern background',
    '- No drop shadow or cast shadow of any kind',
    '- No floor line',
    '- No gradient',
    '- No colored backdrop',
    '- No halo artifacts',
    '',
    '### Style Requirements',
    '',
    '- Minimal, modern e-commerce aesthetic',
    '- No model',
    '- No props',
    '- No dramatic lighting',
    '- No excessive wrinkles',
    '- Clean, crisp presentation',
    '',
    '### Brand Handling (Optional)',
    '',
    `Brand provided: **${brand || 'None'}**`,
    '- If brand is provided, include subtle, realistic styling consistent with the brand',
    '- Do not exaggerate logos',
    '- No oversized branding unless typical for the garment type',
    '',
    '### Output Specifications',
    '',
    '- Square image',
    '- Generous padding around the garment',
    '- Balanced composition suitable for grid slicing',
    '- PNG format',
  ].join('\n');
}
