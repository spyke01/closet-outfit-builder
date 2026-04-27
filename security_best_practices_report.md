# Security Best Practices Audit Report

Date: 2026-04-25

## Executive Summary

I audited this TypeScript/Next.js/Supabase project across dependency advisories, request-facing API routes, Supabase edge functions, auth/user flows, storage, security headers, CSRF, and common frontend XSS/redirect sinks.

No hard-coded production secret was found in tracked files by pattern scan. The project has several good controls already: Supabase `auth.getUser()` is used for session validation, most mutating Next.js routes enforce same-origin checks, admin routes apply role/permission checks plus rate limiting, Stripe webhooks verify signatures, and Supabase RLS is broadly present in migrations.

The highest-priority issues are:

- **HIGH:** `process-image` Supabase edge function can mutate arbitrary wardrobe item records when a caller supplies another user's `itemId`.
- **HIGH:** `next` is within an npm advisory range for a Server Components denial of service.
- **HIGH:** `vite` is within npm advisory ranges for dev-server file-read/path traversal issues.
- **MEDIUM:** The wardrobe image bucket is public, making user-uploaded wardrobe/avatar images world-readable by URL.
- **MEDIUM:** CSP permits both `unsafe-inline` and `unsafe-eval`, reducing XSS containment.
- **MEDIUM:** Production monitoring ingestion accepts unauthenticated cross-origin POSTs in report-only CSRF mode, enabling telemetry/log pollution.

## Remediation Update

The follow-up security-fix pass remediated the high-severity findings and removed `unsafe-eval` from CSP:

- **H-1 fixed:** `process-image` now verifies `itemId` ownership before processing and scopes service-role updates by both item ID and authenticated user ID.
- **H-2 fixed:** `next` was upgraded to `^16.2.4`.
- **H-3 fixed:** `vite` was upgraded to `^6.4.2`.
- **M-2 partially fixed:** `unsafe-eval` was removed from `next.config.ts` and `netlify.toml`; `unsafe-inline` remains for a future nonce/hash migration.
- **M-4 fixed:** `postcss` was upgraded to `^8.5.10` and an npm override removes the nested vulnerable PostCSS copy.

Verification after remediation: `npm audit --json` reported 0 vulnerabilities, `npm run lint` passed, `npm run typecheck` passed, `npm run test:run` passed, and `npm run build` passed.

## Scope And Evidence

Reviewed:

