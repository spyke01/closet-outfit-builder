/**
 * Measurement Guide Data for System Categories
 * 
 * This file contains comprehensive measurement guides for all 16 system categories
 * (8 men's and 8 women's). Each guide includes:
 * - Measurement fields with descriptions
 * - Typical size ranges
 * - Visual diagram references
 * - Size examples
 * 
 * Used by the MeasurementGuide component to display category-specific
 * measurement instructions to users.
 */

import type { SizingFormat } from '@/lib/types/sizes';

/**
 * Gender type for categories
 */
export type Gender = 'men' | 'women' | 'unisex';

/**
 * Measurement field definition
 */
export interface MeasurementField {
  /** Field identifier (e.g., "collar", "chest", "waist") */
  name: string;
  /** Display label for the field */
  label: string;
  /** Detailed measurement instructions */
  description: string;
  /** Measurement unit (inches or cm) */
  unit?: 'inches' | 'cm';
  /** Typical range for this measurement [min, max] */
  typical_range?: [number, number];
  /** Predefined options (e.g., ["Short", "Regular", "Long"]) */
  options?: string[];
  /** Reference to visual diagram (placeholder for future implementation) */
  diagram_ref?: string;
}

/**
 * Complete measurement guide for a category
 */
export interface MeasurementGuide {
  /** Category name */
  category_name: string;
  /** Lucide icon name */
  icon: string;
  /** Gender classification */
  gender: Gender;
  /** Supported sizing formats */
  supported_formats: SizingFormat[];
  /** Array of measurement fields */
  measurement_fields: MeasurementField[];
  /** Example sizes for this category */
  size_examples: string[];
  /** General tips for this category */
  tips?: string[];
}

/**
 * Men's Dress Shirt Measurement Guide
 */
const mensDressShirt: MeasurementGuide = {
  category_name: "Dress Shirt",
  icon: "shirt",
  gender: "men",
  supported_formats: ["numeric", "measurements"],
  measurement_fields: [
    {
      name: "collar",
      label: "Collar Size",
      description: "Measure around the base of your neck where the collar sits. Add 1/2 inch for comfort.",
      unit: "inches",
      typical_range: [14, 18],
      diagram_ref: "collar-measurement"
    },
    {
      name: "sleeve",
      label: "Sleeve Length",
      description: "Measure from the center back of your neck, across your shoulder, down to your wrist with arm slightly bent.",
      unit: "inches",
      typical_range: [32, 36],
      diagram_ref: "sleeve-measurement"
    }
  ],
  size_examples: ["15/33", "15.5/34", "16/34", "16.5/35", "17/36"],
  tips: [
    "Measure with a flexible tape measure",
    "Keep one finger between tape and neck for comfort",
    "Measure over a thin undershirt if you typically wear one"
  ]
};

/**
 * Men's Casual Shirt Measurement Guide
 */
const mensCasualShirt: MeasurementGuide = {
  category_name: "Casual Shirt",
  icon: "shirt",
  gender: "men",
  supported_formats: ["letter", "numeric"],
  measurement_fields: [
    {
      name: "chest",
      label: "Chest Size",
      description: "Measure around the fullest part of your chest, under your arms, keeping the tape level.",
      unit: "inches",
      typical_range: [34, 52],
      diagram_ref: "chest-measurement"
    }
  ],
  size_examples: ["S", "M", "L", "XL", "XXL"],
  tips: [
    "Measure over a thin t-shirt",
    "Keep tape snug but not tight",
    "Breathe normally while measuring"
  ]
};

/**
 * Men's Suit Jacket Measurement Guide
 */
