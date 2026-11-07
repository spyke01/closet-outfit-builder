import type { ClothingPieceIdentity } from "./clothing-piece-label";

export const SEBASTIAN_OPEN_EVENT = "sebastian:open";
export function openSebastian(
  prompt = "",
  contextHints: Record<string, unknown> = {},
  focusItem?: ClothingPieceIdentity,
) {
  window.dispatchEvent(
    new CustomEvent(SEBASTIAN_OPEN_EVENT, { detail: { prompt, contextHints, focusItem } }),
  );
}
