import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  runReplicatePhase,
  type AiDb,
  type EdgeJob,
} from "../_shared/ai-guard";

function database(
  result: Record<string, unknown> = {},
  predictionId: string | null = null,
) {
  const job = {
    id: "job",
    user_id: "owner",
    status: "processing",
    result_json: result,
    prediction_id: predictionId,
  } as EdgeJob;
  const db = {
    from: () => {
      let changes: Record<string, unknown> | undefined;
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        is: () => query,
        update: (value: Record<string, unknown>) => {
          changes = value;
          return query;
        },
        maybeSingle: async () => {
          if (changes) Object.assign(job, changes);
          return { data: job, error: null };
        },
        then: (resolve: (value: unknown) => unknown) => {
          if (changes) Object.assign(job, changes);
          return Promise.resolve({ data: job, error: null }).then(resolve);
        },
      };
      return query;
    },
  } as unknown as AiDb;
  return { db, job };
}
const response = (value: unknown) => new Response(JSON.stringify(value));
beforeEach(() => {
  vi.stubGlobal("Deno", { env: { get: () => "synthetic-replicate-token" } });
  vi.mocked(fetch).mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("durable image provider phases", () => {
  it("records the model, version, and handle for each paid phase without repeating its POST", async () => {
    const { db, job } = database();
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        response({ id: "prediction-1", version: "pinned-version" }),
      )
      .mockResolvedValueOnce(
        response({
          id: "prediction-1",
          status: "succeeded",
          output: "https://replicate.delivery/output.png",
          metrics: { predict_time: 3 },
        }),
      );
    const output = await runReplicatePhase(
      db,
      job,
      "cleanup",
      "851-labs/background-remover",
      { image: "owned-image" },
      "pinned-version",
    );
    expect(output).toBe("https://replicate.delivery/output.png");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({ "Cancel-After": "60s" }),
    });
    expect(job.result_json?.phases).toMatchObject({
      cleanup: {
        model: "851-labs/background-remover",
        version: "pinned-version",
        predictionId: "prediction-1",
        status: "succeeded",
        predictSeconds: 3,
      },
    });
    await runReplicatePhase(
      db,
      job,
      "cleanup",
      "851-labs/background-remover",
      {},
      "pinned-version",
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("resumes an existing prediction with GET and refuses an ambiguous submission", async () => {
    const { db, job } = database({ phase: "cleanup" }, "existing-prediction");
    vi.mocked(fetch).mockResolvedValue(
      response({
        status: "succeeded",
        output: "https://replicate.delivery/output.png",
      }),
    );
    await runReplicatePhase(
      db,
      job,
      "cleanup",
      "851-labs/background-remover",
      {},
    );
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      "https://api.replicate.com/v1/predictions/existing-prediction",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBeUndefined();
    const ambiguous = database({ phase: "cleanup" });
    await expect(
      runReplicatePhase(
        ambiguous.db,
        ambiguous.job,
        "cleanup",
        "851-labs/background-remover",
        {},
      ),
    ).rejects.toThrow("AMBIGUOUS_PROVIDER_REQUEST");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("rejects output downloads from unrelated hosts", async () => {
    const { db, job } = database({ phase: "cleanup" }, "existing-prediction");
    vi.mocked(fetch).mockResolvedValue(
      response({
        status: "succeeded",
        output: "https://replicate.delivery.attacker.example/output.png",
      }),
    );
    await expect(
      runReplicatePhase(db, job, "cleanup", "851-labs/background-remover", {}),
    ).rejects.toThrow("INVALID_PROVIDER_OUTPUT");
  });
});
