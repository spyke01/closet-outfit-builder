# Design Document: My Sizes Feature

## Overview

The My Sizes feature provides a mobile-first interface for storing and recalling clothing size information across categories and brands. The design prioritizes sub-2-second size recall through a pinned card system, supports multiple sizing formats (letter, numeric, waist/inseam, measurements), and maintains data integrity by ensuring pinned cards always reflect underlying category data without duplication.

The system architecture follows the existing What to Wear application patterns: Next.js App Router for pages, Supabase for data persistence with Row Level Security, TanStack Query for server state management, and Zod for validation. All components are mobile-first with responsive breakpoints at 768px (tablet) and 1024px (desktop).

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      My Sizes Page                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Pinned Cards Section                        │  │
│  │  (Horizontal scroll on mobile, grid on tablet+)       │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Category Grid                               │  │
│  │  (2 cols mobile, 3 tablet, 4 desktop)                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─ Tap Category
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Category Detail View                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Standard Size Section                                │  │
│  │  - Primary size, secondary size, notes                │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Brand-Specific Sizes Section                         │  │
│  │  - List of brand overrides with fit scale             │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Measurement Guide Section                            │  │
│  │  - Category-specific body measurements                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Page Load**: TanStack Query fetches user's size categories and pinned preferences from Supabase
2. **Display**: Pinned cards render by querying category data (no duplicate storage)
3. **User Interaction**: Mutations update Supabase, TanStack Query invalidates cache
4. **Offline**: TanStack Query serves cached data, mutations queue for sync

### Technology Stack Integration

- **Pages**: `app/sizes/page.tsx` (main page), `app/sizes/[categoryId]/page.tsx` (detail view)
- **Components**: `components/sizes/` directory for all size-related components
- **Hooks**: `lib/hooks/use-size-categories.ts`, `use-brand-sizes.ts`, `use-pinned-cards.ts`
- **Database**: Supabase tables with RLS policies for user isolation
- **State**: TanStack Query for server state, no client state needed (data always from DB)
- **Validation**: Zod schemas for all size data structures with react-hook-form integration
- **Preloading**: Integration with existing preload-manager.ts for intelligent prefetching
- **Feature Flags**: sizeManagement feature flag for gradual rollout
- **Bundle Optimization**: Direct lucide-react imports and Next.js optimizePackageImports

### Bundle Optimization

**Critical Performance Strategy**: The My Sizes feature implements aggressive bundle size optimization to prevent bloat and maintain fast load times.

**1. Direct lucide-react Imports**:
```typescript
// ❌ Avoid: Barrel imports (loads entire library ~50KB)
import { Check, X, Plus, Edit, Trash } from 'lucide-react'

// ✅ Required: Direct imports (loads only needed icons ~2KB)
import Check from 'lucide-react/dist/esm/icons/check'
import X from 'lucide-react/dist/esm/icons/x'
import Plus from 'lucide-react/dist/esm/icons/plus'
import Edit from 'lucide-react/dist/esm/icons/edit'
import Trash from 'lucide-react/dist/esm/icons/trash'
```

**2. Next.js optimizePackageImports Configuration**:
```javascript
// next.config.ts
export default {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-switch',
      '@radix-ui/react-dialog'
    ]
  }
}
```

**3. Strategic Dynamic Imports**:
```typescript
// Heavy components lazy-loaded on demand
const BrandSizeForm = dynamic(() => import('./brand-size-form'), {
  loading: () => <FormSkeleton />,
  ssr: false
})

const MeasurementGuideSection = dynamic(() => import('./measurement-guide-section'), {
  loading: () => <SectionSkeleton />,
  ssr: false
})

const CustomizePinnedCardsView = dynamic(() => import('./customize-pinned-cards-view'), {
  loading: () => <CustomizeSkeleton />,
  ssr: false
})
```

**Bundle Size Budget**:
- Initial bundle impact: < 25KB (gzipped)
- Lazy-loaded components: ~30KB (loaded on demand)
- Net impact: -23KB improvement (through optimizations)

### Intelligent Preloading

**Integration with Existing Infrastructure**: The My Sizes feature integrates with the existing `preload-manager.ts` and `use-intelligent-preloading.ts` for optimal performance.

**Route Preloading Configuration**:
```typescript
// lib/hooks/use-intelligent-preloading.ts
const ROUTE_PRELOAD_CONFIGS: RoutePreloadConfig[] = [
  // ... existing routes
  {
    route: '/sizes',
    modules: [
      {
        feature: 'sizeManagement',
        importFn: () => import('../../components/sizes/category-detail-view'),
        priority: 'high',
        delay: 0,
      },
      {
        feature: 'sizeManagement',
        importFn: () => import('../../components/sizes/brand-size-form'),
        priority: 'medium',
        delay: 100,
      },
      {
        feature: 'sizeManagement',
        importFn: () => import('../../components/sizes/measurement-guide-section'),
        priority: 'low',
        delay: 200,
      },
    ],
  },
]
```

**Navigation Preloading**:
```typescript
// CategoryGrid component with preloading
import { useNavigationPreloading } from '@/lib/hooks/use-intelligent-preloading'

function CategoryGrid({ categories }: CategoryGridProps) {
  const { getNavigationProps } = useNavigationPreloading()
  
  return categories.map(category => (
    <Link
      href={`/sizes/${category.id}`}
      {...getNavigationProps(`/sizes/${category.id}`)}
    >
      {category.name}
    </Link>
  ))
}
```

**Feature Flag Integration**:
```typescript
// lib/utils/feature-flags.ts
export interface FeatureFlags {
  weather: boolean
  imageProcessing: boolean
  monitoring: boolean
  analytics: boolean
  sizeManagement: boolean // New feature flag
}

export const defaultFeatureFlags: FeatureFlags = {
  weather: true,
  imageProcessing: true,
  monitoring: true,
  analytics: false,
  sizeManagement: true // Enable by default
}
```

