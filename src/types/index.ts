// Internal category keys (used in code)
export type CategoryKey = "jacket" | "shirt" | "pants" | "shoes" | "belt" | "watch";

// Display category names (shown to users)
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
}

export interface GeneratedOutfit extends OutfitSelection {
  id: string;
  score: number;
  source: 'curated' | 'generated';
}

// Utility functions for category mapping
export const categoryToKey = (category: Category): CategoryKey => {
  switch (category) {
    case "Jacket/Overshirt": return "jacket";
    case "Shirt": return "shirt";
    case "Pants": return "pants";
    case "Shoes": return "shoes";
    case "Belt": return "belt";
    case "Watch": return "watch";
  }
};

export const keyToCategory = (key: CategoryKey): Category => {
  switch (key) {
    case "jacket": return "Jacket/Overshirt";
    case "shirt": return "Shirt";
    case "pants": return "Pants";
    case "shoes": return "Shoes";
    case "belt": return "Belt";
    case "watch": return "Watch";
  }
};