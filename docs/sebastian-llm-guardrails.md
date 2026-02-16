# Sebastian LLM Guardrails (OWASP-Aligned)

**Last updated**: 2026-02-16  
**Reference**: [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)

## Scope

This document defines guardrails for Sebastian chat requests in the current stack:

- Next.js route handlers (`/app/api/assistant/chat`)
- Supabase (auth, RLS, data access)
- Netlify runtime + CSP
- Replicate model adapter

## Threat Model Summary

Primary risks:

1. Prompt injection and system prompt exfiltration attempts.
2. Script/SSI payload insertion through user text or contextual data.
3. Prompt escaping and role-injection tricks (`system:`, model control tokens).
4. Model drift from unsafe prompt edits or unsupported model configuration changes.
5. Cross-user data leakage in wardrobe/calendar/trip context.

## Implemented Guardrails

### 1) Input Validation and Sanitization

File: `/Volumes/workplace/closet-outfit-builder/lib/services/assistant/moderation.ts`

- Explicitly allows normal punctuation and special characters used in style prompts, including: `& $ % ? . , - + #`.
- Blocks:
  - `<script>` tags
  - inline event handlers (e.g. `onload=`)
  - `javascript:` URIs
  - SSI directives (`<!--#include ... -->`, `<!--#exec ... -->`)
  - prompt escape/control tokens (`<|im_start|>`, etc.)
  - role injection (`system:`, `assistant:`, `developer:`)
- Removes control characters and normalizes whitespace before model composition.

### 2) Context Scrutiny and Minimization

File: `/Volumes/workplace/closet-outfit-builder/lib/services/assistant/context-builder.ts`

- All reads are scoped with `user_id = current user`.
- Context fields are sanitized before prompt assembly.
- Context is bounded by strict limits:
  - wardrobe: 50
  - outfits: 20
  - calendar: 30
  - trips: 10
- Calendar and trip contexts are narrowed using hint windows (`eventDate`, `tripId`) and upcoming-only defaults.

### 3) Prompt Configuration Integrity

File: `/Volumes/workplace/closet-outfit-builder/lib/services/assistant/persona.ts`

- Required system prompt clauses are validated at runtime.
- If required guardrail clauses are removed/changed, request fails with `CONFIG_ERROR`.

### 4) Model Configuration Integrity

File: `/Volumes/workplace/closet-outfit-builder/lib/services/assistant/providers/replicate.ts`

- Replicate model IDs are allowlisted.
- Unsupported model env configuration fails fast with `CONFIG_ERROR`.
- Adapter includes timeout + retry + circuit-breaker behavior for safer failure handling.

### 5) Access and Data Isolation

Files:

- `/Volumes/workplace/closet-outfit-builder/app/api/assistant/chat/route.ts`
- `/Volumes/workplace/closet-outfit-builder/app/api/assistant/threads/[id]/route.ts`

- Auth required for all endpoints.
- Paid plan gating enforced for Sebastian (`plus`, `pro`).
- Thread and message retrieval enforce ownership.
- Usage and burst limits reduce abuse cost and saturation risk.

## Regression Test Matrix

Prompt/model guardrails are locked with tests:

- `/Volumes/workplace/closet-outfit-builder/lib/services/assistant/__tests__/moderation.test.ts`
  - blocks script/SSI/prompt escape/role injection
  - preserves expected special-character inputs
- `/Volumes/workplace/closet-outfit-builder/lib/services/assistant/__tests__/persona.test.ts`
  - validates required system prompt clauses
- `/Volumes/workplace/closet-outfit-builder/lib/services/assistant/__tests__/replicate.test.ts`
  - validates model allowlist behavior
  - validates circuit-breaker behavior
- `/Volumes/workplace/closet-outfit-builder/lib/services/assistant/__tests__/context-builder.test.ts`
- `/Volumes/workplace/closet-outfit-builder/lib/services/assistant/__tests__/context-builder.calendar-trip.test.ts`
- `/Volumes/workplace/closet-outfit-builder/app/api/assistant/chat/__tests__/route.auth.test.ts`
- `/Volumes/workplace/closet-outfit-builder/app/api/assistant/chat/__tests__/route.usage.test.ts`
- `/Volumes/workplace/closet-outfit-builder/app/api/assistant/threads/[id]/__tests__/route.authz.test.ts`

## Change-Control Requirement

Any change to:

- Sebastian system prompt
- Replicate default/fallback model config
- input moderation patterns

must include passing targeted assistant guardrail tests before deploy.