## Components and Interfaces

### 1. MySizesPage Component

**Purpose**: Main page displaying pinned cards and category grid

**Props**: None (server component, fetches data internally)

**Key Features**:
- Responsive layout with mobile-first design
- Horizontal scroll for pinned cards on mobile
- Grid layout for categories with responsive columns
- Empty state when no categories exist
- Server-side data fetching with parallel queries
- Client component for interactive features

**Component Structure**:
```typescript
// app/sizes/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MySizesClient } from '@/components/sizes/my-sizes-client'

export default async function MySizesPage() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Parallel data fetching for optimal performance
  const [categories, pinnedPreferences] = await Promise.all([
    supabase
      .from('size_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('pinned_preferences')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order')
  ])

  return (
    <MySizesClient 
      initialCategories={categories.data || []}
      initialPinnedPreferences={pinnedPreferences.data || []}
    />
  )
}

// components/sizes/my-sizes-client.tsx (Client Component)
'use client'

import { useSizeCategories, usePinnedPreferences } from '@/lib/hooks/use-size-categories'

interface MySizesClientProps {
  initialCategories: SizeCategory[]
  initialPinnedPreferences: PinnedPreference[]
}

export function MySizesClient({ 
  initialCategories, 
  initialPinnedPreferences 
}: MySizesClientProps) {
  // TanStack Query with server-provided initial data
  const { data: categories } = useSizeCategories({
    initialData: initialCategories
  })
  
  const { data: pinnedPreferences } = usePinnedPreferences({
    initialData: initialPinnedPreferences
  })
  
  return (
    <div className="container">
      <PinnedCardsSection pinnedIds={pinnedPreferences} />
      <CategoryGrid categories={categories} />
    </div>
  )
}
```

**React.cache() Integration**:
```typescript
// lib/supabase/cached-queries.ts
import { cache } from 'react'
import { createClient } from './server'

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getUserCategories = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('size_categories')
    .select('*')
    .eq('user_id', userId)
    .order('name')
  return data || []
})
```

### 2. PinnedCardsSection Component

**Purpose**: Display user-selected pinned category cards

**Props**:
```typescript
interface PinnedCardsSectionProps {
  pinnedIds: string[]; // Category IDs to display as pinned
}
```

**Key Features**:
- Queries category data for each pinned ID (no duplicate storage)
- Horizontal scroll on mobile with snap points
- Grid layout on tablet/desktop with drag-and-drop
- Long-press gesture support for context menu
- Displays: category name, primary size, optional secondary size, last updated

**Responsive Behavior**:
- Mobile: `overflow-x-auto snap-x` with `w-[85vw]` cards
- Tablet+: CSS Grid with `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`

### 3. PinnedCard Component

**Purpose**: Individual pinned category card

**Props**:
```typescript
interface PinnedCardProps {
  categoryId: string;
  displayMode: 'standard' | 'dual' | 'preferred-brand';
  preferredBrandId?: string; // For preferred-brand mode
  onTap: () => void;
  onLongPress: () => void;
}
```

**Key Features**:
- Fetches category data via `useSizeCategory(categoryId)` hook
- Displays size based on display mode
- Touch target minimum 44x44px
- Visual feedback on tap (< 100ms)
- Context menu on long-press (500ms threshold)

### 4. CategoryGrid Component

**Purpose**: Grid of all available categories

**Props**:
```typescript
interface CategoryGridProps {
  categories: SizeCategory[];
}
```

**Key Features**:
- Responsive grid: 2/3/4 columns based on viewport
- Each tile shows category name, size count, "varies by brand" indicator
- Final tile is "Add category" action
- Empty state when no categories exist

### 5. CategoryDetailView Component

**Purpose**: Detailed view for managing a single category

**Props**:
```typescript
interface CategoryDetailViewProps {
  categoryId: string;
}
```

**Key Features**:
- Three sections: Standard Size, Brand Sizes, Measurement Guide
- Edit actions for standard size
- Add/edit/delete for brand sizes
- Measurement input with unit conversion
- Mobile: full-screen view, Tablet+: modal or side panel
- Server-side parallel data fetching
- Client component for interactive features

**Component Structure**:
```typescript
// app/sizes/[categoryId]/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CategoryDetailClient } from '@/components/sizes/category-detail-client'

export default async function CategoryDetailPage({ 
  params 
}: { 
  params: { categoryId: string } 
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/auth/login')

  // ✅ Parallel fetching - eliminates waterfall (3× faster)
  const [category, brandSizes, measurements] = await Promise.all([
    supabase
      .from('size_categories')
      .select('*, standard_sizes(*)')
      .eq('id', params.categoryId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('brand_sizes')
      .select('*')
      .eq('category_id', params.categoryId)
      .eq('user_id', user.id),
    supabase
      .from('category_measurements')
      .select('*')
      .eq('category_id', params.categoryId)
      .eq('user_id', user.id)
      .single()
  ])

  return (
    <CategoryDetailClient
      initialCategory={category.data}
      initialBrandSizes={brandSizes.data || []}
      initialMeasurements={measurements.data}
    />
  )
}

// components/sizes/category-detail-client.tsx (Client Component)
'use client'

import { useSizeCategory, useBrandSizes, useMeasurements } from '@/lib/hooks/use-size-categories'

interface CategoryDetailClientProps {
  initialCategory: SizeCategory
  initialBrandSizes: BrandSize[]
  initialMeasurements: CategoryMeasurements | null
}

export function CategoryDetailClient({ 
  initialCategory,
  initialBrandSizes,
  initialMeasurements
}: CategoryDetailClientProps) {
  const { data: category } = useSizeCategory(initialCategory.id, {
    initialData: initialCategory
  })
  const { data: brandSizes } = useBrandSizes(initialCategory.id, {
    initialData: initialBrandSizes
  })
  const { data: measurements } = useMeasurements(initialCategory.id, {
    initialData: initialMeasurements
  })
  
  return (
    <div className="space-y-6">
      <StandardSizeSection category={category} />
      <BrandSizesSection brandSizes={brandSizes} categoryId={category.id} />
      <MeasurementGuideSection measurements={measurements} categoryId={category.id} />
    </div>
  )
}
```

