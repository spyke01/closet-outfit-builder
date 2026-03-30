import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetch = vi.fn();

describe('Geocode API route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    process.env.OPENWEATHER_API_KEY = 'test-key';
  });

  it('returns reverse geocode results for lat/lon queries', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([
        {
          name: 'Providence Village',
          state: 'Texas',
          country: 'US',
          lat: 33.236,
          lon: -97.296,
        },
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/geocode?lat=33.236&lon=-97.296') as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.best).toMatchObject({
      name: 'Providence Village',
      state: 'Texas',
      country: 'US',
      label: 'Providence Village, Texas, US',
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/geo/1.0/reverse?lat=33.236&lon=-97.296'),
      expect.any(Object)
    );
  });

  it('keeps forward geocode behavior intact', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([
        {
          name: 'Rome',
          state: 'Lazio',
          country: 'IT',
          lat: 41.9,
          lon: 12.5,
        },
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/geocode?q=Rome') as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.query).toBe('Rome');
    expect(data.best.label).toBe('Rome, Lazio, IT');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/geo/1.0/direct?q=Rome'),
      expect.any(Object)
    );
  });
});