- `package.json`, `package-lock.json`, `next.config.ts`, `netlify.toml`, `proxy.ts`
- `app/api/**/route.ts`
- `supabase/functions/**/index.ts`
- `supabase/migrations/*.sql`
- `lib/supabase/*`, `lib/utils/request-security.ts`, `lib/utils/redirect.ts`
- Auth callback/login/confirm pages and protected app routes
- Frontend sinks: `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `window.location`, storage

Commands run:

- `npm audit --json`
- Pattern scans with `rg` for auth, CSRF, redirects, DOM sinks, env/secrets, service-role usage, storage/RLS policies.

## High Severity

### H-1: Supabase Edge Function IDOR Via Service-Role Item Updates

**Rule ID:** API-AUTHZ-001  
**Location:** `supabase/functions/process-image/index.ts:443`, `supabase/functions/process-image/index.ts:470`, `supabase/functions/process-image/index.ts:504`  
**Evidence:**

```ts
if (itemId) {
  await supabase.from('wardrobe_items').update({
    bg_removal_status: 'completed',
    bg_removal_completed_at: new Date().toISOString(),
    image_url: publicUrl,
  }).eq('id', itemId);
}
```

The function authenticates the bearer token, but it creates Supabase with `SUPABASE_SERVICE_ROLE_KEY` and then updates `wardrobe_items` by `id` only. Later checks also query `wardrobe_items` by `id` only before updating `image_url`.

**Impact:** Any authenticated user who can directly invoke the Supabase function and guess/obtain a wardrobe item UUID can alter another user's item image/background-removal status. This bypasses RLS because the function uses service-role credentials.

**Fix:** Require ownership on every read/update using user scope:

```ts
.eq('id', itemId)
.eq('user_id', user.id)
```

Reject the request before processing if `itemId` is present and does not belong to the authenticated user. Consider using a non-service client where possible after auth verification.

**Mitigation:** Disable direct public invocation of this function if Supabase project settings allow it, or require an internal function secret in addition to user auth for service-role paths.

**False positive notes:** The Next.js wrapper currently does not forward `itemId`, but the edge function itself is request-facing and accepts it from form data.

### H-2: Next.js Server Components Denial-Of-Service Advisory

**Rule ID:** NEXT-SUPPLY-001  
**Location:** `package.json:92`, `package-lock.json` locked `next@16.1.6`  
**Evidence:** `npm audit --json` reports `GHSA-q4gf-8mx6-v5v3`, "Next.js has a Denial of Service with Server Components", range `>=16.0.0-beta.0 <16.2.3`.

**Impact:** An unauthenticated attacker may be able to trigger excessive resource consumption in affected Server Components behavior, causing availability loss.

**Fix:** Upgrade `next` to `>=16.2.3` and rebuild/test. Because this app uses Next 16 App Router and Server Components, treat this as production-relevant.

**Mitigation:** Ensure Netlify edge/platform request limits are enabled and monitor request spikes until upgraded.

### H-3: Vite Dev Server File Read Advisories

**Rule ID:** SUPPLY-DEV-001  
**Location:** `package.json:138`, `package-lock.json` locked vulnerable `vite` range  
**Evidence:** `npm audit --json` reports:

- `GHSA-p9ff-h696-f583`, arbitrary file read via Vite dev server WebSocket, range `>=6.0.0 <=6.4.1`
- `GHSA-4w7w-66w2-5vf9`, optimized deps `.map` path traversal, range `<=6.4.1`

**Impact:** If a Vite-powered dev server is exposed to an untrusted network, attackers may read local files. This is generally not production-impacting unless dev/preview servers are reachable.

**Fix:** Upgrade `vite` to a patched release and keep local dev servers bound to localhost.

**Mitigation:** Do not expose `vite preview`, Storybook, or other Vite dev servers publicly.

## Medium Severity

### M-1: Public Wardrobe Image Bucket Exposes User Uploads By URL

**Rule ID:** STORAGE-PRIVACY-001  
**Location:** `supabase/migrations/20260215181500_create_wardrobe_images_bucket.sql:2`, `supabase/migrations/20260215181500_create_wardrobe_images_bucket.sql:6`  
**Evidence:**

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('wardrobe-images', 'wardrobe-images', true, ...)
```

**Impact:** Uploaded wardrobe images and avatars are publicly readable if their object URL is known. For a wardrobe/personal style app, clothing photos can be sensitive personal data even if object paths include UUIDs.

**Fix:** Make the bucket private and serve images through signed URLs or an authenticated image proxy. If public access is a product decision, document it clearly in privacy/security docs and avoid using public URLs for avatars or user-private wardrobe images.

**Mitigation:** Use non-guessable object paths, avoid indexing, and add deletion/retention controls. These reduce but do not remove public-read risk.

### M-2: CSP Allows `unsafe-inline` And `unsafe-eval`

**Rule ID:** REACT-CSP-001  
**Location:** `next.config.ts:4`, `next.config.ts:6`, `netlify.toml:71`  
**Evidence:**

```ts
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com"
```

**Impact:** If an XSS injection point is introduced later, the CSP provides much weaker containment because inline scripts and string evaluation are allowed.

**Fix:** Move toward nonce/hash-based scripts and remove `unsafe-eval` first. If Google Tag Manager requires inline support, isolate and document the required nonce/hash strategy.

**Mitigation:** Keep React escaping defaults, avoid raw HTML sinks, and add automated checks for `dangerouslySetInnerHTML`, `innerHTML`, and `new Function`.

### M-3: Monitoring Ingestion Accepts Unauthenticated Cross-Origin POSTs

