import { beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({
  handler: undefined as
    | ((request: Request) => Response | Promise<Response>)
    | undefined,
}));

vi.mock("https://deno.land/std@0.168.0/http/server.ts", () => ({
  serve: (handler: typeof runtime.handler) => {
    runtime.handler = handler;
  },
}));
vi.mock("https://esm.sh/@supabase/supabase-js@2.95.3", () => ({
  createClient: () => ({}),
}));

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("Deno", { env: { get: () => "synthetic-config" } });
});

describe("deployed image entry points", () => {
  for (const endpoint of ["process-image", "generate-wardrobe-item-image"]) {
    it(`${endpoint} handles OPTIONS, then authenticates a real POST`, async () => {
      if (endpoint === "process-image") await import("../process-image/index");
      else await import("../generate-wardrobe-item-image/index");
      const handler = runtime.handler!;
      const options = await handler(
        new Request("https://edge.example/" + endpoint, {
          method: "OPTIONS",
          headers: { Origin: "https://www.myaioutfit.com" },
        }),
      );
      expect(options.status).toBe(200);
      expect(options.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://www.myaioutfit.com",
      );
      const post = await handler(
        new Request("https://edge.example/" + endpoint, { method: "POST" }),
      );
      expect(post.status).toBe(401);
      expect(await post.json()).toMatchObject({
        success: false,
        error: "Authentication required",
      });
    });
  }

  it("returns HTTP 410 for the retired endpoint instead of an empty success", async () => {
    await import("../generate-outfit-image/index");
    const response = await runtime.handler!(
      new Request("https://edge.example/generate-outfit-image", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({
      error_code: "ENDPOINT_RETIRED",
    });
  });
});