const mensSuitJacket: MeasurementGuide = {
  category_name: "Suit Jacket",
  icon: "briefcase",
  gender: "men",
  supported_formats: ["numeric", "letter"],
  measurement_fields: [
    {
      name: "chest",
      label: "Chest Size",
      description: "Measure around the fullest part of your chest under your arms. This is your jacket size.",
      unit: "inches",
      typical_range: [34, 52],
      diagram_ref: "chest-measurement"
    },
    {
      name: "length",
      label: "Jacket Length",
      description: "Choose based on your height: Short (5'4\"-5'7\"), Regular (5'8\"-6'0\"), Long (6'1\"-6'4\")",
      options: ["Short", "Regular", "Long"],
      diagram_ref: "jacket-length"
    }
  ],
  size_examples: ["38R", "40R", "42R", "44L", "46L"],
  tips: [
    "Jacket size is typically 6-7 inches larger than your chest measurement",
    "Short = S, Regular = R, Long = L",
    "Try on with dress shirt for accurate fit"
  ]
};

/**
 * Men's Pants Measurement Guide
 */
const mensPants: MeasurementGuide = {
  category_name: "Pants",
  icon: "ruler",
  gender: "men",
  supported_formats: ["waist-inseam"],
  measurement_fields: [
    {
      name: "waist",
      label: "Waist Size",
      description: "Measure around your natural waistline, where you typically wear your pants.",
      unit: "inches",
      typical_range: [28, 44],
      diagram_ref: "waist-measurement"
    },
    {
      name: "inseam",
      label: "Inseam Length",
      description: "Measure from the crotch seam down to where you want the hem to fall (typically top of shoe).",
      unit: "inches",
      typical_range: [28, 36],
      diagram_ref: "inseam-measurement"
    }
  ],
  size_examples: ["30x30", "32x32", "34x32", "36x34"],
  tips: [
    "Measure over underwear only",
    "Don't pull tape too tight",
    "Inseam varies by style (dress pants vs. casual)"
  ]
};

/**
 * Men's Jeans Measurement Guide
 */
const mensJeans: MeasurementGuide = {
  category_name: "Jeans",
  icon: "ruler",
  gender: "men",
  supported_formats: ["waist-inseam"],
  measurement_fields: [
    {
      name: "waist",
      label: "Waist Size",
      description: "Measure around your natural waistline. Jeans often run smaller than dress pants.",
      unit: "inches",
      typical_range: [28, 44],
      diagram_ref: "waist-measurement"
    },
    {
      name: "inseam",
      label: "Inseam Length",
      description: "Measure from crotch seam to desired hem length. Consider if you'll cuff or stack.",
      unit: "inches",
      typical_range: [28, 36],
      diagram_ref: "inseam-measurement"
    }
  ],
  size_examples: ["30x30", "32x32", "34x32", "36x34"],
  tips: [
    "Jeans may stretch 1-2 inches with wear",
    "Raw denim shrinks - size up if unsure",
    "Different brands fit differently"
  ]
};

/**
 * Men's Shoes Measurement Guide
 */
const mensShoes: MeasurementGuide = {
  category_name: "Shoes",
  icon: "footprints",
  gender: "men",
  supported_formats: ["numeric"],
  measurement_fields: [
    {
      name: "length",
      label: "Foot Length",
      description: "Measure from heel to longest toe while standing. Use a Brannock device for accuracy.",
      unit: "inches",
      typical_range: [9, 13],
      diagram_ref: "foot-length"
    },
    {
      name: "width",
      label: "Foot Width",
      description: "Measure across the widest part of your foot. Common widths: D (standard), E (wide), EE (extra wide).",
      options: ["Narrow (B)", "Standard (D)", "Wide (E)", "Extra Wide (EE)"],
      diagram_ref: "foot-width"
    }
  ],
  size_examples: ["8", "9", "10", "11", "12"],
  tips: [
    "Measure feet at end of day when they're largest",
    "Measure both feet - use larger size",
    "Sizes vary by brand and style"
  ]
};

/**
 * Men's Belt Measurement Guide
 */
const mensBelt: MeasurementGuide = {
  category_name: "Belt",
  icon: "minus",
  gender: "men",
  supported_formats: ["numeric"],
  measurement_fields: [
    {
      name: "waist",
      label: "Belt Size",
      description: "Measure your pant waist size and add 2 inches. Or measure from buckle to current hole.",
      unit: "inches",
      typical_range: [28, 44],
      diagram_ref: "belt-measurement"
    }
  ],
  size_examples: ["32", "34", "36", "38", "40"],
  tips: [
    "Belt size = pant waist + 2 inches",
    "Middle hole should be most comfortable",
    "Leather belts may stretch over time"
  ]
};

