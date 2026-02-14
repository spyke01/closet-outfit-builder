# Security Best Practices Report

## Executive Summary
This Next.js + Supabase codebase has several strong patterns (runtime validation with Zod, authenticated data access in many routes, and dedicated security middleware), but there are critical auth-flow issues that should be fixed first. The most urgent risks are open redirects in auth callback/confirm routes, insecure session cookie settings, and excessive auth-flow logging. There are also medium-risk exposure issues in debug/health endpoints and CORS policy inconsistencies.

## Critical Findings

### SBP-001: Open redirect in auth callback route
- Severity: Critical
- Rule ID: NEXT-REDIRECT-001
- Location: `app/auth/callback/route.ts:14`, `app/auth/callback/route.ts:55`, `app/auth/callback/route.ts:56`
- Evidence:
  - `const next = searchParams.get('next') ?? '/today'`
  - `const redirectUrl = `${origin}${next}``
  - `const response = NextResponse.redirect(redirectUrl)`
- Impact: An attacker can craft a login URL with a malicious `next` value to redirect users to phishing destinations immediately after successful auth.
- Fix:
  - Accept only relative paths beginning with `/`.
  - Reject protocol-relative (`//...`) and absolute URLs.
  - Fallback to a safe path (`/today`) on invalid input.
- Mitigation: Add central `safeRedirectPath(next, fallback)` utility and use it in all auth routes.
- False positive notes: If this route is reachable publicly (typical OAuth callback), this is exploitable.

### SBP-002: Open redirect in auth confirm route
- Severity: Critical
- Rule ID: NEXT-REDIRECT-001
- Location: `app/auth/confirm/route.ts:31`, `app/auth/confirm/route.ts:45`
- Evidence:
  - `const next = searchParams.get("next") ?? "/";`
  - `redirect(next);`
- Impact: Email-confirmation links can be abused to redirect users to attacker-controlled pages after OTP verification.
- Fix:
  - Same redirect path validation as above.
  - Allowlist internal route prefixes only.
- Mitigation: Reuse shared redirect validator from callback route.
- False positive notes: This is exploitable if `next` comes from externally controlled URL parameters (it does).

## High Findings

### SBP-003: Auth session cookies are explicitly set as non-HttpOnly
- Severity: High
- Rule ID: NEXT-SESS-001
- Location: `app/auth/callback/route.ts:72`
- Evidence:
  - `httpOnly: false, // Allow client-side access for Supabase`
- Impact: Any XSS in the app can read session cookies directly, increasing account takeover risk.
- Fix:
  - Do not override Supabase cookie security options to `httpOnly: false`.
  - Keep `HttpOnly` enabled for session cookies and rely on server-side auth/session access patterns.
- Mitigation: Harden CSP and eliminate DOM injection sinks while cookie fix is rolled out.
- False positive notes: This is a direct insecure cookie configuration.

### SBP-004: Sensitive auth flow data is logged server-side
- Severity: High
- Rule ID: NEXT-LOG-001
- Location: `app/auth/callback/route.ts:16`, `app/auth/callback/route.ts:22`, `app/auth/callback/route.ts:110`, `app/auth/callback/route.ts:112`
- Evidence:
  - Logs include request URL and callback parameters (`url: request.url`, `next`, provider errors).
  - Logs include user identifiers/emails after auth.
- Impact: OAuth codes, user identifiers, and error context may leak via logs to operators or log processors, increasing lateral risk after log compromise.
- Fix:
  - Remove or heavily redact auth callback logs in production.
  - Never log full callback URLs or auth tokens/codes.
  - Use structured logging with explicit allowlisted fields.
- Mitigation: Configure log redaction in deployment logging pipeline.
- False positive notes: Risk depends on log access controls, but current logging is unnecessarily verbose for auth.

## Medium Findings

### SBP-005: Debug API endpoint exposes internal state and user data without explicit auth guard
- Severity: Medium
- Rule ID: NEXT-AUTH-001
- Location: `app/api/debug/supabase/route.ts:4`, `app/api/debug/supabase/route.ts:48`, `app/api/debug/supabase/route.ts:52`, `app/api/debug/supabase/route.ts:54`
- Evidence:
  - Public GET/POST handlers with no environment gate or authorization requirement.
  - Response may include `userId`, `userEmail`, query diagnostics, and DB error details.
