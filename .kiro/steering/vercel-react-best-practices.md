# Vercel React Best Practices

This document outlines the Vercel React best practices that must be followed for all new code and refactoring work in the My AI Outfit application. These practices ensure optimal performance, accessibility, and maintainability.

## Bundle Size Optimization

### Direct Imports (CRITICAL)

Always use direct imports instead of barrel imports to enable proper tree-shaking:

```typescript
// ❌ NEVER: Barrel imports
import { Check, X, Menu } from 'lucide-react'

// ✅ ALWAYS: Direct imports
import Check from 'lucide-react/dist/esm/icons/check'
import X from 'lucide-react/dist/esm/icons/x'
import Menu from 'lucide-react/dist/esm/icons/menu'
```

### Next.js Package Optimization

Configure automatic optimization in `next.config.js`:

```javascript
module.exports = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-*',
      'date-fns',
      'lodash'
    ]
  }
}
```

### Dynamic Imports

Use dynamic imports for components >50KB:

```typescript
const HeavyComponent = dynamic(
  () => import('./heavy-component'),
  { 
    ssr: false,
    loading: () => <Skeleton />
  }
)
```

### Defer Non-Critical Libraries

Load analytics and monitoring after hydration:

```typescript
'use client'

const Analytics = dynamic(
  () => import('@vercel/analytics').then(m => m.Analytics),
  { ssr: false }
)
```

## Performance Optimization

### Eliminate Waterfalls (CRITICAL)

**Parallelize Independent Operations**:

```typescript
// ❌ NEVER: Sequential
const user = await fetchUser()
const posts = await fetchPosts()

// ✅ ALWAYS: Parallel
const [user, posts] = await Promise.all([
  fetchUser(),
  fetchPosts()
])
```

**Early Return Optimization**:

```typescript
// ✅ Defer awaits until needed
async function updateProfile(data: ProfileData) {
  const userPromise = getUser()
  
  if (!data.email) return { error: 'Invalid' }
  
  const user = await userPromise
  // ...
}
```

**Strategic Suspense Boundaries**:

```typescript
function Page() {
  return (
    <div>
      <Header /> {/* Renders immediately */}
      <Suspense fallback={<Skeleton />}>
        <DataDisplay /> {/* Streams when ready */}
      </Suspense>
    </div>
  )
}
```

### Server-Side Optimization

**React.cache() for Deduplication**:

```typescript
import { cache } from 'react'

export const getCurrentUser = cache(async () => {
  const session = await auth()
  if (!session?.user?.id) return null
  return await db.user.findUnique({ where: { id: session.user.id } })
})
```

**Server Action Security** (CRITICAL):

```typescript
'use server'

import { z } from 'zod'

const schema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1)
})

export async function updateProfile(data: unknown) {
  // 1. Validate
  const validated = schema.parse(data)
  
  // 2. Authenticate
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')
  
  // 3. Authorize
  if (session.user.id !== validated.userId) {
    throw new Error('Forbidden')
  }
  
  // 4. Execute
  await db.user.update({ where: { id: validated.userId }, data: validated })
}
```

**LRU Cache for Cross-Request Caching**:

```typescript
import { LRUCache } from 'lru-cache'

const cache = new LRUCache<string, User>({
  max: 500,
  ttl: 1000 * 60 * 5 // 5 minutes
})
```

### Client-Side Optimization

**SWR for Data Fetching**:

```typescript
import useSWR from 'swr'

function Component() {
  const { data, error, isLoading } = useSWR('/api/data', fetcher)
  // ...
}
```

**Passive Event Listeners**:

```typescript
useEffect(() => {
  const handler = () => { /* ... */ }
  window.addEventListener('scroll', handler, { passive: true })
  return () => window.removeEventListener('scroll', handler)
}, [])
```

**Functional setState**:

```typescript
// ❌ NEVER: Stale closure risk
const addItems = useCallback((items) => {
  setItems([...items, ...newItems])
}, [items])

// ✅ ALWAYS: Stable callback
const addItems = useCallback((newItems) => {
  setItems(curr => [...curr, ...newItems])
}, [])
```

**Lazy State Initialization**:

```typescript
// ✅ Runs only once
const [settings, setSettings] = useState(() => {
  const stored = localStorage.getItem('settings')
  return stored ? JSON.parse(stored) : {}
})
```

**React Transitions**:

