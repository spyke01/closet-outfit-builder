# Optimization Patterns Guide

This guide documents the optimization patterns implemented in the What to Wear application following Vercel React best practices. Use this as a reference when implementing new features or optimizing existing code.

## Table of Contents

1. [Bundle Size Optimization](#bundle-size-optimization)
2. [Performance Best Practices](#performance-best-practices)
3. [Accessibility Implementation](#accessibility-implementation)

---

## Bundle Size Optimization

### Direct Icon Imports

**Problem**: Barrel imports load entire icon libraries, increasing bundle size.

**Solution**: Import icons directly from their source files.

```typescript
// ❌ Avoid: Barrel imports
import { Check, X, Menu } from 'lucide-react'

// ✅ Prefer: Direct imports
import Check from 'lucide-react/dist/esm/icons/check'
import X from 'lucide-react/dist/esm/icons/x'
import Menu from 'lucide-react/dist/esm/icons/menu'
```

**Impact**: Reduces bundle size by 15-20% for icon-heavy applications.

### Next.js Package Import Optimization

Configure automatic optimization for commonly used libraries:

```javascript
// next.config.js
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

### Dynamic Imports for Heavy Components

Load large components only when needed:

```typescript
// Heavy editor component
const MonacoEditor = dynamic(
  () => import('./monaco-editor').then(m => m.MonacoEditor),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-96" />
  }
)

// Use in component
function CodeEditor() {
  const [showEditor, setShowEditor] = useState(false)
  
  return (
    <div>
      <button onClick={() => setShowEditor(true)}>
        Open Editor
      </button>
      {showEditor && <MonacoEditor />}
    </div>
  )
}
```

**When to use**:
- Components >50KB
- Third-party libraries (charts, editors, maps)
- Features used by <50% of users

### Conditional Module Loading

Prevent unnecessary code from being bundled:

```typescript
// Feature flag-based loading
const AnalyticsDashboard = dynamic(
  () => import('./analytics-dashboard'),
  { ssr: false }
)

function AdminPanel() {
  const { features } = useFeatureFlags()
  
  return (
    <div>
      {features.analytics && <AnalyticsDashboard />}
    </div>
  )
}

// Client-only code
if (typeof window !== 'undefined') {
  // This code won't be included in server bundle
  const clientOnlyModule = await import('./client-only-feature')
}
```

### Deferred Third-Party Libraries

Load non-critical libraries after hydration:

```typescript
// lib/providers/deferred-monitoring.tsx
'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'

// Analytics loads after hydration
const Analytics = dynamic(
  () => import('@vercel/analytics').then(m => m.Analytics),
  { ssr: false }
)

export function DeferredMonitoring() {
  useEffect(() => {
    // Load error tracking after hydration
    import('@sentry/nextjs').then(Sentry => {
      Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN })
    })
  }, [])
  
  return <Analytics />
}
```

### Intelligent Preloading

Preload components based on user intent:

```typescript
// lib/hooks/use-intelligent-preloading.ts
import { useEffect } from 'react'

export function useIntelligentPreloading() {
  useEffect(() => {
    // Preload on hover
    const buttons = document.querySelectorAll('[data-preload]')
    
    buttons.forEach(button => {
      button.addEventListener('mouseenter', () => {
        const module = button.getAttribute('data-preload')
        if (module) {
          import(`@/components/${module}`)
        }
      }, { once: true })
    })
  }, [])
}

// Usage
<button 
  data-preload="heavy-modal"
  onClick={() => setShowModal(true)}
>
  Open Modal
</button>
```

### Bundle Analysis

Monitor bundle size in CI/CD:

```bash
# Generate bundle analysis
npm run build
npx webpack-bundle-analyzer .next/analyze/client.json

# Check bundle size limits
node scripts/bundle-analysis-ci.js
```

**Recommended limits**:
- Total bundle: <500KB (gzipped)
- First Load JS: <200KB
- Individual chunks: <100KB

---

## Performance Best Practices

### Eliminate Waterfalls

**Pattern 1: Parallel Data Fetching**

```typescript
// ❌ Sequential (3 round trips)
async function Page() {
  const user = await fetchUser()
  const posts = await fetchPosts(user.id)
  const comments = await fetchComments(posts[0].id)
  
  return <Display user={user} posts={posts} comments={comments} />
}

