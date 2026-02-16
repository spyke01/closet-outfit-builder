import type { NextRequest } from 'next/server';

function trimTrailingSlash(input: string): string {
  return input.replace(/\/+$/, '');
}

export function resolveAppUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

  if (forwardedHost) {
    return trimTrailingSlash(`${forwardedProto}://${forwardedHost}`);
  }

  const host = request.headers.get('host');
  if (host) {
    const isLocalhost = host.includes('localhost') || host.startsWith('127.0.0.1');
    const protocol = isLocalhost ? 'http' : 'https';
    return trimTrailingSlash(`${protocol}://${host}`);
  }

  if (request.nextUrl?.origin) {
    return trimTrailingSlash(request.nextUrl.origin);
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return trimTrailingSlash(process.env.NEXT_PUBLIC_APP_URL);
  }

  return 'http://localhost:3000';
}
