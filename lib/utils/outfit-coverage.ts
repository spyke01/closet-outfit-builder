import type { WardrobeItem } from '@/lib/types/database';

export type OutfitCoverageRole =
  | 'top'
  | 'bottom'
  | 'fullBody'
  | 'footwear'
  | 'layer'
  | 'accessory'
  | 'underlayer'
  | 'unknown';

export type OutfitSlotKey =
  | 'jacket'
  | 'overshirt'
  | 'shirt'
  | 'undershirt'
  | 'pants'
  | 'dress'
  | 'shoes'
  | 'belt'
  | 'watch'
  | 'accessory';

export type OutfitBaseTemplate = 'separates' | 'fullBody';

export interface NormalizedOutfitCategory {
  role: OutfitCoverageRole;
  slot: OutfitSlotKey | null;
  onboardingCategory:
    | 'Tops'
    | 'Bottoms'
    | 'Shoes'
    | 'Layers'
    | 'Dresses'
    | 'Accessories'
    | null;
}

type SelectionLike = {
  shirt?: unknown;
  undershirt?: unknown;
  pants?: unknown;
  dress?: unknown;
  shoes?: unknown;
};

const FULL_BODY_KEYWORDS = ['dress', 'jumper', 'jumpsuit', 'romper', 'one-piece', 'one piece'];
const LAYER_KEYWORDS = ['jacket', 'blazer', 'sportcoat', 'coat', 'outerwear'];
const OVERSHIRT_KEYWORDS = ['overshirt'];
const TOP_KEYWORDS = [
  'shirt',
  'blouse',
  'top',
  'tee',
  't-shirt',
  't shirt',
  'tank',
  'polo',
  'sweater',
  'hoodie',
  'quarter zip',
  'quarter-zip',
  'ocbd',
];
const BOTTOM_KEYWORDS = [
  'pants',
  'trouser',
  'trousers',
  'jean',
  'jeans',
  'chino',
  'chinos',
  'short',
  'shorts',
  'skirt',
  'legging',
  'leggings',
  'bottom',
];
const FOOTWEAR_KEYWORDS = ['shoe', 'shoes', 'boot', 'boots', 'sneaker', 'sneakers', 'loafer', 'loafers', 'heel', 'heels', 'flat', 'flats', 'sandal', 'sandals'];

function normalizeCategoryName(name?: string | null): string {
  return (name || '').trim().toLowerCase();
}

function includesKeyword(categoryName: string, keywords: string[]): boolean {
  return keywords.some((keyword) => categoryName.includes(keyword));
}

export function getNormalizedOutfitCategory(categoryName?: string | null): NormalizedOutfitCategory {
  const normalized = normalizeCategoryName(categoryName);

  if (!normalized) {
    return { role: 'unknown', slot: null, onboardingCategory: null };
  }

  if (normalized.includes('undershirt') || normalized === 'underlayer') {
    return { role: 'underlayer', slot: 'undershirt', onboardingCategory: 'Tops' };
  }

  if (includesKeyword(normalized, FULL_BODY_KEYWORDS)) {
    return { role: 'fullBody', slot: 'dress', onboardingCategory: 'Dresses' };
  }

  if (includesKeyword(normalized, OVERSHIRT_KEYWORDS)) {
    return { role: 'layer', slot: 'overshirt', onboardingCategory: 'Layers' };
  }

  if (normalized.includes('belt')) {
    return { role: 'accessory', slot: 'belt', onboardingCategory: 'Accessories' };
  }

  if (normalized.includes('watch')) {
    return { role: 'accessory', slot: 'watch', onboardingCategory: 'Accessories' };
  }

  if (normalized.includes('accessor') || normalized.includes('scarf') || normalized.includes('tie')) {
    return { role: 'accessory', slot: 'accessory', onboardingCategory: 'Accessories' };
  }

  if (includesKeyword(normalized, FOOTWEAR_KEYWORDS)) {
    return { role: 'footwear', slot: 'shoes', onboardingCategory: 'Shoes' };
  }

  if (includesKeyword(normalized, LAYER_KEYWORDS) || normalized.includes('cardigan')) {
    return { role: 'layer', slot: 'jacket', onboardingCategory: 'Layers' };
  }

  if (includesKeyword(normalized, BOTTOM_KEYWORDS)) {
    return { role: 'bottom', slot: 'pants', onboardingCategory: 'Bottoms' };
  }

  if (includesKeyword(normalized, TOP_KEYWORDS)) {
    return { role: 'top', slot: 'shirt', onboardingCategory: 'Tops' };
  }

  return { role: 'unknown', slot: null, onboardingCategory: null };
}

export function getOutfitSlotForCategoryName(categoryName?: string | null): OutfitSlotKey | null {
  return getNormalizedOutfitCategory(categoryName).slot;
}

export function getBaseTemplateFromItems(items: Array<Pick<WardrobeItem, 'category'> | WardrobeItem>): OutfitBaseTemplate | null {
  const roles = new Set(
    items
      .map((item) => getNormalizedOutfitCategory(item.category?.name).role)
      .filter((role) => role !== 'unknown')
  );

  if (roles.has('fullBody') && roles.has('footwear')) {
    return 'fullBody';
  }

  if (roles.has('top') && roles.has('bottom') && roles.has('footwear')) {
    return 'separates';
  }

  return null;
}

export function hasCompleteOutfitItems(items: Array<Pick<WardrobeItem, 'category'> | WardrobeItem>): boolean {
  return getBaseTemplateFromItems(items) !== null;
}

export function getBaseTemplateFromSelection(selection: SelectionLike): OutfitBaseTemplate | null {
  if (selection.dress && selection.shoes) {
    return 'fullBody';
  }

  const hasTop = Boolean(selection.shirt || selection.undershirt);
  const hasBottom = Boolean(selection.pants);
  const hasShoes = Boolean(selection.shoes);

  if (hasTop && hasBottom && hasShoes) {
    return 'separates';
  }

  return null;
}

export function hasCompleteOutfitSelection(selection: SelectionLike): boolean {
  return getBaseTemplateFromSelection(selection) !== null;
}

export function getSelectableCategoryIdsWithItems(
  categories: Array<{ id: string; name: string }>,
  items: WardrobeItem[]
): string[] {
  const categoryIdsWithItems = new Set(items.map((item) => item.category_id));

  return categories
    .filter((category) => categoryIdsWithItems.has(category.id))
    .map((category) => category.id);
}
