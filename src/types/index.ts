export type Category = "Jacket/Overshirt" | "Shirt" | "Pants" | "Shoes" | "Belt" | "Watch";

export type CapsuleTag = "Refined" | "Adventurer" | "Crossover" | "Shorts";

export type Season = "All" | "Summer";

export type Formality = "Refined" | "Rugged" | "Neutral";

export type TuckStyle = "Tucked" | "Untucked";

export interface WardrobeItem {
  id: string;
  name: string;
  category: Category;
  color?: string;
  material?: string;
  capsuleTags?: CapsuleTag[];
  season?: Season[];
  formality?: Formality;
  formalityScore?: number; // 1-10 scale: 1=very casual, 10=very formal
  image?: string;
  active?: boolean;
}

export interface CuratedOutfit {
  id: string;
  items: string[];
  tuck?: TuckStyle;
  weight?: number;
}

export interface OutfitSelection {
  jacket?: WardrobeItem;
  shirt?: WardrobeItem;
  pants?: WardrobeItem;
  shoes?: WardrobeItem;
  belt?: WardrobeItem;
  watch?: WardrobeItem;
  tuck?: TuckStyle;
  locked?: Set<Category>;
}

export interface GeneratedOutfit extends OutfitSelection {
  id: string;
  score: number;
  source: 'curated' | 'generated';
}