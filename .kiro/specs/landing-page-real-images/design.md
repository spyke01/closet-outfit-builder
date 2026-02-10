# Landing Page Real Images - Design Document

## Overview

This design document outlines the implementation strategy for replacing placeholder images with real wardrobe photography across all landing pages. The solution leverages existing wardrobe assets, Next.js Image optimization, and maintains performance and accessibility standards.

## Architecture

### Component Structure

```
app/
├── page.tsx (Homepage - orchestrator)
├── about/page.tsx (About page)
└── how-it-works/page.tsx (How It Works page)

components/homepage/
├── hero-section.tsx (Update: Add real outfit images)
├── app-demo.tsx (Update: Add real wardrobe items)
├── feature-highlights.tsx (Update: Add feature-specific images)
├── how-it-works.tsx (Update: Add step visualizations)
└── testimonials.tsx (Review: May need images)

lib/data/
└── landing-page-images.ts (New: Centralized image configuration)
```

### Image Asset Management

Create a centralized configuration for all landing page images to ensure consistency and maintainability.

## Detailed Design

### 1. Image Configuration Module

**File**: `lib/data/landing-page-images.ts`


Purpose: Centralize all landing page image paths and metadata for easy maintenance and consistency.

```typescript
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

// Hero section outfit
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
    alt: 'Omega Seamaster watch',
    category: 'accessory',
    style: 'business-casual',
    color: 'silver'
  }
};


// App demo outfit
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

// How It Works - Upload step items
export const uploadStepItems: WardrobeImage[] = [
  {
    src: '/images/wardrobe/ocbd-navy.png',
    alt: 'Navy Oxford shirt',
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

// How It Works - AI matching items
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


// How It Works - Final outfit
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
    alt: 'Nike Killshot sneakers',
    category: 'shoes',
    style: 'casual',
    color: 'white'
  }
];

// Feature highlight images
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
```

### 2. Hero Section Update

**Component**: `components/homepage/hero-section.tsx`

**Changes**:
- Replace colored gradient boxes with real wardrobe images
- Use Next.js Image component for optimization
- Maintain responsive grid layout
- Add proper alt text for accessibility



**Implementation**:
```typescript
import Image from 'next/image';
import { heroOutfit } from '@/lib/data/landing-page-images';

// Replace the grid of colored boxes with:
<div className="grid grid-cols-2 gap-4">
  <div className="aspect-square bg-white rounded-2xl overflow-hidden shadow-sm">
    <Image
      src={heroOutfit.shirt.src}
      alt={heroOutfit.shirt.alt}
      width={200}
      height={200}
      className="w-full h-full object-contain p-4"
      priority
    />
  </div>
  <div className="aspect-square bg-white rounded-2xl overflow-hidden shadow-sm">
    <Image
      src={heroOutfit.pants.src}
      alt={heroOutfit.pants.alt}
      width={200}
      height={200}
      className="w-full h-full object-contain p-4"
    />
  </div>
  <div className="aspect-square bg-white rounded-2xl overflow-hidden shadow-sm">
    <Image
      src={heroOutfit.shoes.src}
      alt={heroOutfit.shoes.alt}
      width={200}
      height={200}
      className="w-full h-full object-contain p-4"
    />
  </div>
  <div className="aspect-square bg-white rounded-2xl overflow-hidden shadow-sm">
    <Image
      src={heroOutfit.accessory!.src}
      alt={heroOutfit.accessory!.alt}
      width={200}
      height={200}
      className="w-full h-full object-contain p-4"
    />
  </div>
</div>
```

**Rationale**:
- `priority` prop on first image for LCP optimization
- `object-contain` ensures items aren't stretched
- White background provides clean presentation
- Padding prevents items from touching edges

### 3. App Demo Section Update

**Component**: `components/homepage/app-demo.tsx`

**Changes**:
- Replace gradient overlays with actual wardrobe images
- Update item labels to match real items
- Maintain 4-column grid layout
- Keep compatibility score visualization



