# Contract: Assistant Chat API

## Endpoint: POST /api/assistant/chat

**New endpoint** — paid-only Sebastian chat with optional image input.

### Request

```json
{
  "threadId": "optional-uuid",
  "message": "What can I wear with my navy blazer tomorrow?",
  "imageUrl": "optional-supabase-image-url",
  "contextHints": {
    "focusItemId": "optional-wardrobe-item-id",
    "eventDate": "optional-YYYY-MM-DD",
    "tripId": "optional-trip-id"
  }
}
```

### Request Rules

- `message`: required, 1..2000 chars
- `threadId`: optional UUID; if absent, server creates thread
- `imageUrl`: optional; must match allowed storage origin/pattern
- `contextHints`: optional; each field validated independently

### Response

```json
{
  "threadId": "uuid",
  "assistantMessage": "Try the navy blazer with...",
  "citations": [
    { "type": "wardrobe_item", "id": "uuid" }
  ],
  "usage": {
    "model": "openai/gpt-5-mini",
    "inputTokens": 1250,
    "outputTokens": 280
  },
  "safety": {
    "blocked": false,
    "flags": []
  }
}
```

### Error Codes

| HTTP | Code | Meaning |
|------|------|---------|
| 401 | `AUTH_REQUIRED` | Unauthenticated request |
| 403 | `PLAN_REQUIRED` | Paid plan required |
| 403 | `SAFETY_BLOCKED` | Input/image blocked by policy |
| 404 | `THREAD_NOT_FOUND` | Thread does not exist or not owned |
| 429 | `USAGE_LIMIT_EXCEEDED` | Monthly quota exceeded |
| 429 | `BURST_LIMIT_EXCEEDED` | Hourly burst exceeded |
| 502 | `UPSTREAM_ERROR` | Provider call failed |
| 504 | `UPSTREAM_TIMEOUT` | Provider timed out |

### Side Effects

1. Creates/updates assistant thread
2. Inserts user message row
3. Inserts assistant message row when successful
4. Writes `assistant_inference_events` row
5. Increments usage counters for applicable metrics
