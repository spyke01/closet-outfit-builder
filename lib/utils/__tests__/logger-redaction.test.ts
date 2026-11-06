import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../logger";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
describe("credential-safe logging", () => {
  it("removes configured secrets from messages and nested credential fields", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("OPENAI_API_KEY", "synthetic-server-secret-for-redaction");
    createLogger({ component: "test" }).error(
      "Provider echoed synthetic-server-secret-for-redaction",
      {
        headers: { Authorization: "Bearer synthetic-value" },
        apiKey: "private-value",
        inputTokens: 12,
      },
    );
    const value = String(log.mock.calls[0][0]);
    expect(value).not.toContain("synthetic-server-secret");
    expect(value).not.toContain("private-value");
    expect(value).not.toContain("synthetic-value");
    expect(value).toContain('"inputTokens":12');
  });
  it("handles errors and circular metadata without losing safe context", () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    const data: { name: string; self?: unknown } = { name: "test" };
    data.self = data;
    createLogger({ component: "test" }).warn(new Error("Request failed"), data);
    expect(log.mock.calls[0][0]).toContain("Request failed");
    expect(log.mock.calls[0][0]).toContain("[omitted]");
  });
});
