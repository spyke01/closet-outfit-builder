import { describe, expect, it } from "vitest";
import { boundedJson } from "../bounded-request";
describe("bounded JSON requests", () => {
  it("accepts a normal request", async () => {
    expect(
      await boundedJson(
        new Request("https://example.com", {
          method: "POST",
          body: '{"ok":true}',
        }),
      ),
    ).toEqual({ ok: true });
  });
  it("rejects malformed JSON", async () => {
    await expect(
      boundedJson(
        new Request("https://example.com", { method: "POST", body: "{" }),
      ),
    ).rejects.toThrow("valid JSON");
  });
  it("bounds chunked requests without trusting content-length", async () => {
    await expect(
      boundedJson(
        new Request("https://example.com", {
          method: "POST",
          body: '"' + "x".repeat(50) + '"',
        }),
        20,
      ),
    ).rejects.toThrow("too large");
  });
});
