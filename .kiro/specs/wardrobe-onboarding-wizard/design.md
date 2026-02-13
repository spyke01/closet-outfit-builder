# Wardrobe Onboarding Wizard - Design Document

## Overview

This feature implements a multi-step wizard that guides new users through creating their initial wardrobe based on what they actually own. The wizard replaces the current automatic seeding process with a user-driven approach that generates wardrobe items using existing images and data structures.

The design focuses on:
1. **User-Friendly Flow**: 6-step wizard with clear progress indication
2. **Gender-Neutral Design**: Supports all clothing types without assumptions
3. **Existing Integration**: Uses current category system, color options, and hooks
4. **Image Reuse**: Leverages existing wardrobe images when available
5. **Testable Route**: Accessible at `/onboarding` for development and testing

## Architecture

### High-Level Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     Route Layer                              │
│  app/onboarding/page.tsx                                    │
│  - Server component wrapper                                  │
│  - Renders OnboardingWizard                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Wizard Orchestrator                         │
│  components/onboarding/onboarding-wizard.tsx                │
│  - Manages wizard state                                      │
│  - Handles step navigation                                   │
│  - Coordinates data flow                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Step Components                           │
├─────────────────────────────────────────────────────────────┤
│  StepStyleBaseline      - Primary use & climate selection   │
│  StepCategoryOwnership  - Category selection                │
│  StepSubcategorySelection - Subcategory selection           │
│  StepColorsQuantity     - Color & quantity selection        │
│  StepReview             - Preview & confirmation            │
│  StepSuccess            - Completion message                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                 │
├─────────────────────────────────────────────────────────────┤
│  lib/data/onboarding-categories.ts                          │
│  - Category definitions with subcategories                   │
│  - Gender-neutral structure                                  │
│                                                              │
│  lib/data/color-options.ts (existing)                       │
│  - Predefined color list                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Business Logic Layer                        │
├─────────────────────────────────────────────────────────────┤
│  lib/services/onboarding-generator.ts                       │
│  - Generate wardrobe items from selections                   │
│  - Match with existing images                                │
│  - Apply formality scores                                    │
│  - Set season tags                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer                              │
├─────────────────────────────────────────────────────────────┤
│  Supabase Tables:                                           │
│  - categories (create if needed)                            │
│  - wardrobe_items (bulk insert)                             │
│                                                              │
│  Hooks (existing):                                          │
│  - useCreateCategory                                        │
│  - useCreateWardrobeItem                                    │
│  - useCategories                                            │
└─────────────────────────────────────────────────────────────┘
```

### Wizard State Flow

```
Step 1: Style Baseline
  ↓ (primaryUse, climate)
Step 2: Category Ownership
  ↓ (selectedCategories[])
Step 3: Subcategory Selection
  ↓ (selectedSubcategories{})
Step 4: Colors & Quantity
  ↓ (colorQuantitySelections{})
Step 5: Review
  ↓ (generatedItems[], itemCap)
Step 6: Success
  → Redirect to /wardrobe or /today
```

## Components and Interfaces

### 1. OnboardingWizard (Main Orchestrator)

**Location:** `components/onboarding/onboarding-wizard.tsx`

**Responsibilities:**
- Manage wizard state
- Handle step navigation
- Validate step completion
- Generate items before review step
- Persist items to database

**State Interface:**
```typescript
interface WizardState {
  step: number;
  styleBaseline: StyleBaseline;
  selectedCategories: CategoryKey[];
  selectedSubcategories: Record<CategoryKey, string[]>;
  colorQuantitySelections: Record<string, SubcategoryColorSelection>;
  generatedItems: GeneratedWardrobeItem[];
  itemCapEnabled: boolean;
  itemCap: number;
}
```

**Props:**
```typescript
interface OnboardingWizardProps {
  onComplete?: () => void; // Optional callback after completion
}
```

**Key Methods:**
- `canProceed()`: Validates current step requirements
- `goNext()`: Advances to next step, generates items before review
- `goBack()`: Returns to previous step
- `handleComplete()`: Persists items and redirects

### 2. StepStyleBaseline

**Location:** `components/onboarding/step-style-baseline.tsx`

**Purpose:** Collect user's primary clothing use and climate preferences

**Props:**
```typescript
interface StepStyleBaselineProps {
  value: StyleBaseline;
  onChange: (value: StyleBaseline) => void;
}

