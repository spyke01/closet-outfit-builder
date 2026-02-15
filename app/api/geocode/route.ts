import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const QuerySchema = z.object({
  q: z.string().min(2).max(120),
});

const SAFE_QUERY = /[^A-Za-z0-9\s,.-]/g;

interface OpenWeatherGeoResult {
  name: string;
  lat: number;
  lon: number;
  country?: string;
  state?: string;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse({ q: url.searchParams.get('q') || '' });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid location query' }, { status: 400 });
    }

    const sanitizedQuery = parsed.data.q.replace(SAFE_QUERY, '').replace(/\s+/g, ' ').trim();
    if (!sanitizedQuery || sanitizedQuery.length < 2) {
      return NextResponse.json({ error: 'Location query is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Geocoding is not configured' }, { status: 503 });
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
    const candidates = (payload || []).map((entry) => ({
      name: entry.name,
      country: entry.country || '',
      state: entry.state || '',
      lat: entry.lat,
      lon: entry.lon,
      label: [entry.name, entry.state, entry.country].filter(Boolean).join(', '),
    }));

    return NextResponse.json({
      query: sanitizedQuery,
      candidates,
      best: candidates[0] || null,
    });
  } catch {
    return NextResponse.json({ error: 'Unexpected geocoding error' }, { status: 500 });
  }
}
