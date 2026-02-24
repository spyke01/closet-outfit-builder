import type { NextRequest } from 'next/server';

function trimTrailingSlash(input: string): string {
  return input.replace(/\/+$/, '');
}

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).origin;
    }
    return new URL(`https://${trimmed}`).origin;
  } catch {
    return null;
  }
}

function getConfiguredOrigins(): string[] {
  const configured = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.NETLIFY_URL,
  ];

  const extra = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const origins = [...configured, ...extra]
    .map((value) => normalizeOrigin(value))
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(origins));
}

function getHeaderOrigin(request: NextRequest): string | null {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return normalizeOrigin(`${forwardedProto}://${forwardedHost}`);
  }

  const host = request.headers.get('host');
  if (host) {
    const isLocalhost = host.includes('localhost') || host.startsWith('127.0.0.1');
    const protocol = isLocalhost ? 'http' : 'https';
    return normalizeOrigin(`${protocol}://${host}`);
  }

  return null;
}

export function resolveAppUrl(request: NextRequest): string {
  const configuredOrigins = getConfiguredOrigins();
  const preferredConfigured = configuredOrigins[0] || null;
  const requestOrigin = normalizeOrigin(request.nextUrl?.origin);
  const headerOrigin = getHeaderOrigin(request);
  const candidateOrigins = [requestOrigin, headerOrigin].filter((value): value is string => Boolean(value));

  for (const candidate of candidateOrigins) {
    if (configuredOrigins.includes(candidate)) {
      return trimTrailingSlash(candidate);
    }
  }

  if (preferredConfigured) {
    return trimTrailingSlash(preferredConfigured);
  }

  if (process.env.NODE_ENV !== 'production') {
    for (const candidate of candidateOrigins) {
      if (candidate) {
        return trimTrailingSlash(candidate);
      }
    }
  }

  return 'http://localhost:3000';
}
