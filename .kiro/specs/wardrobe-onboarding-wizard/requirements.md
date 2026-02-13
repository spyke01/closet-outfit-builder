# Wardrobe Onboarding Wizard - Requirements

## 1. Overview

### 1.1 Feature Summary
A multi-step onboarding wizard that guides new users through setting up their initial wardrobe by selecting categories, subcategories, colors, and quantities. The system generates wardrobe items using existing images from the wardrobe data, replacing the current automatic seeding process with a user-driven approach.

### 1.2 User Problem
New users currently receive a generic seeded wardrobe that may not match their actual clothing or style preferences. This creates friction as users must delete irrelevant items and manually add their own, leading to a poor first-time experience.

### 1.3 Success Criteria
- Users complete onboarding and have a personalized wardrobe that reflects their actual clothing
- Onboarding completion rate > 80%
- Users report higher satisfaction with initial wardrobe setup
- Reduced time to first meaningful outfit generation
- Seamless integration with existing app theming and navigation

## 2. User Stories

### 2.1 First-Time User Onboarding
**As a** new user who just signed up  
**I want to** be guided through setting up my wardrobe based on what I actually own  
**So that** I can start using the app with relevant clothing items immediately

**Acceptance Criteria:**
- User is directed to `/onboarding` route after first login
- Wizard presents clear, sequential steps
- User can navigate back and forth between steps
- Progress is visually indicated throughout the flow
- User can complete the entire flow in under 5 minutes
- Works for both men's and women's clothing without gender assumptions

### 2.2 Style Baseline Selection
**As a** new user  
**I want to** indicate my primary clothing use (work/casual/mixed) and climate  
**So that** the app can suggest relevant categories and items

**Acceptance Criteria:**
- User selects one primary use option: Work, Casual, or Mixed
- User selects one climate option: Hot, Cold, or Mixed
- Both selections are required to proceed
- Visual feedback shows selected options clearly
- Icons and descriptions help users understand each option
- No gender-specific language or assumptions

### 2.3 Category Selection
**As a** new user  
**I want to** select which clothing categories I own  
**So that** the wizard only asks about relevant items

**Acceptance Criteria:**
- Essential categories (Tops, Bottoms, Shoes) are pre-selected
- User can select/deselect optional categories (Layers, Dresses, Accessories)
- Each category shows icon, name, and description
- Visual distinction between essential and optional categories
- At least one category must be selected to proceed
- Categories are gender-neutral (e.g., Dresses available to all users)
- Descriptions are inclusive (e.g., "Tops: T-shirts, blouses, polos, dress shirts")

### 2.4 Subcategory Selection
**As a** new user  
**I want to** choose specific item types within each category  
**So that** I only add items I actually own

**Acceptance Criteria:**
- User sees subcategories grouped by selected categories
- User can select multiple subcategories per category
- Examples for Tops: T-Shirt, Polo, OCBD, Dress Shirt, Blouse, Tank Top, Sweater
- Examples for Bottoms: Jeans, Chinos, Trousers, Shorts, Skirts, Leggings
- Examples for Dresses: Mini Dress, Midi Dress, Maxi Dress, Wrap Dress
- At least one subcategory must be selected to proceed
- Clear visual grouping by parent category
- Subcategories are gender-neutral and inclusive

### 2.5 Color and Quantity Selection
**As a** new user  
**I want to** specify colors and quantities for each subcategory  
**So that** the generated wardrobe matches what I own

**Acceptance Criteria:**
- User sees all selected subcategories
- For each subcategory, user can select multiple colors
- For each subcategory, user selects quantity: None, 1, 2-3, 4-6, 7+
- Colors use existing COLOR_OPTIONS from the app
- Visual color swatches help with selection
- At least one subcategory must have colors and quantity > None

### 2.6 Review and Confirmation
**As a** new user  
**I want to** review the items that will be created  
**So that** I can verify my selections before finalizing

**Acceptance Criteria:**
- User sees preview of all items to be generated
- Items show category, subcategory, color, and image (if available)
- User can see total item count
- Optional item cap (default 50) prevents overwhelming wardrobes
- User can toggle item cap on/off
- User can go back to modify selections
- "Create Wardrobe" button finalizes the process

