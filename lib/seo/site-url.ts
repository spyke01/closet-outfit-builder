function normalizeAbsoluteUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  try {
    if (trimmedValue.startsWith('http://') || trimmedValue.startsWith('https://')) {
      return new URL(trimmedValue).origin;
    }

    return new URL(`https://${trimmedValue}`).origin;
  } catch {
    return null;
  }
}

export function getCanonicalSiteUrl(): string {
  const configuredUrl = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.NETLIFY_URL,
  ]
    .map((value) => normalizeAbsoluteUrl(value))
    .find((value): value is string => Boolean(value));

  return configuredUrl ?? 'http://localhost:3000';
}
