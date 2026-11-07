export type AssetPhase = {
  state: string;
  reservedUsd: number;
  id?: string;
  version?: string;
  error?: string;
  predictSeconds?: number;
  estimatedUsd?: number;
  output?: string;
};
type CostRow = { generate?: AssetPhase; cleanup?: AssetPhase };

export function reservedAssetCost(rows: CostRow[]) {
  return rows.reduce(
    (sum, row) =>
      sum + (row.generate?.reservedUsd || 0) + (row.cleanup?.reservedUsd || 0),
    0,
  );
}

export function reserveAssetPhase(
  rows: CostRow[],
  row: CostRow,
  kind: "generate" | "cleanup",
  ceiling: number,
  budget: number,
) {
  if (row[kind]) return row[kind]!;
  if (
    ![ceiling, budget].every(Number.isFinite) || ceiling <= 0 || budget <= 0 ||
    reservedAssetCost(rows) + ceiling > budget + 1e-9
  ) {
    throw Error("Batch admission budget reached");
  }
  // Synchronous mutation makes another worker see this reservation before I/O.
  return row[kind] = { state: "queued", reservedUsd: ceiling };
}

export function canSubmitAssetPhase(phase: AssetPhase) {
  return !phase.id && ["queued", "rate_limited"].includes(phase.state);
}

export function assetRetryDelay(
  value: unknown,
  detail: string,
  attempt: number,
  now = Date.now(),
) {
  const numeric = Number(value);
  const headerDelay = value && Number.isFinite(numeric)
    ? numeric * 1000
    : typeof value === "string" && Number.isFinite(Date.parse(value))
    ? Date.parse(value) - now
    : undefined;
  const reset = detail.match(/resets?\s+(?:in\s+)?~?(\d+(?:\.\d+)?)s/i);
  const delay = headerDelay ??
    (reset
      ? Number(reset[1]) * 1000
      : Math.min(60_000, 5000 * 2 ** Math.min(attempt, 4)));
  return Math.max(1250, delay) + 250;
}
