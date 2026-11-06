import { NextRequest, NextResponse } from "next/server";
import { handleWeatherRequest } from "@/netlify/functions/weather";

export const dynamic = "force-dynamic";

// The same handler serves Next dev/start and the existing Netlify deployment.
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  let sameOrigin = origin === request.nextUrl.origin;
  if (origin && !sameOrigin) {
    try {
      const parsed = new URL(origin);
      // Next normalizes the loopback hostname to localhost.
      if (["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname))
        parsed.hostname = "localhost";
      sameOrigin = parsed.origin === request.nextUrl.origin;
    } catch {
      /* The existing handler rejects an invalid Origin. */
    }
  }
  const result = await handleWeatherRequest({
    httpMethod: "GET",
    queryStringParameters: {
      lat: request.nextUrl.searchParams.get("lat") || "",
      lon: request.nextUrl.searchParams.get("lon") || "",
    },
    headers: {
      // Same-origin requests also work on a custom local development port.
      ...(origin && !sameOrigin ? { origin } : {}),
      "x-forwarded-for":
        request.headers.get("x-nf-client-connection-ip") ||
        request.headers.get("x-real-ip") ||
        request.headers.get("x-forwarded-for") ||
        "unknown",
    },
  });
  return new NextResponse(result.body, {
    status: result.statusCode,
    headers: result.headers,
  });
}
