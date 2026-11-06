import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: vi.fn(), start: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: vi.fn() }),
}));
vi.mock("@/lib/services/assistant/provider", () => ({
  resolveAssistantConfig: () => ({ defaultModel: "gpt-6-luna" }),
}));
vi.mock("@/lib/services/ai/assistant-job", () => ({
  startAssistantJob: mocks.start,
  waitForAssistantJob: vi.fn((job) => job),
  assistantJobOutput: () => null,
}));
import { AiJobError } from "@/lib/services/ai/jobs";
import { POST } from "../route";
const body = {
  eventType: "Work Day",
  stylePreset: "Smart Casual",
  formality: "smart",
  requestId: "00000000-0000-4000-8000-000000000001",
  weather: {
    isCold: false,
    isMild: true,
    isWarm: false,
    isHot: false,
    isRainLikely: false,
    dailySwing: 10,
    hasLargeSwing: false,
    targetWeight: 2,
    currentTemp: 65,
    highTemp: 70,
    lowTemp: 60,
    precipChance: 0.1,
  },
};
const request = () =>
  new Request("https://example.com/api/today/ai-outfit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
describe("Today AI guardrails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data: ["Shirt", "Pants", "Shoes"].map((name, i) => ({
            id: String(i),
            name,
            category: { name },
            active: true,
          })),
          error: null,
        }).then(resolve),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    mocks.client.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
      from: () => query,
    });
  });
  it("returns 401 before reserving or contacting a provider", async () => {
    mocks.client.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });
    expect((await POST(request() as never)).status).toBe(401);
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it.each(["USAGE_LIMIT_EXCEEDED", "AI_BUDGET_EXCEEDED", "AI_BUSY"])(
    "does not fall back around a denied %s reservation",
    async (code) => {
      mocks.start.mockRejectedValue(new AiJobError(code));
      const response = await POST(request() as never);
      expect(response.status).toBe(429);
      expect((await response.json()).code).toBe(code);
      expect(mocks.start).toHaveBeenCalledTimes(1);
    },
  );
  it("returns a resumable job instead of repeating a provider request", async () => {
    mocks.start.mockResolvedValue({ id: "job-1", status: "processing" });
    const response = await POST(request() as never);
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      pending: true,
      jobId: "job-1",
      requestId: body.requestId,
    });
    expect(mocks.start).toHaveBeenCalledWith(
      expect.objectContaining({ key: body.requestId, task: "today_outfit" }),
    );
  });
});
