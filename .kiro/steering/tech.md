# Technology Stack & Build System

## Core Technologies

- **Frontend Framework**: Next.js 15 with React 19 and TypeScript
- **Build Tool**: Next.js with Turbopack for fast development builds
- **Styling**: Tailwind CSS 4 with dark mode support (`darkMode: 'class'`)
- **Icons**: Lucide React
- **Testing**: Vitest with Testing Library and jsdom
- **Linting**: ESLint with Next.js config and TypeScript support

## Backend & Database

- **Full-Stack Framework**: Next.js App Router with API routes
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with email/password and Google OAuth
- **Storage**: Supabase Storage for image assets
- **Business Logic**: Supabase Edge Functions (Deno runtime)
- **State Management**: TanStack Query for server state, Immer for immutable updates
- **Validation**: Zod for runtime type validation and schema definition
- **External APIs**: 
  - OpenWeatherMap API (weather data)
- **API Security**: Server-side API key protection via Netlify Functions and Supabase RLS

## PWA & Performance

- **Service Worker**: Custom implementation for offline functionality
- **Manifest**: Web app manifest for PWA installation
- **Caching**: TanStack Query in-memory caching, Next.js automatic static optimization
- **SSR/ISR**: Server-side rendering and incremental static regeneration
- **Image Optimization**: Next.js Image component with Supabase Storage CDN

## Development Environment

### Common Commands

```bash
# Development
npm run dev                    # Next.js dev server with Turbopack (port 3000)
npm run dev:netlify           # Netlify dev with functions (port 8888) - RECOMMENDED for weather APIs

# Building & Testing
npm run build                 # Next.js production build
npm run start                 # Start production server
npm run test                 # Run tests in watch mode
npm run test:run             # Run tests once
npm run test:coverage        # Run tests with coverage report
npm run lint                 # ESLint code quality checks

# Accessibility & Quality Assurance
npm run lint:a11y            # Accessibility-specific linting
npm run test:a11y            # Accessibility compliance testing
npm run test:keyboard        # Keyboard navigation testing

# Data Generation
npm run generate:outfits     # Generate outfit combinations from wardrobe (legacy)

# Deployment Verification
npm run verify:build         # Build and test verification
npm run verify:local         # Test deployment locally
npm run verify:production    # Test production deployment

# Audit & Monitoring
npm run audit:continuous     # Continuous audit monitoring
npm run audit:pre-commit     # Pre-commit audit checks
npm run audit:setup-hooks    # Setup Git hooks for auditing
```

### Environment Setup

- Copy `.env.example` to `.env.local` for local development
- Configure Supabase environment variables (URL, anon key)
- Use `npm run dev` for Next.js development or `npm run dev:netlify` for weather APIs
- OpenWeatherMap API key required for weather features (optional)
- Set up Supabase project with database schema and RLS policies

## Key Dependencies

### Production
- `next`: latest (Next.js framework)
- `react` & `react-dom`: ^19.1.1
- `@supabase/supabase-js`: latest (Supabase client)
- `@supabase/ssr`: latest (Supabase SSR utilities)
- `@tanstack/react-query`: ^5.90.3 (server state management)
- `zod`: ^4.1.12 (runtime validation)
- `immer`: ^10.1.3 (immutable state updates)
- `lucide-react`: ^0.544.0 (icon library)
- `next-themes`: ^0.4.6 (theme management)
- `@radix-ui/*`: UI component primitives

### Development
- `typescript`: ^5.5.3
- `tailwindcss`: ^4.1.13
- `@tailwindcss/postcss`: ^4.1.13 (Tailwind 4 PostCSS plugin)
- `vitest`: ^3.2.4
- `@testing-library/react`: ^16.3.0
- `netlify-cli`: ^23.8.1
- `eslint`: ^9.9.1
- `eslint-config-next`: 15.3.1 (Next.js ESLint config)
- `eslint-plugin-jsx-a11y`: ^6.10.2 (accessibility linting)
- `@vitest/coverage-v8`: ^3.2.4 (test coverage)
- `typescript-eslint`: ^8.3.0

## Build Configuration

- **Next.js Config**: Optimized with Turbopack, package imports optimization, server external packages
- **TypeScript**: Strict mode enabled with Next.js plugin, path mapping for imports
- **Tailwind**: Content scanning for app/, components/, lib/ directories with dark mode class support
- **ESLint**: Next.js config with React hooks, TypeScript, and accessibility (jsx-a11y) plugins
- **Netlify**: Functions bundled with esbuild, Node 20 runtime, optimized headers and caching
- **Vitest**: Test environment with jsdom, global test utilities, and coverage reporting
- **Supabase**: Edge Functions with Deno runtime, database migrations, and RLS policies

## Theming Standard

This project uses a **semantic token-first theming system**. Treat direct color classes as exceptions, not defaults.

### Source of truth

- Theme tokens are defined in `app/globals.css` (CSS variables) and exposed in Tailwind via `@theme inline`.
- See `.kiro/steering/theming.md` for full implementation rules and examples.

### Required token usage

- Use semantic tokens for app UI:
  - `bg-background`, `bg-card`, `bg-muted`
  - `text-foreground`, `text-muted-foreground`
  - `border-border`
  - `bg-primary`, `text-primary-foreground`
  - `bg-secondary`, `text-secondary-foreground`
  - `ring-ring`
- Prefer semantic state tokens when applicable:
  - `text-destructive`, `bg-destructive/10`, `border-destructive/30`
  - `text-primary` for inline action links

### Prohibited patterns in app UI

- Do not use neutral scale theming classes: `slate-*`, `stone-*`, `gray-*`.
- Do not mix conflicting surface classes in one element:
  - `bg-white bg-card`
  - `bg-muted bg-card`
  - `bg-white bg-background`
- Do not rely on `dark:*` color overrides when semantic tokens already handle both themes.

### Active palette (reference)

- Dark mode (app interface):
  - `--background: #1A2830`
  - `--card: #233A45`
  - `--border: #2D4A58`
  - `--foreground: #E8F0F2`
  - `--primary: #D49E7C`
  - `--secondary: #5A97AC`
- Light mode (marketing/public):
  - `--background: #F1E2C4`
  - `--foreground: #231F20`
  - `--card: #FFFFFF`
  - `--border: #C8B895`
  - `--primary: #194957`
  - `--secondary: #D49E7C`

### Navigation/loading consistency requirement

- Any nav/top-bar fallback rendered during route transitions (for example Suspense skeletons) must use semantic nav surfaces (`bg-card`, `border-border`) to prevent flash-of-wrong-theme.

### Test alignment

- UI tests should assert semantic class usage and user-visible behavior, not legacy palette class names.

## Filtering Standard

Filter/search interfaces must follow the project filtering contract in:
- `.kiro/steering/filtering.md`

Required baseline:
- Always-visible primary search in toolbar
- Progressive disclosure for advanced filters
- Active filter chips + `Clear all`
- URL-synced filter state via App Router query params