interface StyleBaseline {
  primaryUse: 'Work' | 'Casual' | 'Mixed' | null;
  climate: 'Hot' | 'Cold' | 'Mixed' | null;
}
```

**UI Elements:**
- 3 primary use options (Work, Casual, Mixed) with icons
- 3 climate options (Hot, Cold, Mixed) with icons
- Visual selection state
- Descriptions for each option

### 3. StepCategoryOwnership

**Location:** `components/onboarding/step-category-ownership.tsx`

**Purpose:** Let users select which clothing categories they own

**Props:**
```typescript
interface StepCategoryOwnershipProps {
  selectedCategories: CategoryKey[];
  onChange: (categories: CategoryKey[]) => void;
}

type CategoryKey = 'Tops' | 'Bottoms' | 'Shoes' | 'Layers' | 'Dresses' | 'Accessories';
```

**UI Elements:**
- Grid of category cards
- Essential categories pre-selected (Tops, Bottoms, Shoes)
- Optional categories (Layers, Dresses, Accessories)
- Icons and descriptions for each category
- Visual distinction between essential and optional

### 4. StepSubcategorySelection

**Location:** `components/onboarding/step-subcategory-selection.tsx`

**Purpose:** Let users choose specific item types within each category

**Props:**
```typescript
interface StepSubcategorySelectionProps {
  selectedCategories: CategoryKey[];
  selectedSubcategories: Record<CategoryKey, string[]>;
  onChange: (subcategories: Record<CategoryKey, string[]>) => void;
}
```

**UI Elements:**
- Grouped by parent category
- Checkbox grid for subcategories
- Examples: T-Shirt, Blouse, Polo, OCBD, Dress Shirt, etc.
- Collapsible sections per category
- Select all/none per category

### 5. StepColorsQuantity

**Location:** `components/onboarding/step-colors-quantity.tsx`

**Purpose:** Collect color and quantity information for each subcategory

**Props:**
```typescript
interface StepColorsQuantityProps {
  selectedCategories: CategoryKey[];
  selectedSubcategories: Record<CategoryKey, string[]>;
  colorQuantitySelections: Record<string, SubcategoryColorSelection>;
  onChange: (selections: Record<string, SubcategoryColorSelection>) => void;
}

interface SubcategoryColorSelection {
  subcategory: string;
  colors: string[]; // Color values from COLOR_OPTIONS
  quantity: QuantityLabel;
}

type QuantityLabel = 'None' | '1' | '2-3' | '4-6' | '7+';
```

**UI Elements:**
- List of selected subcategories
- Multi-select color picker with swatches
- Quantity dropdown per subcategory
- Visual feedback for completed selections

### 6. StepReview

**Location:** `components/onboarding/step-review.tsx`

**Purpose:** Preview generated items before creation

**Props:**
```typescript
interface StepReviewProps {
  items: GeneratedWardrobeItem[];
  onUpdateItems: (items: GeneratedWardrobeItem[]) => void;
  itemCapEnabled: boolean;
  onToggleItemCap: (enabled: boolean) => void;
}
```

**UI Elements:**
- Grid of item cards with images
- Item count display
- Item cap toggle (default 50)
- Ability to remove individual items
- Summary statistics

### 7. StepSuccess

**Location:** `components/onboarding/step-success.tsx`

**Purpose:** Confirm successful wardrobe creation

**Props:**
```typescript
interface StepSuccessProps {
  totalItems: number;
  onViewWardrobe?: () => void;
  onGenerateOutfits?: () => void;
}
```

**UI Elements:**
- Success message
- Item count
- Action buttons (View Wardrobe, Generate Outfits)
- Celebration animation/icon

### 8. WizardStepper

**Location:** `components/onboarding/wizard-stepper.tsx`

**Purpose:** Visual progress indicator

**Props:**
```typescript
interface WizardStepperProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}
```

**UI Elements:**
- Step indicators (circles/numbers)
- Progress line
- Step labels (optional)
- Current step highlight

## Data Models

### Category Definitions

**Location:** `lib/data/onboarding-categories.ts`

```typescript
export interface OnboardingCategory {
  key: CategoryKey;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  isEssential: boolean;
  subcategories: OnboardingSubcategory[];
}

export interface OnboardingSubcategory {
  name: string;
  description?: string;
  formalityScore: number; // Default formality 1-10
  seasons: Season[]; // Default seasons
}