// ✅ Parallel (1 round trip)
async function Page() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchComments()
  ])
  
  return <Display user={user} posts={posts} comments={comments} />
}
```

**Pattern 2: Early Return Optimization**

```typescript
// ❌ Awaits everything upfront
async function updateProfile(data: ProfileData) {
  const user = await getUser()
  const settings = await getSettings()
  
  if (!user) return { error: 'Not found' }
  
  await updateDatabase(data)
  return { success: true }
}

// ✅ Defers unnecessary awaits
async function updateProfile(data: ProfileData) {
  const userPromise = getUser()
  
  // Early validation without awaiting
  if (!data.email) return { error: 'Invalid email' }
  
  const user = await userPromise
  if (!user) return { error: 'Not found' }
  
  await updateDatabase(data)
  return { success: true }
}
```

**Pattern 3: Strategic Suspense Boundaries**

```typescript
// Layout renders immediately, data streams in
function Page() {
  return (
    <div>
      <Header /> {/* Renders immediately */}
      <Suspense fallback={<Skeleton />}>
        <UserData /> {/* Streams when ready */}
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        <PostsList /> {/* Streams independently */}
      </Suspense>
      <Footer /> {/* Renders immediately */}
    </div>
  )
}
```

### Server-Side Optimization

**React.cache() for Deduplication**

```typescript
import { cache } from 'react'

// Deduplicate within single request
export const getCurrentUser = cache(async () => {
  const session = await auth()
  if (!session?.user?.id) return null
  
  return await db.user.findUnique({
    where: { id: session.user.id }
  })
})

// Called multiple times, executes once
async function Layout() {
  const user = await getCurrentUser() // First call
  return <Header user={user} />
}

async function Sidebar() {
  const user = await getCurrentUser() // Cached
  return <UserMenu user={user} />
}
```

**LRU Cache for Cross-Request Caching**

```typescript
import { LRUCache } from 'lru-cache'

const userCache = new LRUCache<string, User>({
  max: 500,
  ttl: 1000 * 60 * 5 // 5 minutes
})

export async function getCachedUser(id: string) {
  const cached = userCache.get(id)
  if (cached) return cached
  
  const user = await db.user.findUnique({ where: { id } })
  if (user) userCache.set(id, user)
  
  return user
}
```

**Server Action Security**

```typescript
'use server'

import { z } from 'zod'

const updateProfileSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email()
})

export async function updateProfile(data: unknown) {
  // 1. Validate input
  const validated = updateProfileSchema.parse(data)
  
  // 2. Authenticate
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')
  
  // 3. Authorize
  if (session.user.id !== validated.userId) {
    throw new Error('Can only update own profile')
  }
  
  // 4. Execute mutation
  await db.user.update({
    where: { id: validated.userId },
    data: { name: validated.name, email: validated.email }
  })
}
```

### Client-Side Optimization

**SWR for Data Fetching**

```typescript
import useSWR from 'swr'

function UserList() {
  const { data: users, error, isLoading } = useSWR(
    '/api/users',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000
    }
  )
  
  if (isLoading) return <Skeleton />
  if (error) return <Error />
  
  return <div>{users?.map(renderUser)}</div>
}
```

**Event Listener Deduplication**

```typescript
import useSWRSubscription from 'swr/subscription'

function useKeyboardShortcut(key: string, callback: () => void) {
  useSWRSubscription('global-keydown', (key, { next }) => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === key) {
        callback()
        next(null, e)
      }
    }
    
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })
}
```

**Passive Event Listeners**

```typescript
useEffect(() => {
  const handleScroll = () => {
    // Scroll handling logic
  }
  
  // Passive listener for better scroll performance
  window.addEventListener('scroll', handleScroll, { passive: true })
  
  return () => window.removeEventListener('scroll', handleScroll)
}, [])
```

### Re-render Optimization

**Functional setState**

```typescript
// ❌ Stale closure risk
const addItems = useCallback((newItems: Item[]) => {
  setItems([...items, ...newItems])
}, [items]) // Recreated on every items change

// ✅ Stable callback
const addItems = useCallback((newItems: Item[]) => {
  setItems(curr => [...curr, ...newItems])
}, []) // Never recreated
```

**Lazy State Initialization**

```typescript
// ❌ Runs on every render
const [settings, setSettings] = useState(
  JSON.parse(localStorage.getItem('settings') || '{}')
)

// ✅ Runs only once
const [settings, setSettings] = useState(() => {
  const stored = localStorage.getItem('settings')
  return stored ? JSON.parse(stored) : {}
})
```

**React Transitions**

```typescript
import { startTransition } from 'react'

