import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  start: vi.fn(),
  reserve: vi.fn(),
  context: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ upsert: vi.fn().mockResolvedValue({ error: null }) }),
  }),
}));
vi.mock("@/lib/services/billing/entitlements", () => ({
  resolveUserEntitlements: vi
    .fn()
    .mockResolvedValue({ effectivePlanCode: "plus" }),
}));
vi.mock("@/lib/services/assistant/context-builder", () => ({
  buildAssistantContextPack: mocks.context,
  summarizeContextForPrompt: () => "Owned wardrobe context",
}));
vi.mock("@/lib/services/assistant/provider", () => ({
  resolveAssistantConfig: () => ({ defaultModel: "gpt-6-luna" }),
}));
vi.mock("@/lib/services/ai/assistant-job", () => ({
  startAssistantJob: mocks.start,
  waitForAssistantJob: vi.fn((job) => job),
  assistantJobOutput: () => null,
}));
vi.mock("@/lib/services/ai/jobs", async (original) => ({
  ...(await original<typeof import("@/lib/services/ai/jobs")>()),
  aiJobByRequest: vi.fn().mockResolvedValue(null),
}));
import { AiJobError } from "@/lib/services/ai/jobs";
import { POST } from "../route";
const threadId = "00000000-0000-4000-8000-000000000010";
function request(body: unknown) {
  return new Request("https://example.com/api/assistant/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}
describe("assistant authoritative job guardrails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const chain = {
      select: vi.fn(),
      insert: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { id: threadId }, error: null }),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id: threadId }, error: null }),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    };
    for (const key of ["select", "insert", "eq", "order", "limit"] as const)
      chain[key].mockReturnValue(chain);
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "00000000-0000-4000-8000-000000000001" } },
        }),
      },
      from: () => chain,
    });
    mocks.context.mockResolvedValue({ pack: {} });
  });
  it.each([
    "USAGE_LIMIT_EXCEEDED",
    "BURST_LIMIT_EXCEEDED",
    "AI_BUDGET_EXCEEDED",
  ])("returns a safe 429 when the database guard denies %s", async (code) => {
    mocks.start.mockRejectedValue(new AiJobError(code));
    const response = await POST(
      request({ message: "Help me style a shirt" }) as never,
    );
    expect(response.status).toBe(429);
    expect((await response.json()).code).toBe(code);
    expect(mocks.start).toHaveBeenCalledTimes(1);
  });
  it("keeps the request key and owned thread scope when work is pending", async () => {
    const requestId = "00000000-0000-4000-8000-000000000020";
    mocks.start.mockResolvedValue({
      id: "job-1",
      status: "processing",
      scope_key: threadId,
      model: "gpt-6-luna",
    });
    const response = await POST(
      request({
        threadId,
        requestId,
        message: "Help me dress for work",
      }) as never,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      threadId,
      requestId,
      pending: true,
      jobId: "job-1",
    });
    expect(mocks.start).toHaveBeenCalledWith(
      expect.objectContaining({
        key: requestId,
        scope: threadId,
        task: "assistant_text",
      }),
    );
  });
  it("rejects oversized input before creating a job", async () => {
    const response = await POST(
      request({ message: "x".repeat(40000) }) as never,
    );
    expect(response.status).toBe(400);
    expect(mocks.start).not.toHaveBeenCalled();
  });
});