export type CategoryKey = 'Tops' | 'Bottoms' | 'Shoes' | 'Layers' | 'Dresses' | 'Accessories';
export type Season = 'All' | 'Summer' | 'Winter' | 'Spring' | 'Fall';

export const ONBOARDING_CATEGORIES: OnboardingCategory[] = [
  {
    key: 'Tops',
    name: 'Tops',
    description: 'T-shirts, blouses, polos, dress shirts, sweaters',
    icon: 'Shirt',
    isEssential: true,
    subcategories: [
      { name: 'T-Shirt', formalityScore: 2, seasons: ['All'] },
      { name: 'Polo', formalityScore: 4, seasons: ['All'] },
      { name: 'OCBD', formalityScore: 6, seasons: ['All'] },
      { name: 'Dress Shirt', formalityScore: 8, seasons: ['All'] },
      { name: 'Blouse', formalityScore: 6, seasons: ['All'] },
      { name: 'Tank Top', formalityScore: 1, seasons: ['Summer'] },
      { name: 'Sweater', formalityScore: 5, seasons: ['Fall', 'Winter'] },
      { name: 'Cardigan', formalityScore: 5, seasons: ['Fall', 'Winter'] },
      { name: 'Hoodie', formalityScore: 2, seasons: ['Fall', 'Winter'] },
      { name: 'Quarter Zip', formalityScore: 4, seasons: ['Fall', 'Winter'] },
    ],
  },
  // ... more categories
];
```

### Generated Wardrobe Item

```typescript
export interface GeneratedWardrobeItem {
  id: string; // Temporary ID for UI
  category: CategoryKey;
  subcategory: string;
  name: string; // Generated from subcategory + color
  color: string;
  formality_score: number;
  season: Season[];
  image_url: string | null;
  source: 'onboarding';
}
```

### Quantity Mapping

```typescript
export const QUANTITY_MAP: Record<QuantityLabel, number> = {
  'None': 0,
  '1': 1,
  '2-3': 3,
  '4-6': 5,
  '7+': 7,
};
```

## Business Logic

### Item Generation Service

**Location:** `lib/services/onboarding-generator.ts`

**Core Function:**
```typescript
export function generateWardrobeItems(
  selectedCategories: CategoryKey[],
  selectedSubcategories: Record<CategoryKey, string[]>,
  colorQuantitySelections: Record<string, SubcategoryColorSelection>
): GeneratedWardrobeItem[]
```

**Algorithm:**
1. Iterate through each selected subcategory
2. Get color and quantity selections
3. For each color:
   - Create N items (based on quantity)
   - Generate name: `${color} ${subcategory}` (e.g., "Navy Polo")
   - Look up matching image from existing wardrobe data
   - Set formality score from subcategory definition
   - Set season tags from subcategory definition
4. Return array of generated items

**Image Matching Logic:**
```typescript
function findMatchingImage(
  category: CategoryKey,
  subcategory: string,
  color: string
): string | null {
  // 1. Try exact match: category + subcategory + color
  // 2. Try category + color match
  // 3. Try category match only
  // 4. Return null (placeholder will be used)
}
```

### Category Creation Logic

**Location:** `lib/services/onboarding-category-manager.ts`

```typescript
export async function ensureCategoriesExist(
  userId: string,
  categoryKeys: CategoryKey[]
): Promise<Map<CategoryKey, string>> {
  // Returns map of CategoryKey -> category_id
  
  // 1. Fetch existing user categories
  // 2. For each categoryKey:
  //    - If exists, use existing category_id
  //    - If not exists, create new category
  // 3. Return mapping
}
```

**Category Mapping:**
- Tops → "Shirt" category (or create "Tops" if needed)
- Bottoms → "Pants" category (or create "Bottoms" if needed)
- Shoes → "Shoes" category
- Layers → "Jacket" category (or create "Layers" if needed)
- Dresses → "Dress" category (or create "Dresses" if needed)
- Accessories → Multiple categories (Belt, Watch, etc.)

### Batch Item Creation

**Location:** `lib/services/onboarding-persister.ts`

```typescript
export async function persistWardrobeItems(
  userId: string,
  items: GeneratedWardrobeItem[],
  categoryMap: Map<CategoryKey, string>
): Promise<{ success: number; failed: number; errors: string[] }>
```

**Algorithm:**
1. Map each GeneratedWardrobeItem to CreateWardrobeItemInput
2. Batch insert to database (chunks of 50)
3. Handle errors gracefully
4. Return success/failure statistics

## Integration Points

### Existing Hooks Usage

**useCategories:**
- Fetch existing user categories
- Check if categories need to be created

**useCreateCategory:**
- Create missing categories during onboarding

**useCreateWardrobeItem:**
- Persist generated items to database
- Use for batch creation with optimistic updates

### Existing Color Options

**useColorOptions:**
- Import COLOR_OPTIONS from `lib/data/color-options.ts`
- Use existing color validation functions
- Leverage color hex values for swatches

### Navigation and Routing

**Next.js App Router:**
- Route: `app/onboarding/page.tsx`
- Server component wrapper
- Client component for wizard logic
- Redirect after completion using `useRouter`

## Styling and Theming

### Design System Integration

**Tailwind Classes:**
- Use existing theme variables (foreground, background, muted, etc.)
- Support light and dark modes via `dark:` prefix
- Consistent spacing and typography

**Component Patterns:**
- Card-based layouts for selections
- Button variants (primary, ghost, outline)
- Form controls (dropdowns, checkboxes)
- Progress indicators

**Responsive Design:**
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Touch-friendly targets (min 44px)
- Horizontal scrolling for mobile where needed

### Accessibility

**ARIA Labels:**
- All interactive elements have labels
- Form controls properly associated
- Progress indicator announces current step

**Keyboard Navigation:**
- Tab order follows visual flow
- Enter/Space activate buttons
- Arrow keys for option selection
- Escape to cancel/go back

**Focus Management:**
- Visible focus indicators
- Focus trapped within wizard
- Focus restored on step change

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Step Validation Prevents Invalid Progression

*For any* wizard state, the user cannot proceed to the next step without meeting the current step's requirements.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 2: Category Selection Preserves Essential Categories

*For any* user interaction with category selection, the essential categories (Tops, Bottoms, Shoes) remain available and cannot all be deselected.

**Validates: Requirements 2.3**

### Property 3: Generated Items Match User Selections

*For any* set of user selections, the generated items correspond exactly to the selected subcategories, colors, and quantities.

**Validates: Requirements 3.4.1, 3.4.5**

### Property 4: Item Cap Limits Total Items

*For any* generated item set with item cap enabled, the total number of items does not exceed the cap value.

**Validates: Requirements 3.4.6**

### Property 5: Color Values Are Normalized

*For any* color selection, the stored color value is lowercase and trimmed.

**Validates: Requirements 3.3.5**

### Property 6: Formality Scores Are Valid

*For any* generated item, the formality score is between 1 and 10 inclusive.

**Validates: Requirements 3.4.7**

### Property 7: Season Tags Match Climate Selection

*For any* generated item, the season tags are appropriate for the user's climate selection.

**Validates: Requirements 3.4.8**

### Property 8: Category Creation Is Idempotent

*For any* set of category keys, calling ensureCategoriesExist multiple times produces the same result.

**Validates: Requirements 3.2.5**

### Property 9: Item Names Are Descriptive

*For any* generated item, the name follows the pattern "{color} {subcategory}" or "{subcategory}" if color is unspecified.

**Validates: Requirements 3.4.2**

### Property 10: Database Persistence Succeeds or Fails Gracefully

*For any* batch of items to persist, either all items are saved successfully or errors are logged and reported without data corruption.

**Validates: Requirements 3.5.4**

### Property 11: Navigation State Is Consistent

*For any* step transition, the wizard state reflects the correct step number and previous selections are preserved.

**Validates: Requirements 3.6.5**

### Property 12: Image URLs Are Valid or Null

*For any* generated item, the image_url is either a valid string path or null.

**Validates: Requirements 3.4.3, 3.4.4**

## Error Handling

### User Input Validation

**Scenario:** User tries to proceed without required selections
- **Detection:** `canProceed()` returns false
- **Response:** Continue button remains disabled
- **Recovery:** User completes required selections
- **User Feedback:** Visual indication of incomplete requirements

**Scenario:** User selects invalid color combination
- **Detection:** Color not in COLOR_OPTIONS
- **Response:** Validation error in form
- **Recovery:** User selects valid color
- **User Feedback:** Error message with valid options

### Database Operations

**Scenario:** Category creation fails
- **Detection:** useCreateCategory mutation error
- **Response:** Log error, show user-friendly message
- **Recovery:** Retry category creation or use existing categories
- **User Feedback:** "Unable to create category. Please try again."

**Scenario:** Item creation fails for some items
- **Detection:** Batch insert returns partial success
- **Response:** Log failed items, continue with successful ones
- **Recovery:** Show summary of created vs. failed items
- **User Feedback:** "Created 45 of 50 items. 5 items failed to save."

**Scenario:** Network connection lost during creation
- **Detection:** Network error from Supabase client
- **Response:** Pause operation, show connection error
- **Recovery:** Retry button or save progress locally
- **User Feedback:** "Connection lost. Please check your internet and try again."

### Item Generation

**Scenario:** No matching image found for item
- **Detection:** findMatchingImage returns null
- **Response:** Set image_url to null, use placeholder in UI
- **Recovery:** User can upload image later
- **User Feedback:** Item created with placeholder image

**Scenario:** Quantity calculation exceeds reasonable limit
- **Detection:** Total items > 200 before cap
- **Response:** Apply item cap automatically
- **Recovery:** User can adjust selections
- **User Feedback:** "Selection would create 250 items. Applying 50 item cap."

### Navigation and State

**Scenario:** User refreshes page mid-wizard
- **Detection:** Wizard state lost
- **Response:** Restart wizard from step 1
- **Recovery:** User completes wizard again
- **User Feedback:** "Session expired. Please start over."

**Scenario:** User navigates back from success step
- **Detection:** Step 6 back button (if enabled)
- **Response:** Prevent navigation or show warning
- **Recovery:** User stays on success page
- **User Feedback:** "Wardrobe already created. View your items."

## Performance Considerations

### Optimization Strategies

**Lazy Loading:**
- Step components loaded dynamically
- Images loaded on-demand with Next.js Image
- Color swatches rendered with CSS (no image files)

**Memoization:**
- Category definitions memoized
- Generated items cached until selections change
- Validation functions memoized with useCallback

**Batch Operations:**
- Database inserts in chunks of 50
- Parallel category creation where possible
- Optimistic updates for better perceived performance

**Bundle Size:**
- Wizard components code-split from main bundle
- Icons imported individually from lucide-react
- Shared components reused (Button, Card, etc.)

### Performance Targets

- Initial wizard load: < 2 seconds
- Step transition: < 100ms
- Item generation: < 1 second for 50 items
- Database persistence: < 5 seconds for 50 items
- Total wizard completion: < 5 minutes

## Testing Strategy

### Unit Tests

**Component Tests:**
- Each step component renders correctly
- Step validation logic works as expected
- State updates propagate correctly
- Navigation buttons enable/disable appropriately
- Form inputs update state

**Service Tests:**
- Item generation produces correct output
- Image matching finds appropriate images
- Category mapping works correctly
- Quantity calculations are accurate
- Color normalization works

**Utility Tests:**
- Validation functions return correct results
- Data transformations preserve integrity
- Error handling catches edge cases

### Property-Based Tests

**Property Tests:**
- Property 1: Step validation prevents invalid progression
- Property 2: Essential categories always available
- Property 3: Generated items match selections
- Property 4: Item cap limits total items
- Property 5: Color values normalized
- Property 6: Formality scores valid (1-10)
- Property 7: Season tags match climate
- Property 8: Category creation idempotent
- Property 9: Item names descriptive
- Property 10: Database operations graceful
- Property 11: Navigation state consistent
- Property 12: Image URLs valid or null

**Configuration:**
- Minimum 5 iterations per property test (fast feedback)
- Use realistic generators for test data
- Focus on business logic, not UI rendering

### Integration Tests

**End-to-End Flows:**
- Complete wizard flow from start to finish
- Category creation and item persistence
- Navigation back and forth between steps
- Item cap functionality
- Error recovery scenarios

**Database Integration:**
- Category creation in Supabase
- Batch item insertion
- Query performance with generated items
- RLS policy enforcement

### Manual Testing

**User Acceptance:**
- Wizard flow is intuitive
- Visual design matches app theme
- Mobile experience is smooth
- Error messages are helpful
- Success state is clear

**Accessibility:**
- Screen reader navigation
- Keyboard-only operation
- Focus management
- Color contrast
- Touch target sizes

## Security Considerations

### Authentication

- Wizard requires authenticated user
- User ID from auth context
- RLS policies enforce data isolation
- No cross-user data access

### Input Validation

- All user inputs validated with Zod
- Color values restricted to predefined list
- Quantity values restricted to valid options
- Category keys validated against enum
- SQL injection prevented by Supabase client

### Data Privacy

- User wardrobe data isolated by user_id
- No sharing of onboarding selections
- Images stored in user-specific paths
- No logging of personal data

## Migration and Rollout

### Deployment Strategy

**Phase 1: Development**
- Route accessible at `/onboarding`
- No automatic redirect
- Manual testing and refinement

**Phase 2: Beta Testing**
- Invite select users to test
- Collect feedback and metrics
- Iterate on UX issues

**Phase 3: Production**
- Add redirect for new users after signup
- Keep manual route accessible
- Monitor completion rates and errors

### Backward Compatibility

- Existing seed-user function remains available
- Users can still use automatic seeding
- Onboarding is optional (can be skipped)
- Existing wardrobe items unaffected

### Data Migration

No migration needed:
- New feature, no existing data to migrate
- Uses existing database schema
- Compatible with current category structure

## File Structure

```
app/
  onboarding/
    page.tsx                          # Route entry point

