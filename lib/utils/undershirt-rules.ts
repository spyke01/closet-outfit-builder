import type { WardrobeItem } from '@/lib/types/database';

type ShirtLike = Pick<WardrobeItem, 'id' | 'name'> & { subcategory?: string };

const UNDERSHIRT_FRIENDLY_SHIRT_TOKENS = [
  'ocbd',
  'oxford',
  'button down',
  'button up',
  'dress shirt',
  'flannel',
  'chambray',
] as const;

const UNDERSHIRT_UNFRIENDLY_SHIRT_TOKENS = [
  'henley',
  'polo',
  'waffle',
  'waffle knit',
  'waffleknit',
  'crewneck',
  'crew neck',
  'sweater',
  'mock neck',
  'turtleneck',
  'tee',
  't shirt',
  'tshirt',
  'tank',
] as const;

function normalizeDescriptor(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function shirtSupportsUndershirt(shirt?: ShirtLike | null): boolean {
  if (!shirt) return false;

  const descriptor = normalizeDescriptor(
    [shirt.subcategory, shirt.name, shirt.id].filter(Boolean).join(' ')
  );
  const paddedDescriptor = ` ${descriptor} `;

  if (!descriptor) return false;

  if (UNDERSHIRT_UNFRIENDLY_SHIRT_TOKENS.some(token => paddedDescriptor.includes(` ${token} `))) {
    return false;
  }

  return UNDERSHIRT_FRIENDLY_SHIRT_TOKENS.some(token => paddedDescriptor.includes(` ${token} `));
}