/**
 * Men's Coat/Jacket Measurement Guide
 */
const mensCoatJacket: MeasurementGuide = {
  category_name: "Coat/Jacket",
  icon: "coat",
  gender: "men",
  supported_formats: ["letter", "numeric"],
  measurement_fields: [
    {
      name: "chest",
      label: "Chest Size",
      description: "Measure around fullest part of chest. Consider layering - measure over typical clothing.",
      unit: "inches",
      typical_range: [36, 54],
      diagram_ref: "chest-measurement"
    },
    {
      name: "sleeve",
      label: "Sleeve Length",
      description: "Measure from shoulder seam to wrist. Consider if you'll wear over layers.",
      unit: "inches",
      typical_range: [32, 36],
      diagram_ref: "sleeve-measurement"
    }
  ],
  size_examples: ["S", "M", "L", "XL", "XXL"],
  tips: [
    "Size up if you layer heavily",
    "Try on with typical layers",
    "Consider sleeve length for gloves"
  ]
};

/**
 * Women's Dress Measurement Guide
 */
const womensDress: MeasurementGuide = {
  category_name: "Dress",
  icon: "dress",
  gender: "women",
  supported_formats: ["numeric", "letter"],
  measurement_fields: [
    {
      name: "bust",
      label: "Bust Size",
      description: "Measure around the fullest part of your bust, keeping tape level across back.",
      unit: "inches",
      typical_range: [32, 48],
      diagram_ref: "bust-measurement"
    },
    {
      name: "waist",
      label: "Waist Size",
      description: "Measure around your natural waistline (narrowest part of torso).",
      unit: "inches",
      typical_range: [24, 40],
      diagram_ref: "waist-measurement"
    },
    {
      name: "hips",
      label: "Hip Size",
      description: "Measure around the fullest part of your hips and buttocks.",
      unit: "inches",
      typical_range: [34, 50],
      diagram_ref: "hip-measurement"
    }
  ],
  size_examples: ["0", "2", "4", "6", "8", "10", "12", "XS", "S", "M", "L"],
  tips: [
    "Measure over undergarments only",
    "Keep tape snug but not tight",
    "Sizes vary significantly by brand"
  ]
};

/**
 * Women's Blouse/Top Measurement Guide
 */
const womensBlouseTop: MeasurementGuide = {
  category_name: "Blouse/Top",
  icon: "shirt",
  gender: "women",
  supported_formats: ["letter", "numeric"],
  measurement_fields: [
    {
      name: "bust",
      label: "Bust Size",
      description: "Measure around the fullest part of your bust with arms relaxed at sides.",
      unit: "inches",
      typical_range: [32, 48],
      diagram_ref: "bust-measurement"
    },
    {
      name: "shoulder",
      label: "Shoulder Width",
      description: "Measure from shoulder seam to shoulder seam across back.",
      unit: "inches",
      typical_range: [14, 18],
      diagram_ref: "shoulder-measurement"
    }
  ],
  size_examples: ["XS", "S", "M", "L", "XL"],
  tips: [
    "Consider bra style when measuring",
    "Fitted vs. relaxed fit affects sizing",
    "Check brand size charts"
  ]
};

/**
 * Women's Pants Measurement Guide
 */