components/
  onboarding/
    onboarding-wizard.tsx             # Main wizard orchestrator
    wizard-stepper.tsx                # Progress indicator
    step-style-baseline.tsx           # Step 1 component
    step-category-ownership.tsx       # Step 2 component
    step-subcategory-selection.tsx    # Step 3 component
    step-colors-quantity.tsx          # Step 4 component
    step-review.tsx                   # Step 5 component
    step-success.tsx                  # Step 6 component
    __tests__/
      onboarding-wizard.test.tsx
      step-style-baseline.test.tsx
      # ... other step tests

lib/
  data/
    onboarding-categories.ts          # Category definitions
    color-options.ts                  # Existing color data
  
  services/
    onboarding-generator.ts           # Item generation logic
    onboarding-category-manager.ts    # Category creation
    onboarding-persister.ts           # Database persistence
  
  types/
    onboarding.ts                     # TypeScript interfaces
  
  schemas/
    onboarding.ts                     # Zod validation schemas

__tests__/
  onboarding/
    item-generation.property.test.ts  # Property-based tests
    category-creation.test.ts         # Integration tests
    wizard-flow.integration.test.tsx  # E2E tests
```

## Dependencies

### New Dependencies

None - uses existing dependencies:
- React 19
- Next.js 15
- TanStack Query
- Zod
- Lucide React
- Tailwind CSS

### Existing Hooks and Services

- `useAuth` - User authentication
- `useCategories` - Category management
- `useCreateCategory` - Category creation
- `useCreateWardrobeItem` - Item creation
- `COLOR_OPTIONS` - Color definitions
- Supabase client - Database operations

## Implementation Notes

### Development Approach

1. **Start with Data Layer**
   - Define category structure in `onboarding-categories.ts`
   - Create TypeScript interfaces
   - Add Zod schemas

2. **Build Core Services**
   - Implement item generation logic
   - Create category management service
   - Build persistence layer

3. **Develop Step Components**
   - Build in order (Step 1 → Step 6)
   - Test each step independently
   - Integrate with wizard orchestrator

4. **Add Wizard Orchestration**
   - Implement state management
   - Add navigation logic
   - Connect to services

5. **Polish and Test**
   - Add loading states
   - Implement error handling
   - Write tests
   - Accessibility audit

### Code Quality Standards

- TypeScript strict mode enabled
- All props validated with Zod
- Comprehensive error handling
- Accessible HTML semantics
- Mobile-first responsive design
- Performance optimizations applied

### Future Enhancements

**Phase 2:**
- Save progress (resume later)
- Custom image upload during onboarding
- AI-powered suggestions
- Import from other apps

**Phase 3:**
- Gender/style preference step
- More granular subcategories
- Brand preferences
- Size and fit information
- Budget-based filtering

## Open Design Questions

1. **Should we show estimated time per step?**
   - Pro: Sets expectations
   - Con: May feel pressured

2. **Should progress be saved automatically?**
   - Pro: Better UX if interrupted
   - Con: More complex state management

3. **Should we allow skipping optional steps?**
   - Pro: Faster completion
   - Con: May miss important selections

4. **How do we handle very large selections (100+ items)?**
   - Current: Item cap at 50
   - Alternative: Pagination or progressive creation

5. **Should we integrate with existing seed-user function?**
   - Current: Separate implementation
   - Alternative: Replace seed-user entirely