**Implementation**:
```typescript
import Image from 'next/image';
import { appDemoOutfit } from '@/lib/data/landing-page-images';

// Replace each outfit grid item:
<div className="space-y-2">
  <div className="aspect-square bg-white rounded-2xl overflow-hidden shadow-sm">
    <Image
      src={appDemoOutfit.jacket!.src}
      alt={appDemoOutfit.jacket!.alt}
      width={150}
      height={150}
      className="w-full h-full object-contain p-3"
    />
  </div>
  <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
    Brown Tweed Blazer
  </p>
</div>
```

**Rationale**:
- Smaller padding (p-3) for tighter grid layout
- Descriptive labels match actual items
- Maintains existing responsive behavior
- White background for consistency

### 4. Feature Highlights Update

**Component**: `components/homepage/feature-highlights.tsx`

**Changes**:
- Add small product images to feature cards
- Images complement icon and text
- Maintain icon prominence
- Add subtle image presentation

**Implementation**:
```typescript
import Image from 'next/image';
import { featureImages } from '@/lib/data/landing-page-images';

// Add image below icon in each feature card:
<div className="group text-center animate-slide-up">
  <div className={`w-20 h-20 bg-gradient-to-br ${feature.gradient} rounded-3xl flex items-center justify-center mx-auto mb-6`}>
    <Icon className={`w-10 h-10 ${feature.iconColor}`} />
  </div>
  
  {/* New: Add product image */}
  <div className="w-32 h-32 mx-auto mb-4 relative">
    <Image
      src={feature.image.src}
      alt={feature.image.alt}
      width={128}
      height={128}
      className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
    />
  </div>
  
  <h3 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
    {feature.title}
  </h3>
  {/* ... rest of card */}
</div>
```



**Rationale**:
- Images support but don't overshadow the icon
- Opacity transition adds polish
- Maintains existing layout structure
- Provides visual context for each feature

### 5. How It Works Page Update

**Component**: `app/how-it-works/page.tsx`

**Changes**:
- Step 1 (Upload): Show real clothing items in grid
- Step 2 (AI Matching): Display items being analyzed
- Step 3 (Final Outfit): Show complete outfit combination

**Implementation - Step 1 (Upload)**:
```typescript
import Image from 'next/image';
import { uploadStepItems } from '@/lib/data/landing-page-images';

{step.image === 'upload' && (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
        <Upload className="w-12 h-12 text-amber-600" />
      </div>
      <p className="text-slate-600 dark:text-slate-400">Drag & drop your photos</p>
    </div>
    <div className="grid grid-cols-3 gap-3">
      {uploadStepItems.map((item, i) => (
        <div key={i} className="aspect-square bg-white rounded-xl overflow-hidden shadow-sm">
          <Image
            src={item.src}
            alt={item.alt}
            width={120}
            height={120}
            className="w-full h-full object-contain p-2"
          />
        </div>
      ))}
    </div>
  </div>
)}
```

**Implementation - Step 2 (AI Matching)**:
```typescript
{step.image === 'ai' && (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <span className="text-slate-900 dark:text-slate-100 font-semibold">Generating outfits...</span>
      <Sparkles className="w-6 h-6 text-amber-600 animate-pulse" />
    </div>
    <div className="space-y-3">
      {aiMatchingItems.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-lg overflow-hidden shadow-sm">
            <Image
              src={item.src}
              alt={item.alt}
              width={48}
              height={48}
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all duration-1000"
              style={{ width: `${80 + i * 5}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```



**Implementation - Step 3 (Final Outfit)**:
```typescript
{step.image === 'outfit' && (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <span className="text-slate-900 dark:text-slate-100 font-semibold">Perfect match!</span>
      <Heart className="w-6 h-6 text-red-500 fill-current" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      {finalOutfitItems.map((item, i) => (
        <div key={i} className="aspect-square bg-white rounded-2xl overflow-hidden shadow-sm">
          <Image
            src={item.src}
            alt={item.alt}
            width={120}
            height={120}
            className="w-full h-full object-contain p-3"
          />
        </div>
      ))}
    </div>
    <div className="text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
        <Sparkles className="w-4 h-4" />
        95% compatibility
      </div>
    </div>
  </div>
)}
```

**Rationale**:
- Progressive story: upload → analyze → complete outfit
- Real items make the process tangible
- Maintains existing animations and interactions
- Shows actual app functionality

### 6. About Page Update

**Component**: `app/about/page.tsx`

**Changes**:
- Add small product images to feature cards
- Visual examples support text descriptions
- Maintain clean, professional layout

**Implementation**:
```typescript
import Image from 'next/image';

