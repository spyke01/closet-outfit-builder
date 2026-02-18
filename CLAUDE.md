# closet-outfit-builder Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-13

## Active Technologies
- TypeScript 5.5+ (strict mode) + Deno (Edge Functions) + Next.js (App Router), React 19, Supabase JS, Replicate API, TanStack Query (002-mobile-camera-bg-removal)
- Supabase PostgreSQL + Supabase Storage (`wardrobe-images` bucket) (002-mobile-camera-bg-removal)
- TypeScript 5.5+ (strict mode) + Deno (Edge Functions) + Next.js (App Router), React 19, Supabase JS, Replicate API (google-deepmind/imagen-4), TanStack Query (004-wardrobe-item-image-generation)
- Supabase PostgreSQL + Supabase Storage (existing `wardrobe-images` bucket) (004-wardrobe-item-image-generation)

- TypeScript 5.5+ (strict mode) + Next.js (App Router), React 19, Supabase JS (001-onboarding-auth-gating)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.5+ (strict mode): Follow standard conventions

- 004-wardrobe-item-image-generation: Added TypeScript 5.5+ (strict mode) + Deno (Edge Functions) + Next.js (App Router), React 19, Supabase JS, Replicate API (google-deepmind/imagen-4), TanStack Query
- 002-mobile-camera-bg-removal: Added TypeScript 5.5+ (strict mode) + Deno (Edge Functions) + Next.js (App Router), React 19, Supabase JS, Replicate API, TanStack Query
- 001-onboarding-auth-gating: Added TypeScript 5.5+ (strict mode) + Next.js (App Router), React 19, Supabase JS

<!-- MANUAL ADDITIONS START -->
## UI Alert Styling Standard

- Use `Alert` + `AlertDescription` from `@/components/ui/alert` for user feedback messages.
- Do not render success/warning/error status as plain text paragraphs.
- Variant mapping:
  - Success confirmations: `variant="success"` + `CheckCircle`
  - Recoverable validation warnings: `variant="warning"` + `AlertCircle`
  - Failures/errors: `variant="destructive"` + `AlertCircle`
  - Informational notices: `variant="info"` + `AlertCircle`
- Keep alert copy concise and action-oriented, consistent with wardrobe add/edit/detail screens.
<!-- MANUAL ADDITIONS END -->