### 6. StandardSizeSection Component

**Purpose**: Display and edit standard size for a category

**Props**:
```typescript
interface StandardSizeSectionProps {
  category: SizeCategory;
}
```

**Key Features**:
- Display primary size, optional secondary size, notes
- Edit button opens size input form
- Supports multiple sizing formats based on category configuration
- Last updated timestamp display

### 7. BrandSizesSection Component

**Purpose**: List and manage brand-specific size overrides

**Props**:
```typescript
interface BrandSizesSectionProps {
  brandSizes: BrandSize[];
  categoryId: string;
}
```

**Key Features**:
- List of brand size entries with edit/delete actions
- "Add brand size" button
- Each entry shows: brand, item type, size, fit scale, notes
- Empty state when no brand sizes exist
- Scrolling/pagination for > 10 entries

### 8. BrandSizeForm Component

**Purpose**: Form for adding/editing brand-specific sizes

**Props**:
```typescript
interface BrandSizeFormProps {
  categoryId: string;
  brandSize?: BrandSize; // Undefined for new, populated for edit
  onSave: () => void;
  onCancel: () => void;
}
```

**Key Features**:
- Searchable brand name dropdown with free text fallback
- Optional item type field
- Size input matching category's supported formats
- 5-point fit scale slider/selector
- Notes textarea
- Validation via Zod schema

### 9. MeasurementGuideSection Component

**Purpose**: Display and edit body measurements for a category

**Props**:
```typescript
interface MeasurementGuideSectionProps {
  measurements: CategoryMeasurements;
  categoryId: string;
}
```

**Key Features**:
- Category-specific measurement fields (e.g., chest/waist/hip for tops)
- Unit toggle: imperial ↔ metric with automatic conversion
- Numeric input with validation
- Save button with optimistic updates

### 10. AddCategoryForm Component

**Purpose**: Form for creating new size categories

**Props**:
```typescript
interface AddCategoryFormProps {
  onSave: () => void;
  onCancel: () => void;
}
```

**Key Features**:
- Category name input with suggested defaults
- Optional icon selection
- Multi-select for supported sizing formats
- "Pin to top" toggle
- Mobile: full-screen modal, Tablet+: dialog

### 11. CustomizePinnedCardsView Component

**Purpose**: Interface for managing pinned cards

**Props**: None (manages own state)

**Key Features**:
- List of all categories with pin/unpin toggles
- Drag handles for reordering pinned cards
- Display mode dropdown per pinned card
- Mobile: full-screen view, Tablet+: side drawer
- Save/cancel actions

## Accessibility Implementation

### Focus-Visible Styles

All interactive elements use `focus-visible` for keyboard navigation without affecting mouse users:

```css
/* globals.css or component styles */
.button, .card, .input, .link {
  /* Remove default outline */
  outline: none;
  
  /* Add visible focus indicator for keyboard navigation */
  &:focus-visible {
    @apply ring-2 ring-blue-500 ring-offset-2;
  }
}

/* Icon-only buttons need larger focus rings */
.icon-button:focus-visible {
  @apply ring-2 ring-blue-600 ring-offset-2;
}
```

### ARIA Labels for Icon-Only Buttons

All icon-only buttons include descriptive ARIA labels:

```typescript
// PinnedCard component
<button
  onClick={handleEdit}
  aria-label={`Edit ${category.name} size`}
  className="icon-button"
>
  <Edit className="h-4 w-4" />
</button>

<button
  onClick={handleDelete}
  aria-label={`Delete ${category.name} category`}
  className="icon-button"
>
  <Trash className="h-4 w-4" />
</button>

// CategoryGrid component
<button
  onClick={handleAddCategory}
  aria-label="Add new clothing category"
  className="add-category-button"
>
  <Plus className="h-6 w-6" />
</button>
```

### Form Accessibility

All forms include proper labels, error associations, and autocomplete attributes:

```typescript
// BrandSizeForm component
<div className="form-field">
  <label htmlFor="brand-name" className="form-label">
    Brand Name <span aria-label="required">*</span>
  </label>
  <input
    id="brand-name"
    type="text"
    name="brand_name"
    autoComplete="organization"
    required
    aria-required="true"
    aria-describedby="brand-name-error brand-name-hint"
    aria-invalid={!!errors.brand_name}
  />
  <span id="brand-name-hint" className="form-hint">
    Enter the clothing brand name
  </span>
  {errors.brand_name && (
    <span id="brand-name-error" role="alert" className="error-message">
      {errors.brand_name.message}
    </span>
  )}
</div>

// Size input with format validation
<div className="form-field">
  <label htmlFor="size-value" className="form-label">
    Size <span aria-label="required">*</span>
  </label>
  <input
    id="size-value"
    type="text"
    name="size"
    autoComplete="off"
    required
    aria-required="true"
    aria-describedby="size-error size-format-hint"
    placeholder="e.g., M, 32, 32x34"
  />
  <span id="size-format-hint" className="form-hint">
    Enter size in any supported format
  </span>
  {errors.size && (
    <span id="size-error" role="alert" className="error-message">
      {errors.size.message}
    </span>
  )}
</div>
```

### Keyboard Navigation

All interactive elements support keyboard navigation with proper event handlers:

