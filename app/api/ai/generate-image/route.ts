import { NextResponse } from "next/server";
/** Unused prompt-only endpoint: use the owned-item generation workflow. */
export async function POST() {
  return NextResponse.json(
    {
      error: "Create an image from a clothing item in your wardrobe.",
      code: "ENDPOINT_RETIRED",
    },
    { status: 410 },
  );
}
