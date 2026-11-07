import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ client: vi.fn(), plan: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/services/billing/entitlements", () => ({ resolveUserEntitlements: mocks.plan }));
import { GET } from "../route";
const categoryId = "00000000-0000-4000-8000-000000000001";
const request = (search = "") => new NextRequest(`https://example.com/api/assistant/wardrobe-options?categoryId=${categoryId}${search}`);

describe("photo-board swap options", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.plan.mockResolvedValue({ effectivePlanCode: "pro" }); });
  it("requires authentication and paid Sebastian access before any wardrobe read", async () => {
    const from = vi.fn();
    mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) }, from });
    expect((await GET(request())).status).toBe(401); expect(from).not.toHaveBeenCalled();
    mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) }, from });
    mocks.plan.mockResolvedValue({ effectivePlanCode: "free" });
    expect((await GET(request())).status).toBe(403); expect(from).not.toHaveBeenCalled();
  });
  it("scopes paginated active-category choices to the owner and sanitizes filter grammar", async () => {
    const row = { id: "owned-piece", name: "Shirt", color: "white", image_url: "/photos/mine.jpg", category_id: categoryId };
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), or: vi.fn(), range: vi.fn().mockResolvedValue({ data: Array.from({ length: 25 }, () => row), error: null }) };
    for (const method of ["select", "eq", "order", "or"] as const) query[method].mockReturnValue(query);
    mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) }, from: () => query });
    const response = await GET(request("&page=1&search=white%2Cname.eq.evil"));
    expect(response.status).toBe(200);
    const payload = await response.json(); expect(payload.items).toHaveLength(24); expect(payload.hasMore).toBe(true);
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner"); expect(query.eq).toHaveBeenCalledWith("active", true); expect(query.eq).toHaveBeenCalledWith("category_id", categoryId);
    expect(query.range).toHaveBeenCalledWith(24, 48); expect(query.or).toHaveBeenCalledWith("name.ilike.%white name eq evil%,color.ilike.%white name eq evil%");
  });
  it("rejects malformed categories and unbounded pages", async () => {
    const from = vi.fn(); mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) }, from });
    expect((await GET(request("&page=99999"))).status).toBe(400); expect(from).not.toHaveBeenCalled();
  });
});
