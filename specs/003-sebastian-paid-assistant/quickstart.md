# Quickstart: Sebastian Paid AI Assistant (Chat + Vision)

## Prerequisites

1. Supabase project configured with billing migrations already applied
2. Replicate API token
3. Node.js 20+
4. Netlify local/dev environment or `npm run dev`

## Setup

### 1. Configure Environment Variables

Set in local `.env.local` and Netlify site env:

```bash
REPLICATE_API_TOKEN=r8_your_token_here
REPLICATE_DEFAULT_MODEL=openai/gpt-5-mini
REPLICATE_FALLBACK_MODEL=openai/gpt-4o-mini
```

Ensure existing billing env vars remain configured (Stripe keys, Supabase URL/keys).

### 2. Run Migrations

```bash
supabase db push
```

This applies assistant tables and any assistant usage-limit updates.

### 3. Start App

```bash
npm run dev
```

Or with Netlify local runtime:

```bash
npm run dev:netlify
```

## Validate Core Flows

### Paid Gating

1. Sign in as free user.
2. Call `POST /api/assistant/chat`.
3. Verify `403` with paid-feature code.

### Paid Text Chat

1. Sign in as paid user.
2. Send text prompt to `POST /api/assistant/chat`.
3. Verify response includes assistant text, model metadata, and usage updates.

### Wardrobe-Aware Response

1. Seed known wardrobe items for paid user.
2. Ask for pairings with a known item.
3. Verify recommendations reference only owned items.

### Vision Feedback

1. Upload an outfit image and send `imageUrl` in chat request.
2. Verify response returns feedback and optional wardrobe-linked suggestions.
3. Verify unsafe image is blocked with policy-safe message.

### Quota + Burst Limits

1. Exhaust monthly assistant metric for a test user.
2. Verify request returns `USAGE_LIMIT_EXCEEDED`.
3. Trigger burst limit in same hour.
4. Verify `BURST_LIMIT_EXCEEDED`.

## Key Files

| File | Purpose |
|------|---------|
| `app/api/assistant/chat/route.ts` | Main assistant endpoint with auth, limits, safety, provider call |
| `app/api/assistant/threads/[id]/route.ts` | Thread retrieval endpoint |
| `lib/services/assistant/context-builder.ts` | User-scoped wardrobe/outfit/calendar/trip context |
| `lib/services/assistant/providers/replicate.ts` | Model routing and provider adapter |
| `lib/services/assistant/moderation.ts` | Input/output guardrails |
| `lib/services/assistant/persona.ts` | Sebastian persona + system prompt composition |
| `docs/sebastian-personality.md` | Source-of-truth voice and behavior guide |
| `supabase/migrations/*assistant*` | Assistant tables, RLS, usage-related updates |