**Rule ID:** API-INGEST-001  
**Location:** `app/api/monitoring/route.ts:146`, `app/api/monitoring/route.ts:151`, `app/api/monitoring/route.ts:155`  
**Evidence:**

```ts
if (!hasValidIngestionToken) {
  const sameOriginError = requireSameOriginWithOptions(request, {
    mode: 'report',
    protectMethods: ['POST'],
    reasonTag: 'monitoring_ingest',
  });
}
```

The endpoint rate-limits in memory, validates shape, then logs/sends telemetry in production. Cross-origin browser requests without the ingestion token are only reported, not rejected.

**Impact:** Attackers can pollute logs/analytics, consume monitoring quota, trigger outbound monitoring calls, and create noise that hides real incidents.

**Fix:** Enforce same-origin or require `MONITORING_INGESTION_TOKEN` for production ingestion. Browser beacons can use a short-lived endpoint token or a stricter schema plus origin enforcement.

**Mitigation:** Lower the unauthenticated rate limit, drop high-cardinality fields, and avoid forwarding unauthenticated events to paid third-party sinks.

### M-4: PostCSS XSS Advisory

**Rule ID:** SUPPLY-XSS-001  
**Location:** `package.json:132`, `package-lock.json` locked vulnerable `postcss` range  
**Evidence:** `npm audit --json` reports `GHSA-qx2v-qp2m-jg93`, "PostCSS has XSS via Unescaped </style> in its CSS Stringify Output", range `<8.5.10`.

**Impact:** Risk depends on whether attacker-controlled CSS is stringified into HTML/style contexts. I did not find an obvious user-CSS feature, so this is lower exploitability here than the Next advisory.

**Fix:** Upgrade `postcss` to `>=8.5.10` and ensure transitive `next/node_modules/postcss` is also patched through the Next upgrade.

## Low Severity / Hardening

### L-1: Local `.env` Files Exist

**Rule ID:** SECRETS-HYGIENE-001  
**Location:** workspace root `.env.local`, `supabase/.env`  
**Evidence:** `find` located `.env.local` and `supabase/.env`; `git ls-files` only showed `.env.example`, so these files do not appear tracked.

**Impact:** Low as long as they remain untracked. Local secrets are still easy to leak through logs, zips, support bundles, or accidental commits.

**Fix:** Ensure `.gitignore` covers `.env*` and `supabase/.env`. Do not print their values in scripts.

### L-2: Debug Route Is Development-Gated But Verbose

**Rule ID:** DEBUG-001  
**Location:** `app/api/debug/supabase/route.ts:4`, `app/api/debug/supabase/route.ts:31`, `app/api/debug/supabase/route.ts:121`  
**Evidence:** The route returns 404 when `NODE_ENV === 'production'`, but in non-production it returns database error details and user IDs.

**Impact:** Low if staging/dev are private. If a non-production deployment is public and has real data, this leaks operational details to authenticated users.

**Fix:** Keep non-production deployments access-controlled, or require an admin role for debug endpoints.

## Positive Findings

- Most mutating Next.js API routes call `requireSameOrigin` / `requireSameOriginWithOptions`.
- Admin API routes check authenticated users and admin permissions before service-role reads/writes.
- Stripe webhook route verifies `stripe-signature`.
- Redirects from auth callbacks use `sanitizeInternalRedirectPath`, preventing open redirects.
- Supabase migrations generally enable RLS and user-scoped policies.
- Upload handlers validate MIME type and magic bytes before processing.
- No tracked real secrets were found by pattern scan; examples/test placeholders were present only in docs/tests.

## Recommended Remediation Order

1. Fix `supabase/functions/process-image/index.ts` ownership checks for every `itemId` read/update.
2. Upgrade `next`, `vite`, and `postcss`; rerun `npm audit`.
3. Decide whether wardrobe images should be public. If private by intent, convert the bucket to private and implement signed URL access.
4. Change production monitoring ingestion from CSRF report-only to enforce/token-required.
5. Tighten CSP by removing `unsafe-eval`, then replacing `unsafe-inline` with nonces/hashes where practical.
