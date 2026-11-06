import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";
import { AiJobError } from "@/lib/services/ai/jobs";
const state = vi.hoisted(() => ({
  user: { id: "owner" } as { id: string } | null,
  paid: true,
  sign: vi.fn(),
  start: vi.fn(),
  wait: vi.fn(),
  categoryError: null as unknown,
}));
const categoryId = "11111111-1111-4111-8111-111111111111";
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: async () => ({
          data: [{ id: categoryId, name: "Shirt" }],
          error: state.categoryError,
        }),
      };
      return query;
    },
  }),
}));
vi.mock("@/lib/services/billing/entitlements", () => ({
  resolveUserEntitlements: async () => ({ isPaid: state.paid }),
}));
vi.mock("@/lib/services/ai/owned-image", () => ({
  signOwnedImage: (...args: unknown[]) => state.sign(...args),
}));
vi.mock("@/lib/services/assistant/provider", () => ({
  resolveAssistantConfig: () => ({ defaultModel: "gpt-6-luna" }),
}));
vi.mock("@/lib/services/ai/assistant-job", () => ({
  startAssistantJob: (...args: unknown[]) => state.start(...args),
  waitForAssistantJob: (...args: unknown[]) => state.wait(...args),
  assistantJobOutput: (job: { status: string; text?: string }) =>
    job.status === "succeeded" ? { text: job.text } : null,
}));
const request = (
  input: unknown = {
    requestId: categoryId,
    imageUrl: "/api/clothing-images/owner/photo.png",
  },
) =>
  new NextRequest("http://localhost/api/wardrobe/suggest-details", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
  });
beforeEach(() => {
  vi.clearAllMocks();
  state.user = { id: "owner" };
  state.paid = true;
  state.categoryError = null;
  state.sign.mockResolvedValue("https://owned.supabase.co/signed-photo");
  state.start.mockResolvedValue({ id: "job" });
  state.wait.mockResolvedValue({
    id: "job",
    status: "succeeded",
    text: JSON.stringify({
      name: "Blue shirt",
      category_id: categoryId,
      color: "blue",
    }),
  });
});
describe("protected clothing photo suggestions", () => {
  it("requires authentication and the existing paid vision access", async () => {
    state.user = null;
    expect((await POST(request())).status).toBe(401);
    state.user = { id: "owner" };
    state.paid = false;
    expect((await POST(request())).status).toBe(403);
    expect(state.start).not.toHaveBeenCalled();
  });
  it("rejects invalid requests and foreign images before reserving inference", async () => {
    expect(
      (await POST(request({ requestId: "invalid", imageUrl: "/photo" })))
        .status,
    ).toBe(400);
    state.sign.mockRejectedValue(new Error("not owned"));
    expect((await POST(request())).status).toBe(400);
    expect(state.start).not.toHaveBeenCalled();
  });
  it("binds one vision reservation to the stable request and owned photo", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(state.sign).toHaveBeenCalledWith(
      "/api/clothing-images/owner/photo.png",
      "owner",
    );
    expect(state.start).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "owner",
        task: "assistant_vision",
        key: categoryId,
        scope: "clothing-details",
        providerInput: expect.objectContaining({
          model: "gpt-6-luna",
          imageUrl: "https://owned.supabase.co/signed-photo",
        }),
      }),
    );
    expect(await response.json()).toMatchObject({
      suggestion: {
        name: "Blue shirt",
        category_id: categoryId,
        color: "blue",
      },
    });
  });
  it("fails closed on a denied quota or category query error", async () => {
    state.start.mockRejectedValue(new AiJobError("USAGE_LIMIT_EXCEEDED"));
    expect((await POST(request())).status).toBe(429);
    state.start.mockClear();
    state.categoryError = { message: "database unavailable" };
    expect((await POST(request())).status).toBe(503);
    expect(state.start).not.toHaveBeenCalled();
  });
  it("returns a resumable pending job and validates completed attributes", async () => {
    state.wait.mockResolvedValueOnce({ id: "job", status: "processing" });
    expect(await (await POST(request())).json()).toEqual({
      pending: true,
      jobId: "job",
    });
    state.wait.mockResolvedValueOnce({
      id: "job",
      status: "succeeded",
      text: "invalid output",
    });
    expect((await POST(request())).status).toBe(422);
  });
});