function SearchInput() {
  const [query, setQuery] = useState('')
  
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    
    // Urgent: Update input value immediately
    setQuery(value)
    
    // Non-urgent: Update search results
    startTransition(() => {
      performSearch(value)
    })
  }
  
  return <input value={query} onChange={handleChange} />
}
```

### Rendering Performance

**SVG Animation Optimization**

```typescript
// ❌ Animating SVG directly
<svg className="animate-spin">
  <circle cx="12" cy="12" r="10" />
</svg>

// ✅ Animate wrapper for hardware acceleration
<div className="animate-spin">
  <svg>
    <circle cx="12" cy="12" r="10" />
  </svg>
</div>
```

**Content Visibility for Long Lists**

```css
.message-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
}
```

**Static JSX Hoisting**

```typescript
// ❌ Recreated on every render
function Component() {
  return (
    <div>
      <Header>
        <Logo />
        <Nav />
      </Header>
      {/* ... */}
    </div>
  )
}

// ✅ Created once
const HEADER = (
  <Header>
    <Logo />
    <Nav />
  </Header>
)

function Component() {
  return (
    <div>
      {HEADER}
      {/* ... */}
    </div>
  )
}
```

### JavaScript Performance

**Index Maps for Lookups**

```typescript
// ❌ O(n) per lookup
function processOrders(orders: Order[], users: User[]) {
  return orders.map(order => ({
    ...order,
    user: users.find(u => u.id === order.userId)
  }))
}

// ✅ O(1) per lookup
function processOrders(orders: Order[], users: User[]) {
  const userById = new Map(users.map(u => [u.id, u]))
  return orders.map(order => ({
    ...order,
    user: userById.get(order.userId)
  }))
}
```

**Function Result Caching**

```typescript
const slugifyCache = new Map<string, string>()

function cachedSlugify(text: string): string {
  if (slugifyCache.has(text)) {
    return slugifyCache.get(text)!
  }
  
  const result = slugify(text)
  slugifyCache.set(text, result)
  return result
}
```

**Immutable Array Operations**

```typescript
// ❌ Mutates original
const sorted = users.sort((a, b) => a.name.localeCompare(b.name))

// ✅ Creates new array
const sorted = users.toSorted((a, b) => a.name.localeCompare(b.name))
```

---

## Accessibility Implementation

### Semantic HTML

**Use Proper Elements**

```typescript
// ❌ Non-semantic
<div onClick={handleSubmit}>Submit</div>

// ✅ Semantic
<button onClick={handleSubmit}>Submit</button>

// ❌ Non-semantic navigation
<div onClick={() => router.push('/about')}>About</div>

// ✅ Semantic navigation
<Link href="/about">About</Link>
```

### ARIA Labels

**Icon-Only Buttons**

```typescript
// ❌ No accessible name
<button onClick={handleDelete}>
  <Trash2 />
</button>

// ✅ Accessible name provided
<button onClick={handleDelete} aria-label="Delete item">
  <Trash2 aria-hidden="true" />
</button>
```

**Form Controls**

```typescript
// ✅ Proper label association
<label htmlFor="email">Email Address</label>
<input
  id="email"
  type="email"
  name="email"
  autoComplete="email"
  required
  aria-describedby="email-error"
/>
<span id="email-error" role="alert">
  {error && error.message}
</span>
```

**Live Regions**

```typescript
// Toast notifications
<div role="status" aria-live="polite" aria-atomic="true">
  {toast.message}
</div>

// Error messages
<div role="alert" aria-live="assertive">
  {error && error.message}
</div>
```

### Keyboard Navigation

**Interactive Elements**

```typescript
function InteractiveCard({ onClick }: Props) {
  const handleKeyDown = (e: KeyboardEvent) => {
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
      Card Content
    </div>
  )
}
```

**Focus Management**

```typescript
// Modal focus trap
function Modal({ isOpen, onClose, children }: Props) {
  const modalRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!isOpen) return
    
    const modal = modalRef.current
    if (!modal) return
    
    // Focus first focusable element
    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0] as HTMLElement
    const last = focusable[focusable.length - 1] as HTMLElement
    
    first?.focus()
    
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    
    modal.addEventListener('keydown', handleTab)
    return () => modal.removeEventListener('keydown', handleTab)
  }, [isOpen])
  
  if (!isOpen) return null
  
  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {children}
    </div>
  )
}
```

### Focus Styles

```css
/* ❌ Removes focus without replacement */
button {
  outline: none;
}

/* ✅ Uses focus-visible for keyboard-only focus */
button {
  outline: none;
}