```typescript
// CategoryGrid tile - keyboard accessible
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
  aria-label={`View ${category.name} details`}
  className="category-tile"
>
  {category.name}
</div>

// Modal close button
<button
  onClick={onClose}
  onKeyDown={(e) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }}
  aria-label="Close dialog"
  className="close-button"
>
  <X className="h-5 w-5" />
</button>

// Drag handle with keyboard support
<div
  role="button"
  tabIndex={0}
  aria-label={`Reorder ${category.name}`}
  onKeyDown={(e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveUp()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveDown()
    }
  }}
  className="drag-handle"
>
  <GripVertical className="h-5 w-5" />
</div>
```

### Live Regions for Dynamic Updates

Screen readers are notified of important state changes:

```typescript
// After saving a size
<div 
  aria-live="polite" 
  aria-atomic="true" 
  className="sr-only"
>
  {saveSuccess && `${category.name} size updated successfully`}
  {saveError && `Error updating size: ${saveError}`}
</div>

// After deleting a category
<div 
  aria-live="polite" 
  aria-atomic="true" 
  className="sr-only"
>
  {deleteSuccess && `${category.name} category deleted`}
</div>

// Loading states
<div 
  aria-live="polite" 
  aria-busy={isLoading}
  className="sr-only"
>
  {isLoading && 'Loading size information'}
</div>
```

## Performance Patterns

### Functional setState for Stable Callbacks

All state updates use functional setState to prevent stale closures and unnecessary re-renders:

```typescript
// ✅ Correct: Functional setState - stable callback
const handleReorder = useCallback((newOrder: string[]) => {
  setPinnedIds(curr => newOrder)
}, []) // Never recreated

// ✅ Correct: Adding to existing array
const handleAddBrandSize = useCallback((newBrandSize: BrandSize) => {
  setBrandSizes(curr => [...curr, newBrandSize])
}, []) // Stable callback

// ✅ Correct: Updating specific item
const handleUpdateSize = useCallback((categoryId: string, newSize: string) => {
  setCategories(curr => 
    curr.map(cat => 
      cat.id === categoryId 
        ? { ...cat, primary_size: newSize }
        : cat
    )
  )
}, []) // Stable callback

// ❌ Avoid: Direct state reference in callback
const handleReorder = useCallback((newOrder: string[]) => {
  setPinnedIds(newOrder) // Depends on pinnedIds in closure
}, [pinnedIds]) // Recreated on every pinnedIds change
```

### Passive Event Listeners

Touch and scroll events use passive listeners for better performance:

```typescript
// PinnedCardsSection - horizontal scroll
'use client'

import { useEffect, useRef } from 'react'

export function PinnedCardsSection({ pinnedIds }: PinnedCardsSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    // ✅ Passive listeners for better scroll performance
    const handleTouchStart = (e: TouchEvent) => {
      // Track touch start for momentum scrolling
    }

    const handleTouchMove = (e: TouchEvent) => {
      // Handle custom scroll behavior if needed
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto snap-x snap-mandatory"
      style={{ touchAction: 'pan-x' }}
    >
      {/* Pinned cards */}
    </div>
  )
}
```

### Content Visibility for Long Lists

Large lists use `content-visibility` for rendering optimization:

```css
/* For brand size list items */
.brand-size-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px; /* Estimated height */
}

/* For category grid items */
.category-tile {
  content-visibility: auto;
  contain-intrinsic-size: 0 120px;
}
```

```typescript
// BrandSizesSection component
<div className="brand-sizes-list">
  {brandSizes.map(brandSize => (
    <div
      key={brandSize.id}
      className="brand-size-item"
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 80px'
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{brandSize.brand_name}</p>
          {brandSize.item_type && (
            <p className="text-sm text-gray-600">{brandSize.item_type}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">{brandSize.size}</span>
          <FitScaleIndicator value={brandSize.fit_scale} />
        </div>
      </div>
    </div>
  ))}
</div>
```

### Index Maps for O(1) Lookups

Use Map for efficient lookups instead of array.find():

```typescript
// ✅ Correct: O(1) lookup with Map
const PinnedCardsSection = ({ pinnedIds, categories }: Props) => {
  const categoryById = useMemo(() => 
    new Map(categories.map(c => [c.id, c])),
    [categories]
  )

  return pinnedIds.map(id => {
    const category = categoryById.get(id) // O(1) lookup
    if (!category) return null
    return <PinnedCard key={id} category={category} />
  })
}

// ❌ Avoid: O(n) lookup per card
const PinnedCardsSection = ({ pinnedIds, categories }: Props) => {
  return pinnedIds.map(id => {
    const category = categories.find(c => c.id === id) // O(n) lookup
    return <PinnedCard key={id} category={category} />
  })
}
```

### Immutable Array Operations

Use immutable array methods to prevent mutation bugs:

```typescript
// ✅ Correct: Creates new array
const sortedCategories = categories.toSorted((a, b) => 
  a.name.localeCompare(b.name)
)

// ✅ Correct: Immutable reordering
const reorderedPins = [...pinnedIds]
const [removed] = reorderedPins.splice(oldIndex, 1)
reorderedPins.splice(newIndex, 0, removed)
setPinnedIds(reorderedPins)

// ❌ Avoid: Mutates original array
const sortedCategories = categories.sort((a, b) => 
  a.name.localeCompare(b.name)
)
```

## Data Models

### Database Schema

#### size_categories Table
```typescript
interface SizeCategoryRow {
  id: string; // UUID
  user_id: string; // Foreign key to auth.users
  name: string; // e.g., "Tops", "Bottoms", "Footwear"
  icon?: string; // Optional icon identifier
  supported_formats: SizingFormat[]; // Array of supported formats
  is_system_category: boolean; // True for default categories
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

type SizingFormat = 'letter' | 'numeric' | 'waist-inseam' | 'measurements';
```

