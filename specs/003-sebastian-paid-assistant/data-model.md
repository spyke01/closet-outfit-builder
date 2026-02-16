# Data Model: Sebastian Paid AI Assistant (Chat + Vision)

## New Entity: assistant_threads

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| `id` | `uuid` | `gen_random_uuid()` | NO | Primary key |
| `user_id` | `uuid` | - | NO | Owner; references `auth.users(id)` |
| `title` | `text` | `NULL` | YES | Optional thread title |
| `created_at` | `timestamptz` | `now()` | NO | Creation timestamp |
| `updated_at` | `timestamptz` | `now()` | NO | Update timestamp |

Constraints:
- `title` length <= 120

Indexes:
- `idx_assistant_threads_user_created_at` on (`user_id`, `created_at DESC`)

## New Entity: assistant_messages

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| `id` | `uuid` | `gen_random_uuid()` | NO | Primary key |
| `thread_id` | `uuid` | - | NO | References `assistant_threads(id)` |
| `user_id` | `uuid` | - | NO | Owner for direct RLS filtering |
| `role` | `text` | - | NO | `user`, `assistant`, or `system` |
| `content` | `text` | - | NO | Message text |
| `image_url` | `text` | `NULL` | YES | Optional image reference |
| `metadata_json` | `jsonb` | `'{}'::jsonb` | NO | Safety/model/context metadata |
| `created_at` | `timestamptz` | `now()` | NO | Creation timestamp |

Constraints:
- `role` in (`user`, `assistant`, `system`)
- `char_length(content)` between 1 and 8000

Indexes:
- `idx_assistant_messages_thread_created_at` on (`thread_id`, `created_at ASC`)
- `idx_assistant_messages_user_created_at` on (`user_id`, `created_at DESC`)

## New Entity: assistant_inference_events

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| `id` | `uuid` | `gen_random_uuid()` | NO | Primary key |
| `user_id` | `uuid` | - | NO | Owner |
| `thread_id` | `uuid` | `NULL` | YES | Optional thread reference |
| `provider` | `text` | - | NO | `replicate` |
| `model` | `text` | - | NO | Routed model slug |
| `status` | `text` | - | NO | `succeeded`, `failed`, `blocked` |
| `latency_ms` | `integer` | `NULL` | YES | End-to-end inference latency |
| `input_tokens` | `integer` | `NULL` | YES | Input token usage |
| `output_tokens` | `integer` | `NULL` | YES | Output token usage |
| `cost_estimate_usd` | `numeric(10,6)` | `NULL` | YES | Estimated cost |
| `error_code` | `text` | `NULL` | YES | Normalized app error code |
| `safety_flags_json` | `jsonb` | `'{}'::jsonb` | NO | Input/output safety flags |
| `created_at` | `timestamptz` | `now()` | NO | Creation timestamp |

Constraints:
- `status` in (`succeeded`, `failed`, `blocked`)

Indexes:
- `idx_assistant_events_user_created_at` on (`user_id`, `created_at DESC`)
- `idx_assistant_events_model_created_at` on (`model`, `created_at DESC`)

## Usage Metrics (Existing `usage_counters`)

Add metric keys:
- `ai_stylist_messages`
- `ai_stylist_vision_messages`
- `ai_stylist_requests_hourly`

No schema change required; metrics are keyed by `metric_key`.

## RLS Policies

Enable RLS on all assistant tables.

Policy pattern:
- `SELECT/INSERT/UPDATE/DELETE` where `auth.uid() = user_id`
- For `assistant_messages`, enforce thread ownership match:
  - `EXISTS (SELECT 1 FROM assistant_threads t WHERE t.id = assistant_messages.thread_id AND t.user_id = auth.uid())`

## Migration SQL (proposed)

```sql
CREATE TABLE IF NOT EXISTS assistant_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NULL CHECK (title IS NULL OR char_length(title) <= 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES assistant_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 8000),
  image_url TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assistant_inference_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID NULL REFERENCES assistant_threads(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'blocked')),
  latency_ms INTEGER NULL,
  input_tokens INTEGER NULL,
  output_tokens INTEGER NULL,
  cost_estimate_usd NUMERIC(10,6) NULL,
  error_code TEXT NULL,
  safety_flags_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## TypeScript Type Additions

```typescript
export type AssistantRole = 'user' | 'assistant' | 'system';

export interface AssistantThread {
  id: string;
  user_id: string;
  title?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssistantMessage {
  id: string;
  thread_id: string;
  user_id: string;
  role: AssistantRole;
  content: string;
  image_url?: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}
```