### 2.7 Success Confirmation
**As a** new user  
**I want to** see confirmation that my wardrobe was created  
**So that** I know the process completed successfully

**Acceptance Criteria:**
- Success message displays after wardrobe creation
- Shows total number of items created
- Provides clear next steps (e.g., "View My Wardrobe", "Generate Outfits")
- User can navigate to main app features

### 2.8 Testing and Development
**As a** developer or tester  
**I want to** access the onboarding flow at any time  
**So that** I can test and refine the experience

**Acceptance Criteria:**
- Onboarding accessible at `/onboarding` route
- Works independently of user's onboarding status
- Uses existing app theming (light/dark mode)
- Integrates with existing navigation structure
- No authentication required for initial testing phase

## 3. Functional Requirements

### 3.1 Wizard Flow
- **FR-3.1.1**: Wizard consists of 6 sequential steps
- **FR-3.1.2**: Step 1: Style Baseline (Primary Use + Climate)
- **FR-3.1.3**: Step 2: Category Ownership Selection
- **FR-3.1.4**: Step 3: Subcategory Selection
- **FR-3.1.5**: Step 4: Color and Quantity Selection
- **FR-3.1.6**: Step 5: Review and Confirmation
- **FR-3.1.7**: Step 6: Success Message
- **FR-3.1.8**: User can navigate back to previous steps (except from success)
- **FR-3.1.9**: User cannot proceed without meeting step requirements

### 3.2 Category Mapping and Expansion
- **FR-3.2.1**: Expand category system to support both men's and women's clothing
- **FR-3.2.2**: Map mockup categories to app categories:
  - Tops → Shirt, Polo, OCBD, Dress Shirt, Sweater, Blouse, Tank Top, etc.
  - Bottoms → Pants, Jeans, Chinos, Shorts, Skirts, Leggings
  - Shoes → Shoes (all types including heels, flats, boots)
  - Layers → Jacket, Overshirt, Coat, Blazer, Cardigan
  - Dresses → Dresses (all types - not just a subcategory)
  - Accessories → Belt, Watch, Tie, Scarf, Jewelry
- **FR-3.2.3**: Support gender-neutral category structure (items not gender-specific)
- **FR-3.2.4**: Use existing category structure from database
- **FR-3.2.5**: Create new categories if user selections require them
- **FR-3.2.6**: Maintain category display_order and is_anchor_item flags

### 3.3 Color Integration
- **FR-3.3.1**: Use existing COLOR_OPTIONS from lib/data/color-options.ts
- **FR-3.3.2**: Display color swatches with hex values
- **FR-3.3.3**: Support "Unspecified" color option
- **FR-3.3.4**: Validate colors against existing color list
- **FR-3.3.5**: Normalize colors (lowercase, trimmed) before storage

### 3.4 Item Generation
- **FR-3.4.1**: Generate wardrobe items based on user selections
- **FR-3.4.2**: Use existing images from wardrobe data when available
- **FR-3.4.3**: Match items by category, subcategory, and color
- **FR-3.4.4**: Create placeholder items when no matching image exists
- **FR-3.4.5**: Apply quantity multipliers: None=0, 1=1, 2-3=3, 4-6=5, 7+=7
- **FR-3.4.6**: Respect item cap (default 50) when enabled
- **FR-3.4.7**: Set appropriate formality_score based on item type
- **FR-3.4.8**: Set season tags based on climate selection
- **FR-3.4.9**: Mark items as active=true and source='onboarding'

### 3.5 Data Persistence
- **FR-3.5.1**: Create categories in database if they don't exist
- **FR-3.5.2**: Create wardrobe_items with proper user_id and category_id
- **FR-3.5.3**: Use Supabase client for all database operations
- **FR-3.5.4**: Handle errors gracefully with user feedback
- **FR-3.5.5**: Use optimistic updates where appropriate
- **FR-3.5.6**: Invalidate relevant query caches after creation

### 3.6 Navigation and Routing
- **FR-3.6.1**: Onboarding accessible at `/onboarding` route
- **FR-3.6.2**: Use existing app layout and navigation
- **FR-3.6.3**: Maintain TopBar and theme toggle
- **FR-3.6.4**: After completion, redirect to /wardrobe or /today
- **FR-3.6.5**: Support browser back/forward navigation within wizard

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR-4.1.1**: Wizard loads in < 2 seconds
- **NFR-4.1.2**: Step transitions are instant (< 100ms)
- **NFR-4.1.3**: Item generation completes in < 5 seconds for 50 items
- **NFR-4.1.4**: Image loading uses lazy loading and optimization
- **NFR-4.1.5**: No blocking operations during user interaction

