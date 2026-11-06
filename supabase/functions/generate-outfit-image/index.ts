// Retired: the current application has no caller for this legacy endpoint.
// Deploy this stub as well as the hardened functions so an older deployed
// function cannot remain an unmetered paid-inference entry point.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  handleCorsPreflightRequest,
  createCorsResponse,
} from "../_shared/cors.ts";
serve(
  (request: Request) =>
    handleCorsPreflightRequest(request) ||
    createCorsResponse(
      JSON.stringify({
        success: false,
        error: "This image-generation endpoint has been retired.",
        error_code: "ENDPOINT_RETIRED",
      }),
      { status: 410, headers: { "Content-Type": "application/json" } },
      request.headers.get("origin") || undefined,
    ),
);
