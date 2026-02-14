# Developer Onboarding Guide

Welcome to the My AI Outfit development team! This guide will help you get up to speed with our codebase, development practices, and optimization standards.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Architecture Overview](#architecture-overview)
4. [Development Workflow](#development-workflow)
5. [Best Practices](#best-practices)
6. [Common Tasks](#common-tasks)
7. [Troubleshooting](#troubleshooting)
8. [Resources](#resources)

---

## Getting Started

### Prerequisites

- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **Git**: Latest version
- **Code Editor**: VS Code recommended (with extensions)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd my-ai-outfit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Required variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `OPENWEATHER_API_KEY`: OpenWeatherMap API key (optional)
   - `CORS_ALLOWED_ORIGINS`: Optional comma-separated CORS allowlist. Netlify runtime origins are auto-allowed.

4. **Run development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

5. **Run tests**
   ```bash
   npm run test
   ```

### VS Code Extensions

Install these recommended extensions:

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Enhanced TypeScript support
- **Tailwind CSS IntelliSense**: Tailwind class autocomplete
- **Error Lens**: Inline error display
- **GitLens**: Git integration
- **axe Accessibility Linter**: Accessibility checking

---

## Development Environment

### Available Commands

```bash
# Development
npm run dev              # Next.js dev server (port 3000)
npm run dev:netlify      # Netlify dev with functions (port 8888)

# Building & Testing
npm run build            # Production build
npm run start            # Start production server
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Run tests with coverage

# Code Quality
npm run lint             # ESLint checks
npm run lint:a11y        # Accessibility linting
npm run type-check       # TypeScript type checking

# Accessibility Testing
npm run test:a11y        # Accessibility compliance tests
npm run test:keyboard    # Keyboard navigation tests

# Performance
npm run analyze          # Bundle size analysis
```

### Project Structure

```
app/                    # Next.js App Router
├── api/               # API routes
├── auth/              # Authentication pages
├── wardrobe/          # Wardrobe management
├── outfits/           # Outfit browsing
└── settings/          # User settings

components/            # React components
├── ui/               # Reusable UI components
└── *.tsx             # Feature components

lib/                   # Shared utilities
├── hooks/            # Custom React hooks
├── utils/            # Pure utility functions
├── actions/          # Server Actions
├── cache/            # Caching utilities
└── types/            # TypeScript types

docs/                  # Documentation
├── optimization-patterns.md
├── code-review-checklist.md
└── developer-onboarding.md

__tests__/            # Test files
```

---

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **State Management**: TanStack Query + Immer
- **Validation**: Zod
- **Testing**: Vitest + Testing Library
- **Icons**: Lucide React

### Key Concepts

#### Server vs Client Components

```typescript
// Server Component (default)
async function ServerComponent() {
  const data = await fetchData()
  return <div>{data}</div>
}

// Client Component (when needed)
'use client'

function ClientComponent() {
  const [state, setState] = useState()
  return <div>{state}</div>
}
```

**Use Client Components for**:
- Interactive UI (useState, useEffect)
- Browser APIs (localStorage, window)
- Event handlers
- Third-party libraries requiring browser APIs

**Use Server Components for**:
- Data fetching
- Database queries
- Authentication checks
- Static content

#### Data Fetching Patterns

**Server Components**:
```typescript
async function Page() {
  const data = await fetchData() // Direct async/await
  return <Display data={data} />
}
```

**Client Components**:
```typescript
'use client'

function Component() {
  const { data } = useSWR('/api/data', fetcher)
  return <Display data={data} />
}
```

#### Server Actions

```typescript
'use server'

import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1)
})

export async function createItem(formData: FormData) {
  // 1. Validate
  const data = schema.parse({
    name: formData.get('name')
  })
  
  // 2. Authenticate
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  
  // 3. Execute
  await db.item.create({ data })
  
  // 4. Revalidate
  revalidatePath('/items')
}
```

---

## Development Workflow

### 1. Pick a Task

- Check the project board for available tasks
- Assign yourself to the task
- Read the requirements and acceptance criteria

### 2. Create a Branch

```bash
git checkout -b feature/task-name
# or
git checkout -b fix/bug-name
```

### 3. Implement Changes

Follow these principles:

**Performance First**:
- Use direct imports for icons
- Dynamic import for heavy components
- Parallelize async operations
- Use React.cache() for deduplication

**Type Safety**:
- No `any` types
- Explicit function signatures
- Zod validation for runtime checks

**Accessibility**:
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus management

### 4. Write Tests

```typescript
// Unit test
describe('utility function', () => {
  it('should handle edge case', () => {
    expect(fn(input)).toBe(expected)
  })
})

// Component test
describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})

// Accessibility test
it('should have no accessibility violations', async () => {
  const { container } = render(<Component />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### 5. Run Quality Checks

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Tests
npm run test:run

# Accessibility
npm run test:a11y
```

### 6. Self-Review

Use the [Code Review Checklist](./code-review-checklist.md):
- [ ] No TypeScript errors
- [ ] All tests pass
- [ ] No accessibility violations
- [ ] Bundle size impact checked
- [ ] Documentation updated

### 7. Create Pull Request

**PR Template**:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Performance improvement
- [ ] Refactoring
- [ ] Documentation

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Performance Impact
- Bundle size: +/- X KB
- Core Web Vitals: No regression

## Accessibility
- [ ] Keyboard navigation tested
- [ ] Screen reader tested
- [ ] jest-axe tests pass

## Screenshots
(if applicable)

## Related Issues
Closes #123
```

### 8. Address Review Feedback

- Respond to all comments
- Make requested changes
- Re-request review when ready

### 9. Merge

- Squash commits if needed
- Delete branch after merge
- Monitor deployment

---

## Best Practices

### Performance Optimization

#### Bundle Size

```typescript
// ❌ Avoid
import { Check, X } from 'lucide-react'

// ✅ Prefer
import Check from 'lucide-react/dist/esm/icons/check'
import X from 'lucide-react/dist/esm/icons/x'
```

#### Dynamic Imports

```typescript
// Heavy component
const Editor = dynamic(
  () => import('./editor'),
  { ssr: false, loading: () => <Skeleton /> }
)
```

#### Parallel Data Fetching

```typescript
// ❌ Sequential
const user = await fetchUser()
const posts = await fetchPosts()

// ✅ Parallel
const [user, posts] = await Promise.all([
  fetchUser(),
  fetchPosts()
])
```

### Type Safety

```typescript
// ✅ Explicit types
interface Props {
  name: string
  age: number
}

function Component({ name, age }: Props): JSX.Element {
  return <div>{name} is {age}</div>
}

// ✅ Zod validation
const schema = z.object({
  name: z.string(),
  age: z.number()
})

const validated = schema.parse(data)
```

### Accessibility

```typescript
// ✅ Semantic HTML
<button onClick={handleClick}>Submit</button>

// ✅ ARIA labels
<button aria-label="Delete item">
  <Trash2 aria-hidden="true" />
</button>

// ✅ Keyboard navigation
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter') handleClick()
  }}
>
  Click me
</div>
```

---

## Common Tasks

### Adding a New Page

1. Create page file in `app/` directory
   ```typescript
   // app/new-page/page.tsx
   export default function NewPage() {
     return <div>New Page</div>
   }
   ```

2. Add navigation link
   ```typescript
   <Link href="/new-page">New Page</Link>
   ```

3. Add tests
   ```typescript
   // app/new-page/__tests__/page.test.tsx
   describe('NewPage', () => {
     it('should render', () => {
       render(<NewPage />)
       expect(screen.getByText('New Page')).toBeInTheDocument()
     })
   })
   ```

### Adding a New Component

1. Create component file
   ```typescript
   // components/new-component.tsx
   interface Props {
     title: string
   }
   
   export function NewComponent({ title }: Props) {
     return <div>{title}</div>
   }
   ```

2. Add tests
   ```typescript
   // components/__tests__/new-component.test.tsx
   describe('NewComponent', () => {
     it('should render title', () => {
       render(<NewComponent title="Test" />)
       expect(screen.getByText('Test')).toBeInTheDocument()
     })
   })
   ```

### Adding a Server Action

1. Create action file
   ```typescript
   // lib/actions/new-action.ts
   'use server'
   
   import { z } from 'zod'
   
   const schema = z.object({
     name: z.string()
   })
   
   export async function newAction(data: unknown) {
     const validated = schema.parse(data)
     // Implementation
   }
   ```

2. Add tests
   ```typescript
   // lib/actions/__tests__/new-action.test.ts
   describe('newAction', () => {
     it('should validate input', async () => {
       await expect(newAction({})).rejects.toThrow()
     })
   })
   ```

### Adding a Custom Hook

1. Create hook file
   ```typescript
   // lib/hooks/use-custom-hook.ts
   export function useCustomHook() {
     const [state, setState] = useState()
     
     useEffect(() => {
       // Logic
     }, [])
     
     return { state, setState }
   }
   ```

2. Add tests
   ```typescript
   // lib/hooks/__tests__/use-custom-hook.test.ts
   describe('useCustomHook', () => {
     it('should initialize state', () => {
       const { result } = renderHook(() => useCustomHook())
       expect(result.current.state).toBeDefined()
     })
   })
   ```

---

## Troubleshooting

### Common Issues

#### TypeScript Errors

```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

#### Test Failures

```bash
# Run specific test
npm run test -- path/to/test.ts

# Run with coverage
npm run test:coverage

# Update snapshots
npm run test -- -u
```

#### Bundle Size Issues

```bash
# Analyze bundle
npm run build
npx webpack-bundle-analyzer .next/analyze/client.json
```

#### Accessibility Violations

```bash
# Run accessibility tests
npm run test:a11y

# Manual testing with screen reader
# macOS: VoiceOver (Cmd+F5)
# Windows: NVDA (free)
```

### Getting Help

1. **Check Documentation**: Start with docs in `/docs` folder
2. **Search Issues**: Look for similar issues in project tracker
3. **Ask Team**: Post in team chat or schedule pairing session
4. **Create Issue**: If it's a bug, create a detailed issue report

---

## Resources

### Internal Documentation

- [Optimization Patterns Guide](./optimization-patterns.md)
- [Code Review Checklist](./code-review-checklist.md)
- [Performance Monitoring Setup](./performance-monitoring-setup.md)

### External Resources

#### Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

#### React
- [React Documentation](https://react.dev)
- [React Hooks](https://react.dev/reference/react)
- [React Performance](https://react.dev/learn/render-and-commit)

#### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript with React](https://react-typescript-cheatsheet.netlify.app/)

#### Accessibility
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project](https://www.a11yproject.com/)

#### Performance
- [Web.dev Performance](https://web.dev/performance/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Vercel Best Practices](https://vercel.com/blog/react-best-practices)

#### Testing
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [jest-axe](https://github.com/nickcolley/jest-axe)

---

## Next Steps

Now that you're set up, here's what to do next:

1. **Explore the Codebase**: Browse through key files and components
2. **Run the Application**: Start the dev server and click around
3. **Pick a Starter Task**: Look for "good first issue" labels
4. **Read the Guides**: Review optimization patterns and best practices
5. **Join Team Meetings**: Attend standups and planning sessions
6. **Ask Questions**: Don't hesitate to reach out for help

Welcome to the team! 🎉

---

*Last Updated: February 2026*
*Version: 1.0.0*
