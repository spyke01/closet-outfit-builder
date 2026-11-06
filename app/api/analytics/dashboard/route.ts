import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadAnalyticsDashboard } from "@/lib/services/analytics/dashboard";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const db = await createClient();
    const {
      data: { user },
      error,
    } = await db.auth.getUser();
    if (error || !user)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    return NextResponse.json(await loadAnalyticsDashboard(db, user.id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load your analytics. Please try again." },
      { status: 503 },
    );
  }
}
