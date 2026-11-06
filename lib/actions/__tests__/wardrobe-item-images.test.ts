import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  admin: vi.fn(),
  verify: vi.fn(),
  invoke: vi.fn(),
  owned: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));
vi.mock("../auth", () => ({ verifySession: mocks.verify }));
vi.mock("@/lib/services/billing/entitlements", () => ({
  resolveUserEntitlements: vi.fn().mockResolvedValue({
    effectivePlanCode: "plus",
    plan: {
      limits: { ai_image_generations_monthly: 30, ai_burst_per_hour: 5 },
    },
    usage: { ai_wardrobe_image_generations: 5 },
    period: { end: new Date("2026-12-01") },
  }),
}));
import { generateWardrobeItemImage } from "../wardrobe-item-images";
const itemId = "550e8400-e29b-41d4-a716-446655440001",
  requestId = "550e8400-e29b-41d4-a716-446655440002";
describe("wardrobe image action and Edge contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verify.mockResolvedValue({ id: "owner" });
    mocks.owned.mockResolvedValue({ data: { id: itemId }, error: null });
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: mocks.owned };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    mocks.client.mockResolvedValue({
      from: () => query,
      functions: { invoke: mocks.invoke },
      rpc: mocks.rpc,
    });
    const countQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      gte: vi.fn(),
      not: vi.fn().mockResolvedValue({ count: 1, error: null }),
    };
    for (const key of ["select", "eq", "gte"] as const)
      countQuery[key].mockReturnValue(countQuery);
    mocks.admin.mockReturnValue({ from: () => countQuery });
    mocks.invoke.mockResolvedValue({
      data: {
        success: true,
        image_url: "/api/clothing-images/owner/generated/image.png",
      },
      error: null,
    });
  });
  it("forwards the stable intent key and owned item to the authoritative Edge function", async () => {
    const result = await generateWardrobeItemImage({
      wardrobe_item_id: itemId,
      request_id: requestId,
    });
    expect(result).toMatchObject({
      success: true,
      image_url: expect.stringContaining("/generated/"),
      quota_remaining: { monthly: 25, hourly: 4 },
    });
    expect(mocks.invoke).toHaveBeenCalledWith("generate-wardrobe-item-image", {
      body: { wardrobe_item_id: itemId, requestId, is_retry: false },
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("returns the existing job for asynchronous generation", async () => {
    mocks.invoke.mockResolvedValue({
      data: { success: true, pending: true, job_id: requestId },
      error: null,
    });
    expect(
      await generateWardrobeItemImage({ wardrobe_item_id: itemId }),
    ).toMatchObject({
      success: true,
      pending: true,
      job_id: requestId,
      image_url: "",
    });
  });
  it.each([
    "PLAN_REQUIRED",
    "USAGE_LIMIT_EXCEEDED",
    "BURST_LIMIT_EXCEEDED",
    "RETRY_LIMIT_EXCEEDED",
    "MISSING_ITEM_DATA",
  ])("preserves a safe Edge denial for %s", async (code) => {
    mocks.invoke.mockResolvedValue({
      data: { success: false, error_code: code },
      error: null,
    });
    expect(
      await generateWardrobeItemImage({ wardrobe_item_id: itemId }),
    ).toMatchObject({ success: false, error_code: code });
  });
  it("does not contact Edge for a missing or foreign item", async () => {
    mocks.owned.mockResolvedValue({ data: null, error: null });
    expect(
      await generateWardrobeItemImage({ wardrobe_item_id: itemId }),
    ).toMatchObject({ success: false, error_code: "NOT_FOUND" });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("does not turn a transport error into a second generation attempt", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: { message: "Upstream timeout" },
    });
    expect(
      await generateWardrobeItemImage({ wardrobe_item_id: itemId }),
    ).toMatchObject({ success: false });
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