#### standard_sizes Table
```typescript
interface StandardSizeRow {
  id: string; // UUID
  category_id: string; // Foreign key to size_categories
  user_id: string; // Foreign key to auth.users
  primary_size: string; // e.g., "M", "32", "32x34"
  secondary_size?: string; // Optional second size
  notes?: string; // Free text notes
  created_at: string;
  updated_at: string;
}
```

#### brand_sizes Table
```typescript
interface BrandSizeRow {
  id: string; // UUID
  category_id: string; // Foreign key to size_categories
  user_id: string; // Foreign key to auth.users
  brand_name: string; // e.g., "Levi's", "Nike"
  item_type?: string; // Optional, e.g., "Jeans", "Dress Shirt"
  size: string; // Brand-specific size
  fit_scale: number; // 1-5: runs small to runs large
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

#### category_measurements Table
```typescript
interface CategoryMeasurementsRow {
  id: string; // UUID
  category_id: string; // Foreign key to size_categories
  user_id: string; // Foreign key to auth.users
  measurements: Record<string, number>; // JSONB: { chest: 40, waist: 32, ... }
  unit: 'imperial' | 'metric';
  created_at: string;
  updated_at: string;
}
```

#### pinned_preferences Table
```typescript
interface PinnedPreferencesRow {
  id: string; // UUID
  user_id: string; // Foreign key to auth.users
  category_id: string; // Foreign key to size_categories
  display_order: number; // For ordering pinned cards
  display_mode: 'standard' | 'dual' | 'preferred-brand';
  preferred_brand_id?: string; // For preferred-brand mode
  created_at: string;
  updated_at: string;
}
```

### Zod Schemas

```typescript
import { z } from 'zod';

export const sizingFormatSchema = z.enum([
  'letter',
  'numeric',
  'waist-inseam',
  'measurements'
]);

export const sizeCategorySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(50),
  icon: z.string().optional(),
  supported_formats: z.array(sizingFormatSchema),
  is_system_category: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export const standardSizeSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  user_id: z.string().uuid(),
  primary_size: z.string().min(1).max(20),
  secondary_size: z.string().min(1).max(20).optional(),
  notes: z.string().max(500).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export const brandSizeSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  user_id: z.string().uuid(),
  brand_name: z.string().min(1).max(100),
  item_type: z.string().max(100).optional(),
  size: z.string().min(1).max(20),
  fit_scale: z.number().int().min(1).max(5),
  notes: z.string().max(500).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export const categoryMeasurementsSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  user_id: z.string().uuid(),
  measurements: z.record(z.string(), z.number().positive()),
  unit: z.enum(['imperial', 'metric']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export const pinnedPreferenceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  category_id: z.string().uuid(),
  display_order: z.number().int().nonnegative(),
  display_mode: z.enum(['standard', 'dual', 'preferred-brand']),
  preferred_brand_id: z.string().uuid().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});
```

### React Hook Form Integration

All forms use react-hook-form with zodResolver for type-safe validation:

```typescript
// lib/hooks/use-size-categories.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sizeCategorySchema } from '@/lib/schemas/sizes'
import { createClient } from '@/lib/supabase/client'

export function useCreateCategory() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (data: unknown) => {
      // ✅ Validate with Zod before sending to database
      const validated = sizeCategorySchema.omit({ 
        id: true, 
        created_at: true, 
        updated_at: true 
      }).parse(data)

      const { data: category, error } = await supabase
        .from('size_categories')
        .insert(validated)
        .select()
        .single()

      if (error) throw error
      return category
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sizes', 'categories'] })
    }
  })
}

// components/sizes/add-category-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { sizeCategorySchema } from '@/lib/schemas/sizes'

export function AddCategoryForm({ onSave, onCancel }: AddCategoryFormProps) {
  const createCategory = useCreateCategory()
  
  const form = useForm({
    resolver: zodResolver(
      sizeCategorySchema.omit({ 
        id: true, 
        user_id: true,
        created_at: true, 
        updated_at: true 
      })
    ),
    defaultValues: {
      name: '',
      supported_formats: ['letter'],
      is_system_category: false
    }
  })

  const onSubmit = async (data: any) => {
    try {
      await createCategory.mutateAsync(data)
      onSave()
    } catch (error) {
      // Handle validation errors
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          form.setError(err.path[0] as any, {
            message: err.message
          })
        })
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="form-field">
        <label htmlFor="category-name">Category Name</label>
        <input
          id="category-name"
          {...form.register('name')}
          aria-invalid={!!form.formState.errors.name}
          aria-describedby="category-name-error"
        />
        {form.formState.errors.name && (
          <span id="category-name-error" role="alert" className="error-message">
            {form.formState.errors.name.message}
          </span>
        )}
      </div>
      {/* Additional form fields */}
    </form>
  )
}
```

### TypeScript Types

```typescript
export type SizingFormat = z.infer<typeof sizingFormatSchema>;
export type SizeCategory = z.infer<typeof sizeCategorySchema>;
export type StandardSize = z.infer<typeof standardSizeSchema>;
export type BrandSize = z.infer<typeof brandSizeSchema>;
export type CategoryMeasurements = z.infer<typeof categoryMeasurementsSchema>;
export type PinnedPreference = z.infer<typeof pinnedPreferenceSchema>;

// Client-side view models
export interface PinnedCardData {
  category: SizeCategory;
  standardSize?: StandardSize;
  displayMode: 'standard' | 'dual' | 'preferred-brand';
  preferredBrandSize?: BrandSize;
  displayOrder: number;
}