<div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
  <div className="w-16 h-16 mb-4 mx-auto">
    <Image
      src="/images/wardrobe/ocbd-blue.png"
      alt="Custom wardrobe example"
      width={64}
      height={64}
      className="w-full h-full object-contain"
    />
  </div>
  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Custom Wardrobe</h3>
  <p className="text-slate-700 dark:text-slate-300">Upload your own clothing photos with automatic background removal</p>
</div>
```



## Performance Optimization

### Image Loading Strategy

**Priority Loading**:
- Hero section images: `priority={true}` for LCP optimization
- Above-the-fold images: Load immediately
- Below-the-fold images: Lazy load by default (Next.js Image default behavior)

**Size Optimization**:
```typescript
// Hero section (largest)
width={200} height={200}

// App demo grid
width={150} height={150}

// Feature highlights
width={128} height={128}

// How It Works steps
width={120} height={120}

// About page cards
width={64} height={64}
```

**Rationale**: Appropriately sized images prevent over-fetching while maintaining quality.

### Bundle Size Impact

**Expected Changes**:
- New file: `lib/data/landing-page-images.ts` (~2KB)
- Image imports: No bundle impact (static assets)
- Component updates: Minimal size increase (<1KB total)

**Total Impact**: <3KB additional bundle size, well within limits.

## Accessibility

### Alt Text Strategy

All images include descriptive alt text following this pattern:
- **Category + Color + Type**: "Navy Oxford button-down shirt"
- **Context when needed**: "Grey tweed sport coat for business casual outfits"
- **Avoid redundancy**: Don't include "image of" or "picture of"

### Keyboard Navigation

No changes to keyboard navigation - images are presentational only, not interactive.

### Screen Reader Support

Images use semantic HTML with proper alt attributes. Decorative floating elements use `aria-hidden="true"`.



## Dark Mode Compatibility

### Background Strategy

All wardrobe images have transparent backgrounds, so they work in both light and dark modes.

**Container backgrounds**:
- Light mode: `bg-white` for clean presentation
- Dark mode: `bg-slate-800` for consistency
- Maintains proper contrast in both modes

**Implementation**:
```typescript
<div className="aspect-square bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm">
  <Image src={item.src} alt={item.alt} {...props} />
