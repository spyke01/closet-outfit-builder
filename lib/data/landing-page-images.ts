/**
 * Landing Page Image Configuration
 * 
 * Centralized configuration for all landing page images to ensure
 * consistency and maintainability across the homepage and marketing pages.
 */

export interface WardrobeImage {
  src: string;
  alt: string;
  category: 'jacket' | 'shirt' | 'pants' | 'shoes' | 'accessory';
  style: 'casual' | 'business-casual' | 'formal';
  color: string;
}

export interface OutfitCombo {
  id: string;
  name: string;
  jacket?: WardrobeImage;
  shirt: WardrobeImage;
  pants: WardrobeImage;
  shoes: WardrobeImage;
  accessory?: WardrobeImage;
}

/**
 * Hero Section Outfit
 * Smart casual combination featuring classic business-casual pieces
 */
export const heroOutfit: OutfitCombo = {
  id: 'hero-outfit',
  name: 'Smart Casual Hero',
  jacket: {
    src: '/images/wardrobe/sportcoat-tweed-grey.png',
    alt: 'Grey tweed sport coat',
    category: 'jacket',
    style: 'business-casual',
    color: 'grey'
  },
  shirt: {
    src: '/images/wardrobe/ocbd-white.png',
    alt: 'White Oxford button-down shirt',
    category: 'shirt',
    style: 'business-casual',
    color: 'white'
  },
  pants: {
    src: '/images/wardrobe/chino-navy.png',
    alt: 'Navy chino pants',
    category: 'pants',
    style: 'business-casual',
    color: 'navy'
  },
  shoes: {
    src: '/images/wardrobe/loafers-dark-brown.png',
    alt: 'Dark brown leather loafers',
    category: 'shoes',
    style: 'business-casual',
    color: 'brown'
  },
  accessory: {
    src: '/images/wardrobe/omega-seamaster-diver-300m.png',
    alt: 'Silver Omega Seamaster Diver 300M watch',
    category: 'accessory',
    style: 'business-casual',
    color: 'silver'
  }
};

/**
 * App Demo Outfit
 * Business casual combination for demonstrating the app interface
 */
export const appDemoOutfit: OutfitCombo = {
  id: 'app-demo-outfit',
  name: 'Business Casual Demo',
  jacket: {
    src: '/images/wardrobe/sportcoat-tweed-brown.png',
    alt: 'Brown tweed blazer',
    category: 'jacket',
    style: 'business-casual',
    color: 'brown'
  },
  shirt: {
    src: '/images/wardrobe/ocbd-blue.png',
    alt: 'Light blue Oxford shirt',
    category: 'shirt',
    style: 'business-casual',
    color: 'blue'
  },
  pants: {
    src: '/images/wardrobe/chino-khaki.png',
    alt: 'Khaki chino pants',
    category: 'pants',
    style: 'casual',
    color: 'khaki'
  },
  shoes: {
    src: '/images/wardrobe/loafers-light-tan.png',
    alt: 'Light tan suede loafers',
    category: 'shoes',
    style: 'casual',
    color: 'tan'
  }
};

/**
 * Feature Highlight Images
 * Representative items for each key feature on the homepage
 */
export const featureImages = {
  smartGenerator: {
    src: '/images/wardrobe/ocbd-striped.png',
    alt: 'Striped Oxford shirt demonstrating smart outfit generation',
    category: 'shirt' as const,
    style: 'business-casual' as const,
    color: 'striped'
  },
  weatherAware: {
    src: '/images/wardrobe/mac-coat-navy.png',
    alt: 'Navy mac coat for weather-appropriate outfits',
    category: 'jacket' as const,
    style: 'casual' as const,
    color: 'navy'
  },
  capsuleWardrobe: {
    src: '/images/wardrobe/quarterzip-navy.png',
    alt: 'Navy quarter-zip for capsule wardrobe building',
    category: 'jacket' as const,
    style: 'casual' as const,
    color: 'navy'
  }
};

/**
 * How It Works - Upload Step Items
 * Items shown in the upload step visualization
 */
export const uploadStepItems: WardrobeImage[] = [
  {
    src: '/images/wardrobe/ocbd-navy.png',
    alt: 'Navy Oxford button-down shirt',
    category: 'shirt',
    style: 'business-casual',
    color: 'navy'
  },
  {
    src: '/images/wardrobe/chinos-grey.png',
    alt: 'Grey chino pants',
    category: 'pants',
    style: 'casual',
    color: 'grey'
  },
  {
    src: '/images/wardrobe/sneakers-white-leather.png',
    alt: 'White leather sneakers',
    category: 'shoes',
    style: 'casual',
    color: 'white'
  }
];

/**
 * How It Works - AI Matching Items
 * Items shown during the AI matching step
 */
export const aiMatchingItems: WardrobeImage[] = [
  {
    src: '/images/wardrobe/polo-navy.png',
    alt: 'Navy polo shirt',
    category: 'shirt',
    style: 'casual',
    color: 'navy'
  },
  {
    src: '/images/wardrobe/chinos-olive.png',
    alt: 'Olive chino pants',
    category: 'pants',
    style: 'casual',
    color: 'olive'
  },
  {
    src: '/images/wardrobe/loafers-tan-suede.png',
    alt: 'Tan suede loafers',
    category: 'shoes',
    style: 'casual',
    color: 'tan'
  }
];

/**
 * How It Works - Final Outfit Items
 * Complete outfit shown in the final step
 */
export const finalOutfitItems: WardrobeImage[] = [
  {
    src: '/images/wardrobe/cardigan-grey.png',
    alt: 'Grey cardigan sweater',
    category: 'jacket',
    style: 'casual',
    color: 'grey'
  },
  {
    src: '/images/wardrobe/tee-white.png',
    alt: 'White t-shirt',
    category: 'shirt',
    style: 'casual',
    color: 'white'
  },
  {
    src: '/images/wardrobe/jean-medium.png',
    alt: 'Medium wash jeans',
    category: 'pants',
    style: 'casual',
    color: 'blue'
  },
  {
    src: '/images/wardrobe/sneakers-killshots.png',
    alt: 'White Nike Killshot sneakers',
    category: 'shoes',
    style: 'casual',
    color: 'white'
  }
];