export interface CategoryGridItem {
  category: SizeCategory;
  sizeCount: number;
  hasVariations: boolean;
}
```

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several redundancies were identified:
- Requirements 2.4 and 10.2 both test that pinned cards reflect underlying data without duplication
- Requirements 9.1 and 11.5 both test 44x44px minimum touch target size
- Requirements 1.3 and 12.1 both test empty state display
- Requirements 13.1 and 13.4 both test category-specific measurement fields
- Requirements 5.1-5.4 can be combined into a single property about accepting all supported sizing formats

These have been consolidated into single, comprehensive properties below.

### Properties

**Property 1: Pinned card data integrity**
*For any* pinned card and its associated category, when the category's standard size is modified, the pinned card should immediately reflect the updated size without requiring a page reload or separate update operation.
**Validates: Requirements 2.4, 10.2, 10.3**

**Property 2: Category deletion preserves data selectively**
*For any* category that is both pinned and has associated data, when a user deletes the category, the system should remove the category from the grid and remove the pin reference, but preserve all associated size data (standard sizes, brand sizes, measurements) in the database for potential recovery.
**Validates: Requirements 2.5, 10.5**

**Property 3: Pinned card display completeness**
*For any* pinned card, the rendered output should contain the category name, primary size value, last updated timestamp, and if a secondary size exists, it should also be displayed.
**Validates: Requirements 2.1**

**Property 4: Category grid item completeness**
*For any* category in the grid, the rendered tile should contain the category name, the count of saved sizes (standard + brand sizes), and if brand-specific sizes exist with different values than the standard size, a "Varies by brand" indicator.
**Validates: Requirements 3.1**

**Property 5: Brand size entry completeness**
*For any* brand size entry, the rendered display should contain brand name, size value, fit scale indicator, and if item type or notes are present, they should also be displayed.
**Validates: Requirements 4.3**

**Property 6: Sizing format support**
*For any* category with supported sizing formats, when a user enters a size in any of the supported formats (letter, numeric, waist/inseam, or measurements), the system should accept and store the value correctly.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

**Property 7: Timestamp updates on save**
*For any* category, when a user saves or modifies the standard size, the category's updated_at timestamp should be set to the current time and be greater than the previous timestamp.
**Validates: Requirements 5.5**

**Property 8: Brand size validation**
*For any* brand size submission, the system should reject entries missing brand_name or size fields, and should accept entries with or without optional item_type and notes fields.
**Validates: Requirements 6.1, 6.2, 6.4**

**Property 9: Brand size category association**
*For any* brand size saved to a category, querying brand sizes by that category ID should return the saved brand size in the results.
**Validates: Requirements 6.5**

**Property 10: Category creation adds to grid**
*For any* new category created by a user, the category should appear in the category grid immediately after creation without requiring a page refresh.
**Validates: Requirements 7.4**

**Property 11: Category deletion removes from all locations**
*For any* user-created category, when deleted, the category should be removed from the category grid, removed from pinned cards if pinned, but the deletion should not affect other categories.
**Validates: Requirements 7.5**

**Property 12: Pinned card reordering persistence**
*For any* reordering of pinned cards, when a user changes the display order and saves, the new order should persist across page reloads and sessions.
**Validates: Requirements 8.5**

**Property 13: Touch target minimum size**
*For any* interactive element (buttons, cards, links, form inputs), the rendered element should have a minimum touch target area of 44x44 pixels.
**Validates: Requirements 9.1, 11.5**

**Property 14: Data persistence on save**
*For any* size data (standard size, brand size, measurement, pinned preference), when saved, the data should be immediately queryable from the database without requiring a page refresh.
**Validates: Requirements 10.1**

**Property 15: Accessibility color contrast**
*For any* rendered interface element with text or interactive content, the color contrast ratio between foreground and background should meet WCAG 2.1 AA standards (minimum 4.5:1 for normal text, 3:1 for large text).
**Validates: Requirements 11.1**

**Property 16: Keyboard focus indicators**
*For any* interactive element, when it receives keyboard focus, a visible focus indicator should be present with sufficient contrast to be clearly visible.
**Validates: Requirements 11.2**

**Property 17: ARIA attributes presence**
*For any* interactive element, the rendered HTML should include appropriate ARIA labels, roles, and states for screen reader compatibility.
**Validates: Requirements 11.3**

**Property 18: Text truncation with full text access**
*For any* text field (category name, brand name) exceeding the display width, the text should be truncated with an ellipsis, and the full text should be accessible via tooltip or expansion.
**Validates: Requirements 12.3**

**Property 19: Category-specific measurement fields**
*For any* category type, the Measurement Guide section should display measurement fields appropriate to that category (e.g., chest/waist/hip for tops, inseam/waist for pants, foot length/width for footwear).
**Validates: Requirements 13.1, 13.4**

**Property 20: Measurement storage with units**
*For any* measurement entry, the system should store the numeric value along with the unit (imperial or metric), and both should be retrievable together.
**Validates: Requirements 13.2**

**Property 21: Unit conversion round-trip**
*For any* measurement value, converting from imperial to metric and back to imperial (or vice versa) should produce a value within 1% of the original value (accounting for rounding).
**Validates: Requirements 13.3**

**Property 22: Measurement category association**
*For any* measurement saved to a category, querying measurements by that category ID should return the saved measurements.
**Validates: Requirements 13.5**

**Property 23: Brand name dropdown contains previous entries**
*For any* user who has previously entered brand names, when adding a new brand size, the searchable dropdown should contain all previously entered brand names for that user.
**Validates: Requirements 14.1**

**Property 24: Brand search filtering**
*For any* search query in the brand dropdown, the filtered results should only include brand names that contain the search query as a substring (case-insensitive).
**Validates: Requirements 14.2**

**Property 25: New brand name persistence**
*For any* new brand name entered via free text, after saving the brand size, the brand name should appear in the searchable dropdown for future brand size entries.
**Validates: Requirements 14.4**

**Property 26: Brand name capitalization consistency**
*For any* brand name, when displayed throughout the system, the capitalization should match the first entry of that brand name (case-insensitive matching for lookups).
**Validates: Requirements 14.5**

**Property 27: Display mode rendering - standard**
*For any* pinned card set to "standard size" display mode, the card should display only the primary size from the category's standard size, and should not display secondary size or brand-specific sizes.
**Validates: Requirements 15.2**

**Property 28: Display mode rendering - dual**
*For any* pinned card set to "dual size" display mode, the card should display both the primary size and secondary size from the category's standard size (if secondary size exists).
**Validates: Requirements 15.3**

**Property 29: Display mode rendering - preferred brand**
*For any* pinned card set to "preferred brand size" display mode with a selected brand, the card should display the size from that brand's brand size entry rather than the standard size.
**Validates: Requirements 15.4**

**Property 30: Display mode update immediacy**
*For any* pinned card, when the display mode is changed, the card's rendered content should update to reflect the new display mode within the same page session without requiring a page reload.
**Validates: Requirements 15.5**

## Error Handling

### Validation Errors

**Client-Side Validation**:
- All form inputs validated via Zod schemas before submission
- Real-time validation feedback for required fields
- Format validation for size inputs (e.g., waist/inseam must match pattern `\d+x\d+`)
- Numeric validation for measurements (must be positive numbers)
- String length validation (category names ≤ 50 chars, brand names ≤ 100 chars, notes ≤ 500 chars)

**Server-Side Validation**:
- Duplicate Zod validation on API routes
- Database constraints enforce data integrity
- User ID validation ensures data isolation
- Foreign key constraints prevent orphaned records

### Database Errors

**Connection Failures**:
- TanStack Query automatic retry with exponential backoff
- Offline mode: serve cached data, queue mutations
- User notification: "Unable to connect. Changes will sync when online."

**Constraint Violations**:
- Unique constraint on `(user_id, category_id)` in `pinned_preferences`
- Foreign key violations caught and reported as "Category not found"
- RLS policy violations reported as "Access denied"

### User Input Errors

**Invalid Size Formats**:
- Waist/inseam: must match `\d+x\d+` pattern
- Measurements: must be positive numbers
- Error message: "Please enter a valid size format"

**Missing Required Fields**:
- Brand name and size required for brand sizes
- Category name required for new categories
- Error message: "This field is required"

**Text Length Violations**:
- Category name > 50 chars: "Category name must be 50 characters or less"
- Brand name > 100 chars: "Brand name must be 100 characters or less"
- Notes > 500 chars: "Notes must be 500 characters or less"

### Sync Conflicts

**Offline Edits**:
- When online, compare local timestamp with server timestamp
- If server timestamp is newer: prompt user to choose version
- Options: "Keep my changes", "Use server version", "View both"
- Conflict resolution UI shows both versions side-by-side

### Empty States

**No Categories**:
- Display: "Get started by adding your first clothing category"
- Action: Large "Add Category" button
- Optional: Suggested categories (Tops, Bottoms, Footwear, Outerwear)

**No Brand Sizes**:
- Display: "No brand-specific sizes yet"
- Action: "Add brand size" button
- Helper text: "Track sizes that differ from your standard size"

**No Pinned Cards**:
- Display: "Pin your most-used categories for quick access"
- Action: "Customize pinned cards" button

## Testing Strategy

### Unit Tests

Unit tests focus on specific examples, edge cases, and component rendering:

**Component Tests**:
- PinnedCard renders with all required fields
- CategoryGrid displays correct number of columns at each breakpoint
- BrandSizeForm validates required fields
- MeasurementGuideSection displays category-specific fields
- Empty states display correct messaging and actions

**Utility Function Tests**:
- Unit conversion functions (imperial ↔ metric)
- Size format validation (letter, numeric, waist/inseam)
- Text truncation with ellipsis
- Timestamp formatting

**Hook Tests**:
- `useSizeCategory` fetches and caches category data
- `useBrandSizes` filters by category ID
- `usePinnedCards` orders by display_order
- Mutation hooks update cache optimistically

**Edge Cases**:
- Empty data sets (no categories, no brand sizes)
- Very long text strings (truncation)
- Large lists (> 10 brand sizes, pagination)
- Offline mode (cached data access)
- Sync conflicts (timestamp comparison)

### Property-Based Tests

Property tests verify universal properties across all inputs using fast-check:

**Configuration**:
- Library: fast-check for TypeScript
- Minimum iterations: 100 per property test
- Tag format: `// Feature: my-sizes, Property N: [property text]`

