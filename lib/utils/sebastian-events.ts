export const SEBASTIAN_OPEN_EVENT = "sebastian:open";
export function openSebastian(
  prompt = "",
  contextHints: Record<string, unknown> = {},
) {
  window.dispatchEvent(
    new CustomEvent(SEBASTIAN_OPEN_EVENT, { detail: { prompt, contextHints } }),
  );
}
