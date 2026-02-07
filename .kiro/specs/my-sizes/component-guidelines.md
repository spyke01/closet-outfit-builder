# My Sizes Feature - Component Guidelines

## Bundle Optimization Patterns

### Direct Imports (CRITICAL)

**Always use direct imports for lucide-react icons to enable proper tree-shaking:**

```typescript
// ❌ NEVER: Barrel imports (loads entire library ~50KB)
import { Check, X, Plus, Edit, Trash } from 'lucide-react'

// ✅ REQUIRED: Direct imports (loads only needed icons ~2KB)
import Check from 'lucide-react/dist/esm/icons/check'
import X from 'lucide-react/dist/esm/icons/x'
import Plus from 'lucide-react/dist/esm/icons/plus'
import Edit from 'lucide-react/dist/esm/icons/edit'
import Trash from 'lucide-react/dist/esm/icons/trash'
```

### Next.js Configuration

The project is configured with `optimizePackageImports` for automatic optimization:

```javascript
// next.config.ts
experimental: {
  optimizePackageImports: [
    'lucide-react',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-label',
    '@radix-ui/react-switch',
    '@radix-ui/react-dialog',
    '@radix-ui/react-checkbox',
    '@radix-ui/react-select',
    '@radix-ui/react-tooltip',
    '@radix-ui/react-popover',
    '@radix-ui/react-tabs',
    '@radix-ui/react-progress',
  ],
}
```

### Dynamic Imports for Heavy Components

Use dynamic imports for components that are not immediately needed:

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

### Bundle Size Budget

**My Sizes Feature Budget:**
- Initial bundle impact: < 25KB (gzipped)
- Lazy-loaded components: ~30KB (loaded on demand)
- Total feature budget: < 55KB

**Monitoring:**
```bash
# Check bundle size after build
npm run check:bundle

# Analyze bundle composition
npm run build:analyze
```

## Component Development Patterns

### Server vs Client Components

**Default to Server Components:**
```typescript
// app/sizes/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server'
import { MySizesClient } from '@/components/sizes/my-sizes-client'

export default async function MySizesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Parallel data fetching
  const [categories, pinnedPreferences] = await Promise.all([
    supabase.from('size_categories').select('*'),
    supabase.from('pinned_preferences').select('*')
  ])

  return (
    <MySizesClient 
      initialCategories={categories.data || []}
      initialPinnedPreferences={pinnedPreferences.data || []}
    />
  )
}
```

**Client Components Only When Needed:**
```typescript
// components/sizes/my-sizes-client.tsx (Client Component)
'use client'

import { useSizeCategories } from '@/lib/hooks/use-size-categories'

export function MySizesClient({ initialCategories, initialPinnedPreferences }) {
  const { data: categories } = useSizeCategories({
    initialData: initialCategories
  })
  
  return (
    <div>
      <PinnedCardsSection pinnedIds={pinnedPreferences} />
      <CategoryGrid categories={categories} />
    </div>
  )
}
```

### React.cache() for Request Deduplication

**Eliminate duplicate queries in server components:**

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

### Intelligent Preloading

**Integration with existing preload infrastructure:**

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

## Performance Patterns

### Functional setState for Stable Callbacks

```typescript
// ✅ Correct: Functional setState - stable callback
const handleReorder = useCallback((newOrder: string[]) => {
  setPinnedIds(curr => newOrder)
}, []) // Never recreated

// ✅ Correct: Adding to existing array
const handleAddBrandSize = useCallback((newBrandSize: BrandSize) => {
  setBrandSizes(curr => [...curr, newBrandSize])
}, []) // Stable callback

// ❌ Avoid: Direct state reference in callback
const handleReorder = useCallback((newOrder: string[]) => {
  setPinnedIds(newOrder) // Depends on pinnedIds in closure
}, [pinnedIds]) // Recreated on every pinnedIds change
```

### Passive Event Listeners

```typescript
useEffect(() => {
  const element = scrollRef.current
  if (!element) return

  const handleTouchStart = (e: TouchEvent) => {
    // Track touch start
  }

  element.addEventListener('touchstart', handleTouchStart, { passive: true })
  element.addEventListener('touchmove', handleTouchMove, { passive: true })

  return () => {
    element.removeEventListener('touchstart', handleTouchStart)
    element.removeEventListener('touchmove', handleTouchMove)
  }
}, [])
```

### Content Visibility for Long Lists

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
      {/* Brand size content */}
    </div>
  ))}
</div>
```

### Index Maps for O(1) Lookups

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

## Accessibility Patterns

### Focus-Visible Styles

```typescript
// All interactive elements use focus-visible
<button
  onClick={handleEdit}
  aria-label={`Edit ${category.name} size`}
  className="icon-button focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
>
  <Edit className="h-4 w-4" />
</button>
```

### ARIA Labels for Icon-Only Buttons

```typescript
<button
  onClick={handleDelete}
  aria-label={`Delete ${category.name} category`}
  className="icon-button"
>
  <Trash className="h-4 w-4" />
</button>
```

### Form Accessibility

```typescript
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
```

### Keyboard Navigation

```typescript
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
```

## Validation Patterns

### Zod with react-hook-form

```typescript
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
      {/* Form fields */}
    </form>
  )
}
```

## Testing Patterns

### Property-Based Tests

```typescript
import fc from 'fast-check'

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
          const converted = convertUnit(value, unit, unit === 'imperial' ? 'metric' : 'imperial')
          const roundTrip = convertUnit(converted, unit === 'imperial' ? 'metric' : 'imperial', unit)
          const percentDiff = Math.abs((roundTrip - value) / value)
          expect(percentDiff).toBeLessThan(0.01)
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { PinnedCard } from './pinned-card'

describe('PinnedCard', () => {
  it('should render with all required fields', () => {
    const category = createMockCategory({ name: 'Tops' })
    const standardSize = createMockStandardSize({ primary_size: 'M' })
    
    render(
      <PinnedCard
        categoryId={category.id}
        displayMode="standard"
        onTap={vi.fn()}
        onLongPress={vi.fn()}
      />
    )
    
    expect(screen.getByText('Tops')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
  })
})
```

## Summary

Following these patterns ensures:
- **Optimal bundle size**: < 25KB for My Sizes feature
- **Fast load times**: Server-side rendering with parallel data fetching
- **Smooth interactions**: Passive listeners and optimized rendering
- **Accessibility**: WCAG 2.1 AA compliance
- **Type safety**: Zod validation throughout
- **Maintainability**: Clear patterns and conventions