const womensPants: MeasurementGuide = {
  category_name: "Women's Pants",
  icon: "ruler",
  gender: "women",
  supported_formats: ["numeric", "waist-inseam"],
  measurement_fields: [
    {
      name: "waist",
      label: "Waist Size",
      description: "Measure around your natural waistline or where pants typically sit.",
      unit: "inches",
      typical_range: [24, 40],
      diagram_ref: "waist-measurement"
    },
    {
      name: "hips",
      label: "Hip Size",
      description: "Measure around the fullest part of your hips and buttocks.",
      unit: "inches",
      typical_range: [34, 50],
      diagram_ref: "hip-measurement"
    },
    {
      name: "inseam",
      label: "Inseam Length",
      description: "Measure from crotch seam to desired hem length. Consider heel height.",
      unit: "inches",
      typical_range: [26, 34],
      diagram_ref: "inseam-measurement"
    }
  ],
  size_examples: ["0", "2", "4", "6", "8", "10", "12", "25x30", "27x32"],
  tips: [
    "High-rise vs. low-rise affects waist measurement",
    "Consider heel height for inseam",
    "Stretch fabrics may fit differently"
  ]
};

/**
 * Women's Jeans Measurement Guide
 */
const womensJeans: MeasurementGuide = {
  category_name: "Women's Jeans",
  icon: "ruler",
  gender: "women",
  supported_formats: ["numeric", "waist-inseam"],
  measurement_fields: [
    {
      name: "waist",
      label: "Waist Size",
      description: "Measure where jeans will sit (varies by rise). Consider stretch in fabric.",
      unit: "inches",
      typical_range: [24, 40],
      diagram_ref: "waist-measurement"
    },
    {
      name: "hips",
      label: "Hip Size",
      description: "Measure around fullest part of hips. Critical for proper fit.",
      unit: "inches",
      typical_range: [34, 50],
      diagram_ref: "hip-measurement"
    },
    {
      name: "inseam",
      label: "Inseam Length",
      description: "Measure from crotch to desired hem. Consider if you'll cuff or hem.",
      unit: "inches",
      typical_range: [26, 34],
      diagram_ref: "inseam-measurement"
    }
  ],
  size_examples: ["24", "25", "26", "27", "28", "29", "30", "25x30", "27x32"],
  tips: [
    "Stretch denim fits differently than rigid",
    "Rise affects where waist sits",
    "Jeans may stretch with wear"
  ]
};

/**
 * Women's Shoes Measurement Guide
 */
const womensShoes: MeasurementGuide = {
  category_name: "Women's Shoes",
  icon: "footprints",
  gender: "women",
  supported_formats: ["numeric"],
  measurement_fields: [
    {
      name: "length",
      label: "Foot Length",
      description: "Measure from heel to longest toe while standing. Use a Brannock device for accuracy.",
      unit: "inches",
      typical_range: [8, 11],
      diagram_ref: "foot-length"
    },
    {
      name: "width",
      label: "Foot Width",
      description: "Measure across widest part of foot. Common widths: B (standard), D (wide).",
      options: ["Narrow (AA)", "Standard (B)", "Wide (D)", "Extra Wide (E)"],
      diagram_ref: "foot-width"
    }
  ],
  size_examples: ["5", "6", "7", "8", "9", "10"],
  tips: [
    "Measure feet at end of day",
    "Measure both feet - use larger size",
    "Heel height affects fit"
  ]
};

/**
 * Women's Jacket/Coat Measurement Guide
 */
const womensJacketCoat: MeasurementGuide = {
  category_name: "Jacket/Coat",
  icon: "coat",
  gender: "women",
  supported_formats: ["letter", "numeric"],
  measurement_fields: [
    {
      name: "bust",
      label: "Bust Size",
      description: "Measure around fullest part of bust. Consider layering underneath.",
      unit: "inches",
      typical_range: [32, 48],
      diagram_ref: "bust-measurement"
    },
    {
      name: "shoulder",
      label: "Shoulder Width",
      description: "Measure from shoulder seam to shoulder seam across back.",
      unit: "inches",
      typical_range: [14, 18],
      diagram_ref: "shoulder-measurement"
    },
    {
      name: "sleeve",
      label: "Sleeve Length",
      description: "Measure from shoulder to wrist. Consider if you'll wear over layers.",
      unit: "inches",
      typical_range: [30, 34],
      diagram_ref: "sleeve-measurement"
    }
  ],
  size_examples: ["XS", "S", "M", "L", "XL", "0", "2", "4", "6", "8"],
  tips: [
    "Size up for heavy layering",
    "Try on with typical layers",
    "Consider sleeve length for gloves"
  ]
};