### 4.2 Usability
- **NFR-4.2.1**: Mobile-first responsive design
- **NFR-4.2.2**: Touch-friendly targets (min 44px)
- **NFR-4.2.3**: Clear visual hierarchy and typography
- **NFR-4.2.4**: Consistent with existing app design language
- **NFR-4.2.5**: Keyboard navigation support
- **NFR-4.2.6**: Screen reader compatible

### 4.3 Accessibility
- **NFR-4.3.1**: WCAG 2.1 AA compliance
- **NFR-4.3.2**: Semantic HTML elements
- **NFR-4.3.3**: ARIA labels for interactive elements
- **NFR-4.3.4**: Focus indicators visible
- **NFR-4.3.5**: Color contrast ratios meet standards
- **NFR-4.3.6**: Reduced motion support

### 4.4 Theming
- **NFR-4.4.1**: Support light and dark modes
- **NFR-4.4.2**: Use existing Tailwind theme variables
- **NFR-4.4.3**: Consistent with app's color palette
- **NFR-4.4.4**: Smooth theme transitions
- **NFR-4.4.5**: Respect user's theme preference

### 4.5 Code Quality
- **NFR-4.5.1**: TypeScript strict mode
- **NFR-4.5.2**: Zod validation for all data
- **NFR-4.5.3**: Reusable component architecture
- **NFR-4.5.4**: Comprehensive error handling
- **NFR-4.5.5**: Unit tests for business logic
- **NFR-4.5.6**: Integration tests for wizard flow

## 5. Technical Constraints

### 5.1 Technology Stack
- **TC-5.1.1**: Next.js 15 App Router
- **TC-5.1.2**: React 19 with TypeScript
- **TC-5.1.3**: Tailwind CSS 4 for styling
- **TC-5.1.4**: Supabase for database
- **TC-5.1.5**: TanStack Query for state management
- **TC-5.1.6**: Lucide React for icons

### 5.2 Integration Points
- **TC-5.2.1**: Use existing useCategories hook
- **TC-5.2.2**: Use existing useCreateWardrobeItem hook
- **TC-5.2.3**: Use existing COLOR_OPTIONS data
- **TC-5.2.4**: Use existing Category and WardrobeItem types
- **TC-5.2.5**: Use existing Supabase client configuration

### 5.3 Data Sources
- **TC-5.3.1**: Existing wardrobe images in public/images/wardrobe/
- **TC-5.3.2**: Existing color definitions in lib/data/color-options.ts
- **TC-5.3.3**: Category structure from database schema
- **TC-5.3.4**: Formality scores from existing scoring logic

## 6. Future Enhancements

### 6.1 Phase 2 Features
- Custom image upload during onboarding
- AI-powered item suggestions based on style baseline
- Import from existing wardrobe apps
- Social sharing of wardrobe setup
- Onboarding progress persistence (save and resume)
- Gender/style preference selection for personalized suggestions