```typescript
import { startTransition } from 'react'

const handleChange = (value) => {
  setQuery(value) // Urgent
  startTransition(() => {
    performSearch(value) // Non-urgent
  })
}
```

## Accessibility (CRITICAL)

### Semantic HTML

```typescript
// ❌ NEVER: Non-semantic
<div onClick={handleClick}>Submit</div>

// ✅ ALWAYS: Semantic
<button onClick={handleClick}>Submit</button>
```

### ARIA Labels

```typescript
// ✅ Icon-only buttons
<button aria-label="Delete item">
  <Trash2 aria-hidden="true" />
</button>

// ✅ Form controls
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  autoComplete="email"
  aria-describedby={error ? "email-error" : undefined}
/>
```

### Keyboard Navigation

```typescript
function InteractiveCard({ onClick }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }
  
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      Content
    </div>
  )
}
```

### Focus Management

```css
/* ✅ Use focus-visible */
button {
  outline: none;
}

button:focus-visible {
  @apply ring-2 ring-blue-500 ring-offset-2;
}
```

### Motion Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Rendering Performance

### SVG Animation

```typescript
// ❌ NEVER: Animate SVG directly
<svg className="animate-spin">...</svg>

// ✅ ALWAYS: Animate wrapper
<div className="animate-spin">
  <svg>...</svg>
</div>
```

### Content Visibility

```css
.list-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
}
```

### Static JSX Hoisting

```typescript
// ✅ Hoist static elements
const HEADER = (
  <Header>
    <Logo />
    <Nav />
  </Header>
)

function Component() {
  return <div>{HEADER}</div>
}
```

## JavaScript Performance

### Index Maps for Lookups

```typescript
// ❌ NEVER: O(n) lookups
orders.map(order => ({
  ...order,
  user: users.find(u => u.id === order.userId)
}))

// ✅ ALWAYS: O(1) lookups
const userById = new Map(users.map(u => [u.id, u]))
orders.map(order => ({
  ...order,
  user: userById.get(order.userId)
}))
```

### Immutable Operations

```typescript
// ❌ NEVER: Mutates original
const sorted = users.sort((a, b) => a.name.localeCompare(b.name))

// ✅ ALWAYS: Creates new array
const sorted = users.toSorted((a, b) => a.name.localeCompare(b.name))
```

### RegExp Optimization

```typescript
// ✅ Hoist or memoize
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Component() {
  const regex = useMemo(() => /pattern/, [])
  // ...
}
```

## Type Safety

### No Any Types

```typescript
// ❌ NEVER: any types
function process(data: any) { }

// ✅ ALWAYS: Proper types
function process(data: unknown) {
  const validated = schema.parse(data)
  // ...
}
```

### Zod Validation

```typescript
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email()
})

// Runtime validation
const validated = schema.parse(data)
```

## Testing Requirements

### Unit Tests

- Test all new functions and components
- Focus on behavior, not implementation
- Use realistic test data

### Accessibility Tests

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('should have no a11y violations', async () => {
  const { container } = render(<Component />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### Property-Based Tests

- Test universal properties
- Use simple, fast generators
- Keep numRuns low (3-5 for development)

## Monitoring

### Bundle Size

- Total bundle: <500KB (gzipped)
- First Load JS: <200KB
- Individual chunks: <100KB

### Core Web Vitals

- LCP: ≤ 2.5s
- FID: ≤ 100ms
- CLS: ≤ 0.1

### TypeScript

- Zero `any` types
- Zero type errors
- Strict mode enabled

## Code Review Checklist

Before submitting a PR, verify:

- [ ] Direct imports used (no barrel imports)
- [ ] Dynamic imports for heavy components
- [ ] Async operations parallelized
- [ ] Server Actions have auth checks
- [ ] Semantic HTML used
- [ ] ARIA labels added
- [ ] Keyboard navigation works
- [ ] Focus styles visible
- [ ] No `any` types
- [ ] Tests added
- [ ] Bundle size checked
- [ ] Accessibility tested

## Resources

- [Optimization Patterns Guide](../../docs/optimization-patterns.md)
- [Code Review Checklist](../../docs/code-review-checklist.md)
- [Developer Onboarding](../../docs/developer-onboarding.md)
- [CI/CD Workflow](../../docs/ci-cd-workflow.md)
- [Vercel React Best Practices](https://vercel.com/blog/react-best-practices)

---

*These practices are mandatory for all new code. Existing code should be refactored to follow these patterns during maintenance.*