/**
 * Women's Suit Jacket Measurement Guide
 */
const womensSuitJacket: MeasurementGuide = {
  category_name: "Women's Suit Jacket",
  icon: "briefcase",
  gender: "women",
  supported_formats: ["numeric"],
  measurement_fields: [
    {
      name: "bust",
      label: "Bust Size",
      description: "Measure around fullest part of bust. Jacket should fit over blouse comfortably.",
      unit: "inches",
      typical_range: [32, 48],
      diagram_ref: "bust-measurement"
    },
    {
      name: "waist",
      label: "Waist Size",
      description: "Measure at natural waistline for proper jacket fit.",
      unit: "inches",
      typical_range: [24, 40],
      diagram_ref: "waist-measurement"
    },
    {
      name: "shoulder",
      label: "Shoulder Width",
      description: "Measure from shoulder seam to shoulder seam. Critical for professional fit.",
      unit: "inches",
      typical_range: [14, 18],
      diagram_ref: "shoulder-measurement"
    }
  ],
  size_examples: ["0", "2", "4", "6", "8", "10", "12"],
  tips: [
    "Try on with dress shirt",
    "Shoulders should fit perfectly",
    "Consider tailoring for best fit"
  ]
};

/**
 * Women's Belt Measurement Guide
 */
const womensBelt: MeasurementGuide = {
  category_name: "Women's Belt",
  icon: "minus",
  gender: "women",
  supported_formats: ["letter", "numeric"],
  measurement_fields: [
    {
      name: "waist",
      label: "Belt Size",
      description: "Measure where you'll wear the belt (natural waist, hips, or over clothing).",
      unit: "inches",
      typical_range: [24, 40],
      diagram_ref: "belt-measurement"
    }
  ],
  size_examples: ["XS", "S", "M", "L", "26", "28", "30", "32"],
  tips: [
    "Consider where belt will sit",
    "Middle hole should be comfortable",
    "Measure over typical clothing if worn over layers"
  ]
};

/**
 * Complete measurement guides map
 * Key is the category name, value is the measurement guide
 */
export const MEASUREMENT_GUIDES: Record<string, MeasurementGuide> = {
  // Men's categories
  "Dress Shirt": mensDressShirt,
  "Casual Shirt": mensCasualShirt,
  "Suit Jacket": mensSuitJacket,
  "Pants": mensPants,
  "Jeans": mensJeans,
  "Shoes": mensShoes,
  "Belt": mensBelt,
  "Coat/Jacket": mensCoatJacket,
  
  // Women's categories
  "Dress": womensDress,
  "Blouse/Top": womensBlouseTop,
  "Women's Pants": womensPants,
  "Women's Jeans": womensJeans,
  "Women's Shoes": womensShoes,
  "Jacket/Coat": womensJacketCoat,
  "Women's Suit Jacket": womensSuitJacket,
  "Women's Belt": womensBelt
};

/**
 * Get measurement guide for a category by name
 * Returns undefined if category not found
 */
export function getMeasurementGuide(categoryName: string): MeasurementGuide | undefined {
  return MEASUREMENT_GUIDES[categoryName];
}

/**
 * Get all measurement guides for a specific gender
 */
export function getMeasurementGuidesByGender(gender: Gender): MeasurementGuide[] {
  return Object.values(MEASUREMENT_GUIDES).filter(guide => guide.gender === gender);
}

/**
 * Get all men's measurement guides
 */
export function getMensMeasurementGuides(): MeasurementGuide[] {
  return getMeasurementGuidesByGender('men');
}

/**
 * Get all women's measurement guides
 */
export function getWomensMeasurementGuides(): MeasurementGuide[] {
  return getMeasurementGuidesByGender('women');
}

/**
 * Check if a category has a measurement guide
 */
export function hasMeasurementGuide(categoryName: string): boolean {
  return categoryName in MEASUREMENT_GUIDES;
}
