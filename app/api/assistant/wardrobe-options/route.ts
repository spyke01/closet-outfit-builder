import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resolveUserEntitlements } from "@/lib/services/billing/entitlements";
import { BOARD_ITEM_COLUMNS, boardItem } from "@/lib/services/assistant/outfit-boards";

export const dynamic = "force-dynamic";
const Schema = z.object({ categoryId: z.string().uuid(), search: z.string().max(60).default(""), page: z.coerce.number().int().min(0).max(100).default(0) });

export async function GET(request: NextRequest) {
  try {
    const db = await createClient();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const parsed = Schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return NextResponse.json({ error: "Invalid clothing filter" }, { status: 400 });
    const entitlements = await resolveUserEntitlements(db, user.id);
    if (entitlements.effectivePlanCode === "free") return NextResponse.json({ error: "Sebastian outfit boards are available on Plus and Pro." }, { status: 403 });
    const { categoryId, page } = parsed.data;
    const search = parsed.data.search.replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
    let query = db.from("wardrobe_items").select(BOARD_ITEM_COLUMNS).eq("user_id", user.id).eq("active", true).eq("category_id", categoryId).order("name").order("id");
    if (search) query = query.or(`name.ilike.%${search}%,color.ilike.%${search}%`);
    const result = await query.range(page * 24, page * 24 + 24);
    if (result.error) throw new Error("Unavailable");
    return NextResponse.json({ items: (result.data || []).slice(0, 24).map(boardItem), hasMore: (result.data?.length || 0) > 24 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load your clothing. Please try again." }, { status: 503 });
  }
}