</div>
```

## Responsive Design

### Breakpoint Behavior

**Mobile (< 768px)**:
- Hero grid: 2x2 layout maintained
- App demo: Horizontal scroll if needed
- Feature highlights: Single column stack
- How It Works: Full-width cards

**Tablet (768px - 1024px)**:
- Hero grid: 2x2 layout
- App demo: 4-column grid
- Feature highlights: 3-column grid
- How It Works: 2-column layout

**Desktop (> 1024px)**:
- All layouts at full width
- Maximum container width: 1280px (max-w-7xl)

### Image Sizing

Images use `object-contain` to maintain aspect ratios across all breakpoints. Container aspect ratios are fixed with `aspect-square`.

## Testing Strategy

### Visual Regression Testing

**Manual verification checklist**:
1. All images load correctly
2. No stretched or distorted images
3. Proper spacing and alignment
4. Dark mode compatibility
5. Responsive behavior at all breakpoints

### Performance Testing

**Metrics to verify**:
- LCP ≤ 2.5s (hero image should be priority loaded)
- Bundle size increase < 5KB
- No layout shift (CLS ≤ 0.1)
- Image lazy loading working below fold

### Accessibility Testing

**Verification**:
- All images have descriptive alt text
- Screen reader announces images properly
- No keyboard navigation issues
- Proper contrast ratios maintained



## Implementation Sequence

### Phase 1: Setup (Priority: High)
1. Create `lib/data/landing-page-images.ts` with all image configurations
2. Verify all image paths exist in `/public/images/wardrobe/`
3. Define TypeScript interfaces for type safety

### Phase 2: Hero Section (Priority: High)
1. Update `components/homepage/hero-section.tsx`
2. Replace gradient boxes with real images
3. Add Next.js Image components with proper sizing
4. Test priority loading and LCP impact

### Phase 3: App Demo (Priority: High)
1. Update `components/homepage/app-demo.tsx`
2. Replace gradient overlays with real wardrobe items
3. Update item labels to match actual products
4. Verify 4-column grid layout

### Phase 4: Feature Highlights (Priority: Medium)
1. Update `components/homepage/feature-highlights.tsx`
2. Add product images below icons
3. Implement hover opacity transitions
4. Test responsive behavior

### Phase 5: How It Works Page (Priority: Medium)
1. Update `app/how-it-works/page.tsx`
2. Replace all three step visualizations
3. Implement progressive story with real items
4. Test animations and transitions

### Phase 6: About Page (Priority: Low)
1. Update `app/about/page.tsx`
2. Add small product images to feature cards
3. Verify layout consistency
4. Test dark mode compatibility

### Phase 7: Verification (Priority: High)
1. Run performance tests (LCP, bundle size)
2. Verify accessibility (alt text, screen readers)
3. Test responsive design at all breakpoints
4. Validate dark mode appearance
5. Check for any remaining placeholders

## Edge Cases and Considerations

### Missing Images
If any configured image path doesn't exist:
- Next.js will show a broken image icon
- Check console for 404 errors
- Verify path matches exactly (case-sensitive)

### Image Aspect Ratios
All wardrobe images have transparent backgrounds and varying aspect ratios:
- Use `object-contain` to prevent distortion
- Add padding inside containers for breathing room
- White/slate backgrounds provide clean presentation

### Performance Degradation
If LCP exceeds 2.5s:
- Verify `priority={true}` on hero images
- Check image file sizes (should be optimized)
- Consider reducing initial image dimensions

### Dark Mode Issues
If images don't look good in dark mode:
- Adjust container background colors
- Verify transparent backgrounds on images
- Test contrast ratios



## Correctness Properties

### Property 1: Image Path Validity
**Statement**: All configured image paths must resolve to existing files in the public directory.

**Validation**: 
```typescript
// Test that all image paths exist
import { existsSync } from 'fs';
import { join } from 'path';

const allImages = [
  ...Object.values(heroOutfit).filter(Boolean).map(i => i.src),
  ...Object.values(appDemoOutfit).filter(Boolean).map(i => i.src),
  ...uploadStepItems.map(i => i.src),
  ...aiMatchingItems.map(i => i.src),
  ...finalOutfitItems.map(i => i.src),
  ...Object.values(featureImages).map(i => i.src)
];

allImages.forEach(src => {
  const path = join(process.cwd(), 'public', src);
  expect(existsSync(path)).toBe(true);
});
```

**Validates**: Requirements 1.1, 1.2

### Property 2: Alt Text Completeness
**Statement**: Every image must have non-empty, descriptive alt text.

**Validation**:
```typescript
// Test that all images have descriptive alt text
const allImageObjects = [
  ...Object.values(heroOutfit).filter(Boolean),
  ...Object.values(appDemoOutfit).filter(Boolean),
  ...uploadStepItems,
  ...aiMatchingItems,
  ...finalOutfitItems,
  ...Object.values(featureImages)
];

allImageObjects.forEach(img => {
  expect(img.alt).toBeTruthy();
  expect(img.alt.length).toBeGreaterThan(5);
  expect(img.alt).not.toMatch(/^image of/i);
});
```

**Validates**: Requirements 4.1, 4.2

### Property 3: Image Dimension Consistency
**Statement**: Images within the same section must use consistent dimensions.

**Validation**:
```typescript
// Test that hero section images use consistent sizing
const heroImages = screen.getAllByAltText(/shirt|pants|shoes|watch/i);
heroImages.forEach(img => {
  expect(img).toHaveAttribute('width', '200');
  expect(img).toHaveAttribute('height', '200');
});

// Test that app demo images use consistent sizing
const demoImages = screen.getAllByAltText(/blazer|oxford|chino|loafer/i);
demoImages.forEach(img => {
  expect(img).toHaveAttribute('width', '150');
  expect(img).toHaveAttribute('height', '150');
});
```

**Validates**: Requirements 1.2, 2.1