### 6.2 Phase 3 Features
- Default images for every type/color combination (including women's items)
- Brand-specific item suggestions
- Size and fit preferences
- Budget-based recommendations
- Seasonal wardrobe planning
- Body type and fit recommendations

### 6.3 Category System Expansion
- Expand subcategories for women's clothing:
  - Tops: Blouse, Camisole, Tank Top, Crop Top, Tunic
  - Bottoms: Skirts (Mini, Midi, Maxi, Pencil, A-Line), Leggings, Culottes
  - Dresses: Cocktail, Evening, Casual, Wrap, Shift, Sheath
  - Shoes: Heels, Flats, Sandals, Wedges, Ankle Boots
  - Accessories: Scarves, Jewelry, Handbags
- Support for specialized categories:
  - Activewear
  - Swimwear
  - Formal wear
  - Seasonal items (winter coats, summer hats)

## 7. Dependencies

### 7.1 Internal Dependencies
- Existing category management system
- Existing wardrobe item creation hooks
- Existing color options and validation
- Existing image storage structure
- Existing authentication system

### 7.2 External Dependencies
- Supabase database and authentication
- Next.js routing and server components
- TanStack Query for data fetching
- Tailwind CSS for styling
- Lucide React for icons

## 8. Risks and Mitigations

### 8.1 Risk: Image Availability
**Risk**: Not all category/color combinations have existing images  
**Mitigation**: Use placeholder images and clearly indicate which items need photos

### 8.2 Risk: Category Mapping Complexity
**Risk**: Mockup categories don't perfectly align with existing structure  
**Mitigation**: Create flexible mapping system that can evolve over time

### 8.3 Risk: Performance with Large Selections
**Risk**: Generating 100+ items could be slow  
**Mitigation**: Implement item cap, batch creation, and progress indicators

### 8.4 Risk: User Abandonment
**Risk**: Long wizard flow may cause users to abandon  
**Mitigation**: Allow skipping optional steps, save progress, show clear progress indicators

### 8.5 Risk: Mobile Experience
**Risk**: Complex UI may not work well on small screens  
**Mitigation**: Mobile-first design, simplified mobile layouts, touch-optimized controls

## 9. Success Metrics

### 9.1 Completion Metrics
- Onboarding completion rate
- Average time to complete
- Step abandonment rates
- Items created per user

### 9.2 Quality Metrics
- User satisfaction scores
- Items deleted after onboarding
- Items added after onboarding
- Time to first outfit generation

### 9.3 Technical Metrics
- Page load times
- Error rates
- API response times
- Database query performance

## 10. Open Questions

1. Should we allow users to skip onboarding entirely?
2. How do we handle users who want to restart onboarding?
3. Should we show estimated time for each step?
4. Do we need to persist partial progress if user leaves?
5. Should we have a "quick setup" option with defaults?
6. How do we handle users with very large wardrobes (100+ items)?
7. Should we integrate with the existing seed-user function or replace it?
8. Do we need analytics tracking for each step?
9. **Should we add a gender/style preference step to personalize category suggestions?**
10. **What subcategories should we prioritize for women's clothing in Phase 1?**
11. **How do we handle items that work for multiple genders (e.g., jeans, t-shirts)?**
12. **Should Dresses be a top-level category or nested under another category?**
13. **Do we need separate outfit generation logic for dresses vs. separates?**

## 11. Category System Requirements

### 11.1 Gender-Neutral Design
- **CR-11.1.1**: All categories and subcategories are available to all users
- **CR-11.1.2**: No gender-specific filtering or restrictions
- **CR-11.1.3**: Inclusive language in all descriptions and labels
- **CR-11.1.4**: Icons and imagery are gender-neutral where possible

### 11.2 Women's Clothing Support
- **CR-11.2.1**: Expand Tops to include: Blouse, Tank Top, Camisole
- **CR-11.2.2**: Expand Bottoms to include: Skirts (multiple types), Leggings
- **CR-11.2.3**: Dresses as standalone category with subcategories
- **CR-11.2.4**: Expand Shoes to include: Heels, Flats, Sandals, Wedges
- **CR-11.2.5**: Expand Accessories to include: Scarves, Jewelry

### 11.3 Subcategory Definitions (Phase 1)
**Tops:**
- T-Shirt, Polo, OCBD, Dress Shirt, Blouse, Tank Top, Sweater, Cardigan, Hoodie, Quarter Zip

**Bottoms:**
- Jeans, Chinos, Trousers, Shorts, Skirt, Leggings

**Shoes:**
- Sneakers, Loafers, Boots, Dress Shoes, Heels, Flats, Sandals

**Layers:**
- Blazer, Sportcoat, Jacket, Coat, Cardigan

**Dresses:**
- Mini Dress, Midi Dress, Maxi Dress, Cocktail Dress, Casual Dress

**Accessories:**
- Belt, Tie, Watch, Scarf

### 11.4 Database Schema Considerations
- **CR-11.4.1**: Category names remain gender-neutral (e.g., "Shirt", "Blouse" not "Men's Shirt")
- **CR-11.4.2**: No gender field required on categories or items
- **CR-11.4.3**: Subcategory names are descriptive and self-explanatory
- **CR-11.4.4**: Existing outfit generation logic may need updates for dresses
- **CR-11.4.5**: Formality scores apply consistently across all item types