- Impact: Attackers can enumerate operational details and, for authenticated users, retrieve potentially sensitive introspection output.
- Fix:
  - Disable this route in production (`404` or hard deny unless `NODE_ENV=development`).
  - Require admin authentication for any retained debug endpoint.
- Mitigation: Restrict by IP/network at edge if immediate code changes are delayed.
- False positive notes: If this endpoint is not deployed publicly, risk is reduced.

### SBP-006: Public environment health endpoint leaks deployment metadata and partial values
- Severity: Medium
- Rule ID: NEXT-SECRETS-001
- Location: `app/api/health/env/route.ts:3`, `app/api/health/env/route.ts:14`, `app/api/health/env/route.ts:24`, `app/api/health/env/route.ts:25`
- Evidence:
  - Endpoint returns env status, node environment, netlify flag, and partial variable values.
- Impact: Increases reconnaissance value for attackers and leaks unnecessary deployment context.
- Fix:
  - Restrict to authenticated/admin access or remove in production.
  - Return only boolean health without variable names/partials.
- Mitigation: Block route at edge firewall in production.
- False positive notes: Variables shown are public-prefixed, but endpoint still leaks useful operational intelligence.

### SBP-007: Overly permissive CORS in exposed functions
- Severity: Medium
- Rule ID: NEXT-CORS-001
- Location: `app/api/upload-image/route.ts:188`, `netlify/functions/weather.ts:117`
- Evidence:
  - `Access-Control-Allow-Origin: '*'` in both endpoints.
- Impact: Broadens cross-origin callable surface and weakens origin-based abuse controls.
- Fix:
  - Replace `*` with explicit allowlist from environment.
  - Limit allowed methods/headers to minimum needed.
- Mitigation: Add edge-level rate limiting and abuse detection.
- False positive notes: If endpoints are intentionally public with no credentials, severity remains medium due to abuse exposure rather than direct auth bypass.

## Low Findings

### SBP-008: Security headers strategy is inconsistent and CSP is overly permissive where used
- Severity: Low
- Rule ID: NEXT-CSP-001
- Location: `lib/middleware/security-middleware.ts:369`, `lib/middleware/security-middleware.ts:370`, `app/api/secure-example/route.ts:136`, `app/api/sizes/seed-categories/route.ts:101`
- Evidence:
  - CSP includes `'unsafe-inline' 'unsafe-eval'`.
  - This middleware is only applied on a small subset of API routes.
- Impact: Limited XSS defense-in-depth and inconsistent header coverage across the app.
- Fix:
  - Set security headers globally (proxy/middleware or platform headers).
  - Remove `unsafe-eval`; reduce `unsafe-inline` via nonce/hash strategy.
- Mitigation: Start with report-only CSP and tighten iteratively.
- False positive notes: Primary XSS prevention still depends on output handling; this is defense-in-depth.

### SBP-009: Sensitive local env file path is not explicitly ignored
- Severity: Low
- Rule ID: NEXT-SECRETS-001
- Location: `.gitignore:52`
- Evidence:
  - `.gitignore` excludes root `.env*` patterns but does not explicitly ignore `supabase/.env`.
- Impact: Risk of accidental secret commit from nested env files during routine git operations.
- Fix:
  - Add `supabase/.env` (and ideally `**/.env`) to `.gitignore`.
  - Add a pre-commit secret scanning hook.
- Mitigation: Use CI secret scanning (e.g., Gitleaks/TruffleHog) and block pushes on detection.
- False positive notes: Current sample indicates file is untracked now, but exposure risk remains operationally.

## Secure-by-Default Improvement Plan
1. Fix redirect validation in `app/auth/callback/route.ts` and `app/auth/confirm/route.ts` first.
2. Restore secure cookie defaults in callback flow (do not set `httpOnly: false`).
3. Remove or redact auth callback logging in production.
4. Disable/debug-gate `app/api/debug/supabase/route.ts` and `app/api/health/env/route.ts` in production.
5. Replace wildcard CORS with environment-driven strict allowlists.
6. Add global security headers and move toward strict CSP (without `unsafe-eval`).
7. Expand secret hygiene: ignore nested `.env` files and enforce automated secret scanning in CI.

## Notes
- Scope reviewed: Next.js app routes/API routes, middleware, Supabase edge CORS helper, and Netlify weather function.
- The report reflects code-visible controls only; platform-level protections (CDN/WAF/header injection) were not visible and should be verified at runtime.