button:focus-visible {
  @apply ring-2 ring-blue-500 ring-offset-2;
}

/* ✅ Focus-within for grouped controls */
.form-group:focus-within {
  @apply border-blue-500;
}
```

### Form Accessibility

**Input Attributes**

```typescript
<input
  type="email"
  name="email"
  id="email"
  autoComplete="email"
  inputMode="email"
  spellCheck={false}
  required
  aria-required="true"
  aria-invalid={!!error}
  aria-describedby={error ? "email-error" : undefined}
/>
```

**Error Handling**

```typescript
function FormField({ error, ...props }: Props) {
  const errorId = `${props.id}-error`
  
  return (
    <div>
      <label htmlFor={props.id}>{props.label}</label>
      <input
        {...props}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <span id={errorId} role="alert" className="text-red-500">
          {error.message}
        </span>
      )}
    </div>
  )
}
```

### Motion Accessibility

**Reduced Motion Support**

```css
/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

```typescript
// JavaScript detection
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches

function AnimatedComponent() {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.3
      }}
    >
      Content
    </motion.div>
  )
}
```

**Performance-Friendly Animations**

```css
/* ✅ Animate only transform and opacity */
.animated {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

/* ❌ Avoid animating layout properties */
.animated {
  transition: all 0.3s ease; /* Includes width, height, etc. */
}
```

### Image Accessibility

```typescript
// ✅ Proper alt text
<Image
  src="/jacket.jpg"
  alt="Blue denim jacket with brass buttons"
  width={400}
  height={500}
  priority // For above-fold images
/>

// ✅ Decorative images
<Image
  src="/pattern.svg"
  alt=""
  width={100}
  height={100}
  loading="lazy"
/>

// ✅ Prevent CLS with dimensions
<Image
  src="/photo.jpg"
  alt="Description"
  width={800}
  height={600}
  style={{ width: '100%', height: 'auto' }}
/>
```

### Testing Accessibility

```typescript
// Automated testing with jest-axe
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('should not have accessibility violations', async () => {
  const { container } = render(<Component />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})

// Keyboard navigation testing
test('should be keyboard navigable', () => {
  render(<Component />)
  
  const button = screen.getByRole('button')
  button.focus()
  
  expect(button).toHaveFocus()
  
  fireEvent.keyDown(button, { key: 'Enter' })
  expect(mockHandler).toHaveBeenCalled()
})
```

---

## Monitoring and Validation

### Bundle Size Monitoring

```bash
# CI/CD integration
npm run build
node scripts/bundle-analysis-ci.js

# Local analysis
npm run build
npx webpack-bundle-analyzer .next/analyze/client.json
```

### Performance Monitoring

```typescript
// Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

function sendToAnalytics(metric: Metric) {
  fetch('/api/monitoring/web-vitals', {
    method: 'POST',
    body: JSON.stringify(metric)
  })
}

getCLS(sendToAnalytics)
getFID(sendToAnalytics)
getFCP(sendToAnalytics)
getLCP(sendToAnalytics)
getTTFB(sendToAnalytics)
```

### Accessibility Audits

```bash
# Automated testing
npm run test:a11y

# Lighthouse CI
npx lighthouse https://your-app.com --only-categories=accessibility
```

---

## Quick Reference

### Bundle Size Checklist
- [ ] Use direct imports for icons
- [ ] Configure optimizePackageImports
- [ ] Dynamic import for >50KB components
- [ ] Defer non-critical third-party libraries
- [ ] Implement conditional module loading
- [ ] Add intelligent preloading

### Performance Checklist
- [ ] Parallelize independent async operations
- [ ] Use early return optimization
- [ ] Add strategic Suspense boundaries
- [ ] Implement React.cache() for deduplication
- [ ] Use LRU cache for cross-request caching
- [ ] Secure Server Actions with auth checks

### Accessibility Checklist
- [ ] Use semantic HTML elements
- [ ] Add ARIA labels to icon-only buttons
- [ ] Implement keyboard navigation
- [ ] Use :focus-visible for focus styles
- [ ] Add proper form labels and autocomplete
- [ ] Support prefers-reduced-motion
- [ ] Include alt text for images
- [ ] Test with jest-axe

---

## Additional Resources

- [Vercel React Best Practices](https://vercel.com/blog/react-best-practices)
- [Next.js Performance Documentation](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev Accessibility Guide](https://web.dev/accessibility/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

---

*Last Updated: February 2026*
*Version: 1.0.0*
