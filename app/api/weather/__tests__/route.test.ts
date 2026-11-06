import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";
const request = (query = "?lat=41.88&lon=-87.63", origin?: string) =>
  new NextRequest("http://127.0.0.1:3001/api/weather" + query, {
    headers: origin ? { origin } : {},
  });
beforeEach(() => {
  vi.mocked(fetch).mockReset();
  vi.stubEnv("OPENWEATHER_API_KEY", "synthetic-weather-private-key");
});
afterEach(() => vi.unstubAllEnvs());
describe("weather in Next dev and start", () => {
  it("serves the existing weather contract through /api/weather on a custom local port", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          timezone: "America/Chicago",
          current: {
            dt: 1793980800,
            temp: 58,
            feels_like: 56,
            pressure: 1012,
            humidity: 50,
            wind_speed: 8,
            weather: [
              { main: "Clouds", description: "partly cloudy", icon: "02d" },
            ],
          },
          daily: [
            {
              dt: 1793980800,
              temp: { max: 62, min: 48 },
              pop: 0.2,
              weather: [
                { main: "Clouds", description: "partly cloudy", icon: "02d" },
              ],
            },
          ],
        }),
      ),
    );
    const response = await GET(request(undefined, "http://127.0.0.1:3001"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      current: { temperature: 58 },
      forecast: [
        { temperature: { high: 62, low: 48 }, precipitationProbability: 0.2 },
      ],
    });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("rejects invalid coordinates and unrelated origins without a provider call", async () => {
    expect((await GET(request("?lat=91&lon=0"))).status).toBe(400);
    expect(
      (await GET(request(undefined, "https://unrelated.example"))).status,
    ).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns a clear configuration failure instead of the local Netlify 404", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "");
    const response = await GET(request());
    expect(response.status).toBe(500);
    expect((await response.json()).error).toContain("configuration");
    expect(fetch).not.toHaveBeenCalled();
  });
});
