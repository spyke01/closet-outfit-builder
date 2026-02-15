import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CspReportPayload = {
  "csp-report"?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let payload: CspReportPayload | Record<string, unknown> = {};

    if (contentType.includes("application/json") || contentType.includes("application/csp-report")) {
      payload = (await request.json()) as CspReportPayload | Record<string, unknown>;
    }

    if (process.env.NODE_ENV === "production") {
      console.warn("[CSP-REPORT]", JSON.stringify({
        receivedAt: new Date().toISOString(),
        userAgent: request.headers.get("user-agent"),
        report: "csp-report" in payload ? payload["csp-report"] : payload,
      }));
    }
  } catch {
    // Intentionally return 204 to avoid surfacing parsing details to clients.
  }

  return new NextResponse(null, { status: 204 });
}
