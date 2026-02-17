import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';

const ALLOWED_FETCH_SITES = new Set(['same-origin', 'same-site', 'none']);
const log = createLogger({ component: 'request-security' });

export type CsrfMode = 'off' | 'report' | 'enforce';

interface RequireSameOriginOptions {
  mode?: CsrfMode;
  protectMethods?: ReadonlyArray<string>;
  reasonTag?: string;
}

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
  const requestUrlOrigin = normalizeOrigin(
    request.nextUrl?.origin ??
    ((request as { url?: string }).url ?? null)
  );
  const allowed = new Set<string>();
  if (requestUrlOrigin) {
    allowed.add(requestUrlOrigin);
  }

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
  return requireSameOriginWithOptions(request);
}

export function requireSameOriginWithOptions(
  request: NextRequest,
  options: RequireSameOriginOptions = {}
): NextResponse | null {
  if (process.env.NODE_ENV === 'test' && !options.mode) {
    return null;
  }

  const mode = options.mode ?? ((process.env.SECURITY_CSRF_MODE as CsrfMode | undefined) || 'enforce');
  if (mode === 'off') {
    return null;
  }

  const protectMethods = options.protectMethods ?? ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!protectMethods.includes(request.method.toUpperCase())) {
    return null;
  }

  const origin = normalizeOrigin(request.headers.get('origin'));
  const refererOrigin = normalizeOrigin(request.headers.get('referer'));
  const allowedOrigins = getAllowedOrigins(request);

  const hasValidOrigin = Boolean(origin && allowedOrigins.has(origin));
  const hasValidReferer = Boolean(refererOrigin && allowedOrigins.has(refererOrigin));
  const requestPath = (() => {
    if (request.nextUrl?.pathname) return request.nextUrl.pathname;
    try {
      return new URL((request as { url?: string }).url || '').pathname;
    } catch {
      return 'unknown';
    }
  })();

  if (!hasValidOrigin && !hasValidReferer) {
    const metadata = {
      reason: 'origin_mismatch',
      method: request.method,
      path: requestPath,
      origin,
      refererOrigin,
      allowedOrigins: [...allowedOrigins],
      tag: options.reasonTag || 'csrf',
    };
    if (mode === 'report') {
      log.warn('CSRF would block request', metadata);
      return null;
    }

    return NextResponse.json(
      { error: 'Invalid request origin', code: 'CSRF_ORIGIN_MISMATCH' },
      { status: 403 }
    );
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !ALLOWED_FETCH_SITES.has(fetchSite)) {
    const metadata = {
      reason: 'fetch_site_block',
      method: request.method,
      path: requestPath,
      fetchSite,
      tag: options.reasonTag || 'csrf',
    };
    if (mode === 'report') {
      log.warn('CSRF would block request', metadata);
      return null;
    }

    return NextResponse.json(
      { error: 'Cross-site requests are not allowed', code: 'CSRF_CROSS_SITE_BLOCKED' },
      { status: 403 }
    );
  }

  return null;
}
