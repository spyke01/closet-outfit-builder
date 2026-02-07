# Project Structure & Architecture

## Directory Organization

```
app/                    # Next.js App Router (pages and layouts)
├── api/               # API routes (Next.js API handlers)
├── auth/              # Authentication pages and callbacks
├── wardrobe/          # Wardrobe management pages
├── outfits/           # Outfit collection and detail pages
├── anchor/            # Anchor-based outfit browsing
├── settings/          # User settings and preferences
├── protected/         # Protected route layouts
├── globals.css        # Global styles
├── layout.tsx         # Root layout component
└── page.tsx           # Homepage

components/             # React components (UI layer)
├── __tests__/         # Component tests
├── ui/                # Reusable UI components (Radix-based)
├── error-boundaries/  # Error boundary components
├── tutorial/          # Tutorial and onboarding components
└── *.tsx              # Feature-specific components

lib/                   # Shared utilities and business logic
├── hooks/             # Custom React hooks
├── supabase/          # Supabase client configuration
├── providers/         # React context providers
├── utils/             # Pure utility functions
├── types/             # TypeScript type definitions
├── schemas/           # Zod validation schemas
├── middleware/        # Next.js middleware
├── services/          # External API integrations
└── test/              # Test setup and utilities

supabase/              # Supabase backend configuration
├── functions/         # Edge Functions (Deno runtime)
├── migrations/        # Database migrations
└── supabase/          # Supabase CLI configuration

netlify/
└── functions/         # Netlify Functions (weather APIs)

public/                # Static assets
├── images/wardrobe/   # Wardrobe item images
├── android/           # Android PWA icons
├── ios/               # iOS PWA icons
├── windows11/         # Windows PWA icons
├── manifest.json      # PWA manifest
└── sw.js              # Service worker
```

## Component Architecture

### Component Categories

- **Layout Components**: `TopBar`, `SelectionStrip`, `NavigationButtons` (fixed positioning, responsive)
- **Display Components**: `OutfitDisplay`, `OutfitCard`, `OutfitList`, `ItemsGrid`, `OutfitFlatLayout`, `OutfitVisualLayout` (content presentation)
- **Interactive Components**: `CategoryDropdown`, `WeatherWidget`, `ThemeToggle`, `ImageUpload` (user interactions)
- **Form Components**: `LoginForm`, `SignUpForm`, `PreferencesForm`, `UpdatePasswordForm` (authentication and settings)
- **UI Components**: `Button`, `Card`, `Input`, `Label`, `Switch`, `Progress` (Radix-based primitives)
- **Utility Components**: `ScoreCircle`, `ScoreBreakdown`, `Logo`, `AuthWrapper` (reusable UI elements)
- **Error Boundaries**: `AuthErrorBoundary`, `SupabaseErrorBoundary`, `ValidationErrorBoundary` (error handling)

### Component Patterns

- **Props Interface**: Each component exports its own `Props` interface
- **Default Props**: Use default parameters in function signatures
- **Event Handlers**: Prefix with `on` (e.g., `onItemSelect`, `onCategorySelect`)
- **Conditional Rendering**: Use early returns for loading/error states
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints

## Data Architecture

### Core Types

- **WardrobeItem**: Individual clothing items with metadata (category, formality, capsule tags, user_id)
- **OutfitSelection**: Current user selection state (jacket, shirt, pants, shoes, belt, watch, tuck)
- **Outfit**: Complete outfit with score, source, and database persistence
- **Category**: Wardrobe categories with anchor item flags and user ownership
- **UserPreferences**: User settings and preferences stored in database
- **WeatherData**: Weather forecast data with error handling types

### Data Flow

1. **Database**: Supabase PostgreSQL with Row Level Security for user data isolation
2. **State Management**: TanStack Query for server state, Immer for immutable client state
3. **Validation**: Zod schemas for runtime type checking and API validation
4. **Authentication**: Supabase Auth with automatic user context
5. **API Data**: Next.js API routes and Supabase Edge Functions
6. **Caching**: TanStack Query in-memory caching with optimistic updates

## Hook Architecture

### Custom Hooks Pattern

- **useWardrobeItems**: TanStack Query hooks for wardrobe CRUD operations
- **useOutfits**: Outfit management with database persistence
- **useAuth**: Supabase authentication state and user management
- **useCategories**: Category management with user-specific data
- **useUserPreferences**: User settings with database synchronization
- **useWardrobeState**: Complex wardrobe state with Immer updates
- **Business Logic**: Keep complex logic in hooks, not components
- **Memoization**: Use `useMemo` and `useCallback` for expensive operations

### Hook Responsibilities

- **Data Fetching**: TanStack Query integration with Supabase
- **State Management**: Immer-based immutable state updates
- **Validation**: Zod schema validation in mutation hooks
- **Authentication**: User session and permission management
- **Caching**: Optimistic updates and cache invalidation strategies
- **Error Handling**: Structured error management with user feedback

## File Naming Conventions

- **Pages**: `page.tsx` for route pages, `layout.tsx` for layouts (Next.js App Router)
- **Components**: PascalCase (e.g., `OutfitCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useWardrobeItems.ts`)
- **API Routes**: `route.ts` for Next.js API handlers
- **Services**: camelCase with `Service` suffix (e.g., `weatherService.ts`)
- **Schemas**: camelCase with `Schema` suffix (e.g., `wardrobeItemSchema.ts`)
- **Types**: `database.ts` for Supabase types, descriptive names for specific types
- **Tests**: Same name as source file with `.test.tsx` or `.test.ts`
- **Edge Functions**: kebab-case directory names in `supabase/functions/`

## Import/Export Patterns

- **Named Exports**: Prefer named exports over default exports
- **Index Files**: Use for re-exporting from directories
- **Relative Imports**: Use relative paths within same directory level
- **Absolute Imports**: Use `@/` prefix for imports from root (configured in tsconfig.json)
- **Server Components**: Use `'use client'` directive for client components
- **Dynamic Imports**: Use Next.js dynamic imports for code splitting

## Responsive Design Architecture

### Breakpoint Strategy

- **Mobile First**: Base styles for mobile (320px+)
- **Tablet**: `md:` prefix (768px+)
- **Desktop**: `lg:` prefix (1024px+)
- **Touch Targets**: Minimum 44px for interactive elements

### Layout Patterns

- **Fixed Header**: TopBar with fixed positioning
- **Flexible Content**: Main content area with proper padding offsets
- **Grid Systems**: Responsive grids that adapt to screen size
- **Horizontal Scroll**: For mobile-optimized selection strips

## Testing Architecture

- **Unit Tests**: Individual component and utility function testing with Vitest
- **Integration Tests**: TanStack Query hooks, Supabase integration, authentication flows
- **Component Tests**: React Testing Library with mock Supabase client
- **API Tests**: Next.js API routes and Supabase Edge Functions
- **Database Tests**: Supabase RLS policies and data isolation
- **Performance Tests**: Image processing, background removal, and query optimization
- **Error Handling Tests**: Error boundaries, validation failures, and network errors
- **Accessibility Tests**: Keyboard navigation, screen reader compatibility, and WCAG compliance
- **Security Tests**: Authentication, authorization, and input validation