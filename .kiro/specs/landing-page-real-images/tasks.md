# Implementation Plan: Landing Page Real Images

## Overview

This streamlined implementation plan replaces placeholder images with real wardrobe photography across all landing pages. The plan consolidates related work into 6 focused tasks covering data setup, component updates, and validation.

## Tasks

- [x] 1. Create image configuration and update Hero + App Demo sections
  - Create `lib/data/landing-page-images.ts` with TypeScript interfaces (`WardrobeImage`, `OutfitCombo`)
  - Define `heroOutfit` (grey tweed sport coat, white OCBD, navy chinos, brown loafers, Omega watch)
  - Define `appDemoOutfit` (brown tweed blazer, blue OCBD, khaki chinos, tan loafers)
  - Update `components/homepage/hero-section.tsx`: Replace 2x2 gradient grid with Image components (width={200} height={200}, priority={true} on first image)
  - Update `components/homepage/app-demo.tsx`: Replace 4 gradient boxes with Image components (width={150} height={150}, loading="lazy")
  - Use `object-contain p-4` for hero, `object-contain p-3` for demo
  - Ensure all images have descriptive alt text from configuration
  - _Requirements: 1.1, 1.3, 1.4, 4.1_

- [x] 2. Update Feature Highlights and About page
  - Add `featureImages` object to `landing-page-images.ts` (smartGenerator, weatherAware, capsuleWardrobe)
  - Update `components/homepage/feature-highlights.tsx`: Add Image components below icons (width={128} height={128}, opacity-80 group-hover:opacity-100)
  - Update `app/about/page.tsx`: Add small product images to feature cards (width={64} height={64})
  - Use representative items: Personal & Secure (blue OCBD), Custom Wardrobe (upload item), Smart Recommendations (outfit item), Weather Integration (mac coat)
  - Preserve existing layouts, gradients, and text contrast ratios (WCAG AA)
  - Test dark mode compatibility (bg-white dark:bg-slate-800)
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 4.1, 4.2_

- [ ] 3. Update How It Works sections (Homepage and dedicated page)
  - Add to `landing-page-images.ts`: `uploadStepItems` (navy OCBD, grey chinos, white sneakers), `aiMatchingItems` (navy polo, olive chinos, tan loafers), `finalOutfitItems` (grey cardigan, white tee, medium jeans, Killshot sneakers)
  - Update `components/homepage/how-it-works.tsx`: Replace all 3 step visualizations with real images
  - Update `app/how-it-works/page.tsx`: Replace all 3 step visualizations with real images
  - Step 1: 3-column grid (width={120} height={120}) with upload icon
  - Step 2: Small images (48x48) with progress bars (80%, 85%, 90%) and animated Sparkles
  - Step 3: 2x2 outfit grid (width={120} height={120}) with "95% compatibility" badge and Heart icon
  - Maintain existing animations, transitions, and responsive layouts
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Implement performance optimizations and lazy loading
  - Configure Next.js Image optimization: quality={85}, explicit width/height on all images
  - Configure responsive image sizes in `next.config.js` if needed
  - Verify hero images use priority={true}, all below-the-fold images use loading="lazy"
  - Add dark mode styling: bg-white dark:bg-slate-800 containers with subtle shadows
  - Test progressive loading on slow connections (3G simulation)
  - Verify performance metrics: LCP ≤ 2.5s, CLS ≤ 0.1, bundle size < 500KB
  - _Requirements: 2.1, 3.4, 4.1_

- [x] 5. Accessibility audit and enhancements
  - Audit all image alt text: ensure descriptive (item type + color + style), minimum 10 characters
  - Add aria-label to interactive image containers where needed
  - Verify keyboard navigation unaffected by image additions
  - Test screen reader compatibility (NVDA/JAWS)
  - Run axe accessibility audit on all updated pages
  - Verify color contrast ratios maintained (WCAG AA) in both light and dark modes
  - _Requirements: 4.1_

- [ ] 6. Testing and validation
  - Write unit tests for Hero Section (4 images render, alt text present, priority loading, responsive layout)
  - Write unit tests for App Demo (4 images render, lazy loading, compatibility scores display)
  - Write unit tests for Feature Highlights (images + icons render, hover transitions, text readability)
  - Write unit tests for How It Works sections (all 3 steps render correctly, animations work, responsive)
  - Write unit tests for About page (feature cards render with images, layout consistency, dark mode)
  - Write integration tests for complete pages (homepage, How It Works page, About page)
  - Manual cross-browser testing (Chrome, Firefox, Safari, Edge, iOS Safari, Android Chrome)
  - Verify all images load correctly, no broken paths, responsive breakpoints work
  - _Requirements: 1.1, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1_

## Notes

- All tasks are required for complete implementation
- Each task builds on previous work - follow sequential order
- Test at each stage before moving to next task
- Focus on production code - no demo components or temporary files
- Use direct imports from lucide-react for optimal bundle size
- Leverage Next.js Image component for automatic optimization

## Implementation Priority

1. **Task 1**: Data layer + highest visibility sections (Hero, App Demo)
2. **Task 2**: Supporting content (Feature Highlights, About page)
3. **Task 3**: Educational content (How It Works sections)
4. **Task 4**: Performance optimization and loading strategy
5. **Task 5**: Accessibility compliance and audit
6. **Task 6**: Comprehensive testing and validation
