# Technology Stack & Build System

## Core Technologies

- **Frontend Framework**: Next.js 15 with React 19 and TypeScript
- **Build Tool**: Next.js with Turbopack for fast development builds
- **Styling**: Tailwind CSS 4 with CSS custom properties in `app/globals.css` and dark-by-default theming via `html[data-theme="light"]`
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
- **Tailwind**: Content scanning for app/, components/, lib/ directories with Liquid Glass tokens surfaced through CSS variables
- **ESLint**: Next.js config with React hooks, TypeScript, and accessibility (jsx-a11y) plugins
- **Netlify**: Functions bundled with esbuild, Node 20 runtime, optimized headers and caching
- **Vitest**: Test environment with jsdom, global test utilities, and coverage reporting
- **Supabase**: Edge Functions with Deno runtime, database migrations, and RLS policies

## Theming Standard

This project uses the Apple Liquid Glass system. Shared tokens and shell primitives are the source of truth.

### Source of truth

- Theme tokens are defined in `app/globals.css` (CSS variables) and exposed in Tailwind via `@theme inline`.
- See `.kiro/steering/theming.md` for full implementation rules and examples.

### Required token usage

- Prefer Liquid Glass tokens directly for product UI:
  - `--bg-deep`, `--bg-base`, `--bg-surface`, `--bg-surface-hover`, `--bg-surface-active`, `--bg-input`
  - `--border-subtle`, `--border-default`, `--border-strong`, `--border-focus`
  - `--text-1`, `--text-2`, `--text-3`
  - `--accent`, `--accent-muted`, `--accent-2`, `--accent-2-muted`, `--accent-3`, `--accent-3-muted`
  - `--radius-*`, `--space-*`, `--blur-glass`, `--blur-nav`
- Older semantic aliases such as `bg-card`, `bg-background`, `bg-muted`, and `border-border` remain compatibility helpers during migration, but they are not the final visual spec by themselves.

### Prohibited patterns in app UI

- Do not use legacy palette values as current guidance.
- Do not assume class-based dark mode such as `.dark` or `darkMode: 'class'`.
- Do not wrap every toolbar or filter area in an extra glass card by default.
- Do not create card-within-card stacks unless the nested surface communicates a real hierarchy.
- Do not rely on generated CSS alone when a critical visual rule is known to be unstable in local builds.

### Navigation/loading consistency requirement

- Any nav/top-bar fallback rendered during route transitions (for example Suspense skeletons) must match the shared Liquid Glass nav treatment so the app does not flash an older theme surface.

### Test alignment

- UI tests should assert shared shell primitives, selected states, and user-visible behavior, not obsolete palette recipes.

### AI icon consistency requirement

- Use `components/ai-icon.tsx` (`AIIcon`) as the single icon for AI-related CTAs and AI-originated alerts.
- Do not use `AIIcon` on generic submit/save/update buttons or cancel/close/back actions.
- For full usage rules, see `.kiro/steering/theming.md` section "AI affordance icon standard".

### Button-system consistency requirement

- All product views must follow the hierarchy in `.kiro/steering/theming.md`:
  - primary (state-changing),
  - secondary (supporting),
  - tertiary (contextual/icon-only).
- State/mode toggles must use segmented controls (shared container with active/inactive segments).
- Save/commit actions should be disabled until changes are detected (dirty state), then enabled with clear feedback.

## Filtering Standard

Filter/search interfaces must follow the project filtering contract in:
- `.kiro/steering/filtering.md`

Required baseline:
- Always-visible primary search in toolbar
- Progressive disclosure for advanced filters
- Highlighted selected tags/facets in place
- URL-synced filter state via App Router query params
