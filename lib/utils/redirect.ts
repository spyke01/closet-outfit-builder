const INTERNAL_REDIRECT_BASE = "http://localhost";

/**
 * Accepts only same-origin relative redirect paths and falls back safely.
 */
export function sanitizeInternalRedirectPath(
  value: string | null,
  fallback: string
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, INTERNAL_REDIRECT_BASE);
    if (parsed.origin !== INTERNAL_REDIRECT_BASE) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
