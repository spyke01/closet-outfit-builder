# Landing Page Real Images - Requirements

## Feature Overview

Update the homepage and all sales/landing pages to display real wardrobe photography instead of empty placeholder visuals. This will make the site look complete and professional, clearly showing what the product offers while maintaining consistent formatting across all devices.

## User Stories

### 1. As a potential user visiting the homepage
**I want to** see real clothing items and outfit examples  
**So that** I can immediately understand what the app does and visualize how it would work with my wardrobe

**Acceptance Criteria:**
- Hero section displays real wardrobe items instead of colored placeholder boxes
- All product sections show actual clothing photography
- Images are properly sized and cropped for their containers
- No stretched, blank, or generic placeholder images remain

### 2. As a mobile user browsing the site
**I want to** see properly formatted images on my device  
**So that** I can have the same quality experience as desktop users

**Acceptance Criteria:**
- Images are responsive and display correctly on mobile devices
- Touch targets remain accessible (minimum 44px)
- Images load efficiently without impacting performance
- Layout remains consistent across breakpoints

### 3. As a visitor exploring the "How It Works" page
**I want to** see lifestyle or context shots of outfits  
**So that** I can better understand how the app works in real-world scenarios

**Acceptance Criteria:**
- Step-by-step sections show real clothing items
- Images demonstrate the actual app functionality
- Visual flow tells a clear story from upload to outfit selection
- Images match the brand's aesthetic and quality standards

### 4. As a potential customer evaluating the product
**I want to** see consistent, high-quality visuals throughout the site  
**So that** I feel confident in the product's quality and professionalism

**Acceptance Criteria:**
- All images maintain consistent style and quality
- Brand aesthetic is cohesive across all pages
- Images reflect the actual products/styles featured
- Professional presentation increases conversion potential

## Technical Requirements

### Image Assets
- Use existing wardrobe images from `/public/images/wardrobe/`
- Images should be properly optimized for web (Next.js Image component)
- Maintain aspect ratios appropriate for each container
- Support both light and dark mode where applicable

### Pages to Update
1. **Homepage** (`app/page.tsx` and components):
   - Hero section mockup
   - Feature highlights
   - App demo section
   - How it works section
   - Testimonials (if applicable)
   - Final CTA section

2. **How It Works Page** (`app/how-it-works/page.tsx`):
   - Step 1: Upload visualization
   - Step 2: AI matching visualization
   - Step 3: Outfit selection visualization

3. **About Page** (`app/about/page.tsx`):
   - Feature cards with visual examples
   - Product showcase sections

### Performance Considerations
- Use Next.js Image component for automatic optimization
- Implement lazy loading for below-the-fold images
- Maintain bundle size limits (<500KB total)
- Ensure LCP (Largest Contentful Paint) ≤ 2.5s

### Accessibility Requirements
- All images must have descriptive alt text
- Maintain proper contrast ratios
- Ensure images don't interfere with keyboard navigation
- Support screen reader descriptions

## Design Guidelines

### Image Selection Criteria
- **Hero Section**: Show complete outfit combinations (jacket, shirt, pants, shoes)
- **Feature Highlights**: Use individual items that represent each feature
- **App Demo**: Display realistic outfit grids with actual wardrobe items
- **How It Works**: Use progression from individual items to complete outfits

### Visual Consistency
- Maintain clean, professional aesthetic
- Use items with removed backgrounds (already available)
- Ensure color harmony across selected items
- Match formality levels within each section

### Brand Alignment
- Images should reflect smart-casual to business-casual style
- Focus on versatile, classic pieces
- Demonstrate the app's ability to create cohesive outfits
- Show variety in colors, styles, and formality levels

## Success Metrics

### Completion Criteria
- [ ] All placeholder images replaced with real wardrobe photos
- [ ] Images properly sized and cropped for all containers
- [ ] Responsive design maintained across all breakpoints
- [ ] No empty or generic placeholders remain
- [ ] Performance metrics maintained (bundle size, LCP)
- [ ] Accessibility standards met (alt text, contrast)

### Quality Checklist
- [ ] Hero banner displays complete outfit
- [ ] Product grid shows variety of items
- [ ] Card images are properly formatted
- [ ] Mobile layout displays correctly
- [ ] Desktop layout displays correctly
- [ ] Dark mode compatibility verified
- [ ] All images have descriptive alt text

## Out of Scope

- Creating new photography or product shots
- Redesigning page layouts or structure
- Adding new sections or features
- Modifying existing functionality
- Creating image editing or processing tools

## Notes

### Available Assets
The project has extensive wardrobe photography available in `/public/images/wardrobe/` including:
- Shirts (OCBD, polo, t-shirts, henleys)
- Outerwear (jackets, coats, cardigans, quarter-zips)
- Pants (chinos, jeans, trousers, shorts)
- Shoes (loafers, boots, sneakers, monk straps)
- Accessories (belts, watches)

### Missing Photos Needed
Document any gaps in available imagery that would enhance the landing pages:
- Lifestyle shots showing outfits being worn (if desired for conversion)
- Hero banner background imagery (if needed)
- Specific product combinations for feature highlights

### Implementation Priority
1. Homepage hero section (highest visibility)
2. Homepage app demo section
3. How It Works page visualizations
4. About page feature cards
5. Additional landing page sections
