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
    src: '/images/landing-optimized/sportcoat-tweed-grey.webp',
    alt: 'Grey tweed sport coat',
    category: 'jacket',
    style: 'business-casual',
    color: 'grey'
  },
  shirt: {
    src: '/images/landing-optimized/ocbd-white.webp',
    alt: 'White Oxford button-down shirt',
    category: 'shirt',
    style: 'business-casual',
    color: 'white'
  },
  pants: {
    src: '/images/landing-optimized/chino-navy.webp',
    alt: 'Navy chino pants',
    category: 'pants',
    style: 'business-casual',
    color: 'navy'
  },
  shoes: {
    src: '/images/landing-optimized/loafers-dark-brown.webp',
    alt: 'Dark brown leather loafers',
    category: 'shoes',
    style: 'business-casual',
    color: 'brown'
  },
  accessory: {
    src: '/images/landing-optimized/omega-seamaster-diver-300m.webp',
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
    src: '/images/landing-optimized/sportcoat-tweed-brown.webp',
    alt: 'Brown tweed blazer',
    category: 'jacket',
    style: 'business-casual',
    color: 'brown'
  },
  shirt: {
    src: '/images/landing-optimized/ocbd-blue.webp',
    alt: 'Light blue Oxford shirt',
    category: 'shirt',
    style: 'business-casual',
    color: 'blue'
  },
  pants: {
    src: '/images/landing-optimized/chino-khaki.webp',
    alt: 'Khaki chino pants',
    category: 'pants',
    style: 'casual',
    color: 'khaki'
  },
  shoes: {
    src: '/images/landing-optimized/loafers-light-tan.webp',
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
    src: '/images/landing-optimized/ocbd-striped.webp',
    alt: 'Striped Oxford shirt demonstrating smart outfit generation',
    category: 'shirt' as const,
    style: 'business-casual' as const,
    color: 'striped'
  },
  weatherAware: {
    src: '/images/landing-optimized/mac-coat-navy.webp',
    alt: 'Navy mac coat for weather-appropriate outfits',
    category: 'jacket' as const,
    style: 'casual' as const,
    color: 'navy'
  },
  capsuleWardrobe: {
    src: '/images/landing-optimized/quarterzip-navy.webp',
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
    src: '/images/landing-optimized/ocbd-navy.webp',
    alt: 'Navy Oxford button-down shirt',
    category: 'shirt',
    style: 'business-casual',
    color: 'navy'
  },
  {
    src: '/images/landing-optimized/chinos-grey.webp',
    alt: 'Grey chino pants',
    category: 'pants',
    style: 'casual',
    color: 'grey'
  },
  {
    src: '/images/landing-optimized/sneakers-white-leather.webp',
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
    src: '/images/landing-optimized/polo-navy.webp',
    alt: 'Navy polo shirt',
    category: 'shirt',
    style: 'casual',
    color: 'navy'
  },
  {
    src: '/images/landing-optimized/chinos-olive.webp',
    alt: 'Olive chino pants',
    category: 'pants',
    style: 'casual',
    color: 'olive'
  },
  {
    src: '/images/landing-optimized/loafers-tan-suede.webp',
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
    src: '/images/landing-optimized/cardigan-grey.webp',
    alt: 'Grey cardigan sweater',
    category: 'jacket',
    style: 'casual',
    color: 'grey'
  },
  {
    src: '/images/landing-optimized/tee-white.webp',
    alt: 'White t-shirt',
    category: 'shirt',
    style: 'casual',
    color: 'white'
  },
  {
    src: '/images/landing-optimized/jean-medium.webp',
    alt: 'Medium wash jeans',
    category: 'pants',
    style: 'casual',
    color: 'blue'
  },
  {
    src: '/images/landing-optimized/sneakers-killshots.webp',
    alt: 'White Nike Killshot sneakers',
    category: 'shoes',
    style: 'casual',
    color: 'white'
  }
];
