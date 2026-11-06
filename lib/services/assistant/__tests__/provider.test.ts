import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAssistantPrediction,
  getAssistantPredictionStatus,
} from "../provider";
import type { AssistantProviderInput } from "../types";
const input: AssistantProviderInput = {
  model: "gpt-6-luna",
  systemPrompt: "Use only owned wardrobe pieces.",
  userPrompt: "Help me style a shirt.",
  history: [],
  context: {
    userId: "owner",
    wardrobe: [],
    recentOutfits: [],
    calendarWindow: [],
    trips: [],
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("OPENAI_API_KEY", "synthetic-provider-key");
  vi.stubEnv("AI_TEXT_PROVIDER", "openai");
  vi.stubEnv("OPENAI_TEXT_MODEL", "gpt-6-luna");
  vi.stubEnv("AI_MAX_OUTPUT_TOKENS", "1024");
});
afterEach(() => vi.unstubAllEnvs());
describe("bounded OpenAI adapter", () => {
  it("uses an allowlisted model with no tools, bounded output, and a resumable handle", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "resp_test", status: "queued" })),
    );
    expect(await createAssistantPrediction(input)).toEqual({
      id: "resp_test",
      model: "gpt-6-luna",
    });
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(JSON.parse(options!.body as string)).toMatchObject({
      model: "gpt-6-luna",
      tools: [],
      reasoning: { effort: "none" },
      max_output_tokens: 1024,
      background: true,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("preserves the latest question before trimming old history", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "resp_test", status: "queued" })),
    );
    const history = Array.from({ length: 30 }, (_, index) => ({
      role: "user" as const,
      content: `old-${index} ` + "x".repeat(9000),
    }));
    await createAssistantPrediction({
      ...input,
      userPrompt: "LATEST QUESTION: work outfit",
      history,
      systemPrompt: "z".repeat(20000),
    });
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.input.at(-1).content[0].text).toContain("LATEST QUESTION");
    expect(
      new TextEncoder().encode(body.instructions).length,
    ).toBeLessThanOrEqual(6000);
    expect(
      new TextEncoder().encode(JSON.stringify(body.input)).length,
    ).toBeLessThan(19000);
    expect(history).toHaveLength(30);
  });
  it("does not repeat a paid POST after an upstream HTTP failure", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("Unavailable", { status: 503 }),
    );
    await expect(createAssistantPrediction(input)).rejects.toThrow("503");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("retrieves the same response and returns text and token usage", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "resp_test",
          model: "gpt-6-luna",
          status: "completed",
          output: [
            {
              content: [{ type: "output_text", text: "Try your blue shirt." }],
            },
          ],
          usage: { input_tokens: 100, output_tokens: 8 },
        }),
      ),
    );
    expect(await getAssistantPredictionStatus("resp_test")).toMatchObject({
      status: "succeeded",
      text: "Try your blue shirt.",
      inputTokens: 100,
      outputTokens: 8,
    });
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "https://api.openai.com/v1/responses/resp_test",
    );
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBeUndefined();
  });
  it("rejects an unapproved model and malformed provider IDs before making a request", async () => {
    await expect(
      createAssistantPrediction({
        ...input,
        model: "unapproved/expensive-model",
      }),
    ).rejects.toThrow("Unsupported text model");
    await expect(
      getAssistantPredictionStatus("resp_test/../other"),
    ).rejects.toThrow("Invalid prediction");
    expect(fetch).not.toHaveBeenCalled();
  });
});
