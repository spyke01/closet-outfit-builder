import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_FETCH_SITES = new Set(['same-origin', 'same-site', 'none']);

function normalizeOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function normalizeConfiguredOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return normalizeOrigin(trimmed);
  }

  return normalizeOrigin(`https://${trimmed}`);
}

function getAllowedOrigins(request: NextRequest): Set<string> {
  const allowed = new Set<string>([request.nextUrl.origin]);

  const configuredOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.NETLIFY_URL,
  ];

  for (const configured of configuredOrigins) {
    const normalized = normalizeConfiguredOrigin(configured);
    if (normalized) {
      allowed.add(normalized);
    }
  }

  for (const configured of (process.env.CORS_ALLOWED_ORIGINS || '').split(',')) {
    const normalized = normalizeConfiguredOrigin(configured);
    if (normalized) {
      allowed.add(normalized);
    }
  }

  return allowed;
}

export function requireSameOrigin(request: NextRequest): NextResponse | null {
  const origin = normalizeOrigin(request.headers.get('origin'));
  const refererOrigin = normalizeOrigin(request.headers.get('referer'));
  const allowedOrigins = getAllowedOrigins(request);

  const hasValidOrigin = Boolean(origin && allowedOrigins.has(origin));
  const hasValidReferer = Boolean(refererOrigin && allowedOrigins.has(refererOrigin));

  if (!hasValidOrigin && !hasValidReferer) {
    return NextResponse.json(
      { error: 'Invalid request origin', code: 'CSRF_ORIGIN_MISMATCH' },
      { status: 403 }
    );
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !ALLOWED_FETCH_SITES.has(fetchSite)) {
    return NextResponse.json(
      { error: 'Cross-site requests are not allowed', code: 'CSRF_CROSS_SITE_BLOCKED' },
      { status: 403 }
    );
  }

  return null;
}