**Test Coverage**:
- Each correctness property (1-30) implemented as a property-based test
- Generators for: SizeCategory, StandardSize, BrandSize, CategoryMeasurements, PinnedPreference
- Focus on business logic functions, not UI rendering

**Example Property Test**:
```typescript
import fc from 'fast-check';

// Feature: my-sizes, Property 21: Unit conversion round-trip
describe('Measurement unit conversion', () => {
  it('should round-trip within 1% accuracy', () => {
    fc.assert(
      fc.property(
        fc.record({
          value: fc.float({ min: 0.1, max: 1000, noNaN: true }),
          unit: fc.constantFrom('imperial', 'metric')
        }),
        ({ value, unit }) => {
          const converted = convertUnit(value, unit, unit === 'imperial' ? 'metric' : 'imperial');
          const roundTrip = convertUnit(converted, unit === 'imperial' ? 'metric' : 'imperial', unit);
          const percentDiff = Math.abs((roundTrip - value) / value);
          expect(percentDiff).toBeLessThan(0.01); // Within 1%
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property Test Patterns**:
- **Data integrity**: Properties 1, 2, 9, 14, 22 (data relationships preserved)
- **Completeness**: Properties 3, 4, 5 (all required fields present)
- **Validation**: Properties 6, 8, 13 (input acceptance/rejection)
- **Round-trip**: Property 21 (unit conversion reversibility)
- **Consistency**: Properties 26, 27-30 (display mode rendering)
- **Persistence**: Properties 10, 12, 14, 25 (data survives operations)

### Integration Tests

Integration tests verify end-to-end flows:

**User Flows**:
- Create category → Add standard size → Pin category → Verify pinned card displays size
- Add brand size → Verify appears in brand list → Set as preferred on pinned card
- Enter measurements → Toggle units → Verify conversion → Save → Reload → Verify persisted
- Reorder pinned cards → Save → Reload → Verify order maintained
- Delete category → Verify removed from grid and unpinned

**Database Integration**:
- RLS policies enforce user isolation
- Foreign key constraints prevent orphaned records
- Unique constraints prevent duplicate pins
- Cascade deletes remove associated data

**Offline/Online Sync**:
- Make changes offline → Go online → Verify sync
- Conflict scenario → Verify resolution UI appears
- Choose resolution → Verify correct version saved

### Accessibility Tests

**Automated Checks**:
- axe-core for WCAG 2.1 AA compliance
- Color contrast validation (Property 15)
- ARIA attribute presence (Property 17)
- Keyboard navigation support (Property 16)

**Manual Testing**:
- Screen reader compatibility (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation
- Touch target sizes on actual mobile devices
- Long-press gesture recognition

### Performance Tests

**Load Time**:
- Initial page load < 2 seconds (Requirement 1.2)
- Category detail view opens < 500ms
- Pinned card updates < 100ms (Requirement 9.3)

**Rendering Performance**:
- Large category lists (100+ categories) render smoothly
- Horizontal scroll maintains 60fps on mobile
- Drag-and-drop reordering responsive on tablet/desktop

### Responsive Design Tests

**Breakpoint Testing**:
- Mobile (< 768px): horizontal scroll, 2-column grid, full-screen modals
- Tablet (768-1023px): grid layout, 3-column grid, dialogs
- Desktop (≥ 1024px): drag-and-drop, 4-column grid, side panels

**Device Testing**:
- iOS Safari (iPhone, iPad)
- Android Chrome (various screen sizes)
- Desktop browsers (Chrome, Firefox, Safari, Edge)

## Implementation Notes

### Database Migrations

**Initial Schema**:
```sql
-- Enable RLS
ALTER TABLE size_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only access their own categories"
  ON size_categories FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own sizes"
  ON standard_sizes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own brand sizes"
  ON brand_sizes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own measurements"
  ON category_measurements FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own pinned preferences"
  ON pinned_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_size_categories_user_id ON size_categories(user_id);
