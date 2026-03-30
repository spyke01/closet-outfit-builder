import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ForwardQuerySchema = z.object({
  q: z.string().min(2).max(120),
});

const ReverseQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

const SAFE_QUERY = /[^A-Za-z0-9\s,.-]/g;

interface OpenWeatherGeoResult {
  name: string;
  lat: number;
  lon: number;
  country?: string;
  state?: string;
}

function toCandidate(entry: OpenWeatherGeoResult) {
  return {
    name: entry.name,
    country: entry.country || '',
    state: entry.state || '',
    lat: entry.lat,
    lon: entry.lon,
    label: [entry.name, entry.state, entry.country].filter(Boolean).join(', '),
  };
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-nf-client-connection-ip') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const url = new URL(request.url);
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Geocoding is not configured' }, { status: 503 });
    }

    const rawQuery = url.searchParams.get('q');
    const rawLat = url.searchParams.get('lat');
    const rawLon = url.searchParams.get('lon');

    if (rawQuery) {
      const parsed = ForwardQuerySchema.safeParse({ q: rawQuery });

      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid location query' }, { status: 400 });
      }

      const sanitizedQuery = parsed.data.q.replace(SAFE_QUERY, '').replace(/\s+/g, ' ').trim();
      if (!sanitizedQuery || sanitizedQuery.length < 2) {
        return NextResponse.json({ error: 'Location query is required' }, { status: 400 });
      }

      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(sanitizedQuery)}&limit=5&appid=${apiKey}`;
      const response = await fetch(geoUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to geocode location' }, { status: 502 });
      }

      const payload = (await response.json()) as OpenWeatherGeoResult[];
      const candidates = (payload || []).map(toCandidate);

      return NextResponse.json({
        query: sanitizedQuery,
        candidates,
        best: candidates[0] || null,
      });
    }

    const reverseParsed = ReverseQuerySchema.safeParse({
      lat: rawLat ?? '',
      lon: rawLon ?? '',
    });

    if (!reverseParsed.success) {
      return NextResponse.json({ error: 'Location query is required' }, { status: 400 });
    }

    const { lat, lon } = reverseParsed.data;
    const reverseUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
    const response = await fetch(reverseUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to geocode location' }, { status: 502 });
    }

    const payload = (await response.json()) as OpenWeatherGeoResult[];
    const candidates = (payload || []).map(toCandidate);
    return NextResponse.json({
      query: null,
      candidates,
      best: candidates[0] || null,
    });
  } catch {
    return NextResponse.json({ error: 'Unexpected geocoding error' }, { status: 500 });
  }
}