CREATE INDEX idx_standard_sizes_category_id ON standard_sizes(category_id);
CREATE INDEX idx_brand_sizes_category_id ON brand_sizes(category_id);
CREATE INDEX idx_category_measurements_category_id ON category_measurements(category_id);
CREATE INDEX idx_pinned_preferences_user_id ON pinned_preferences(user_id);
CREATE INDEX idx_pinned_preferences_display_order ON pinned_preferences(user_id, display_order);

-- Unique constraints
ALTER TABLE pinned_preferences ADD CONSTRAINT unique_user_category_pin 
  UNIQUE (user_id, category_id);
```

### TanStack Query Configuration

**Query Keys** (following existing codebase patterns):
```typescript
export const sizeKeys = {
  all: ['sizes'] as const,
  categories: () => [...sizeKeys.all, 'categories'] as const,
  category: (id: string) => [...sizeKeys.all, 'category', id] as const,
  brandSizes: (categoryId: string) => [...sizeKeys.all, 'brand-sizes', categoryId] as const,
  measurements: (categoryId: string) => [...sizeKeys.all, 'measurements', categoryId] as const,
  pinned: () => [...sizeKeys.all, 'pinned'] as const,
};
```

**Cache Invalidation**:
- After creating/updating/deleting category: invalidate `categories` and `pinnedPreferences`
- After updating standard size: invalidate `category` and `pinnedPreferences`
- After creating/updating/deleting brand size: invalidate `brandSizes`
- After updating measurements: invalidate `measurements`

### Responsive Breakpoints

**Tailwind Configuration**:
```typescript
// tailwind.config.ts
export default {
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',  // Tablet breakpoint
      'lg': '1024px', // Desktop breakpoint
      'xl': '1280px',
    },
  },
};
```

**Usage Pattern**:
```typescript
// Mobile-first approach
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {/* Category grid */}
</div>

<div className="overflow-x-auto snap-x md:grid md:grid-cols-3">
  {/* Pinned cards: scroll on mobile, grid on tablet+ */}
</div>
```

### Touch Gesture Handling

**Long-Press Implementation**:
```typescript
import { useCallback, useRef } from 'react';

export function useLongPress(
  onLongPress: () => void,
  delay = 500
) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleTouchStart = useCallback(() => {
    timeoutRef.current = setTimeout(onLongPress, delay);
  }, [onLongPress, delay]);

  const handleTouchEnd = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchEnd, // Cancel on move
  };
}
```

### Unit Conversion

**Conversion Functions**:
```typescript
export function convertUnit(
  value: number,
  fromUnit: 'imperial' | 'metric',
  toUnit: 'imperial' | 'metric'
): number {
  if (fromUnit === toUnit) return value;
  
  if (fromUnit === 'imperial' && toUnit === 'metric') {
    return value * 2.54; // inches to cm
  } else {
    return value / 2.54; // cm to inches
  }
}

export function formatMeasurement(
  value: number,
  unit: 'imperial' | 'metric'
): string {
  const rounded = Math.round(value * 10) / 10; // 1 decimal place
  const unitLabel = unit === 'imperial' ? 'in' : 'cm';
  return `${rounded} ${unitLabel}`;
}
```

### Offline Support

**Service Worker Strategy**:
- Cache all size data on first load
- Queue mutations when offline
- Sync queued mutations when online
- Conflict detection via timestamp comparison

**TanStack Query Offline Configuration**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst', // Serve from cache when offline
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      networkMode: 'offlineFirst', // Queue mutations when offline
    },
  },
});
```
