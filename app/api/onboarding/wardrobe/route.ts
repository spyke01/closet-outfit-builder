import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSameOrigin } from "@/lib/utils/request-security";
import { CreateWardrobeItemFormSchema } from "@/lib/schemas";
import { aiRequestHash } from "@/lib/services/ai/jobs";
import { boundedJson, RequestBodyError } from "@/lib/utils/bounded-request";
const Input = z.object({
  requestKey: z.string().uuid(),
  items: z.array(CreateWardrobeItemFormSchema).min(1).max(200),
});
export async function POST(request: NextRequest) {
  const denied = requireSameOrigin(request);
  if (denied) return denied;
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    const parsed = Input.safeParse(await boundedJson(request, 262_144));
    if (!parsed.success)
      return NextResponse.json(
        { error: "Check your wardrobe selections." },
        { status: 400 },
      );
    const items = parsed.data.items.map((item) => ({
      category_id: item.category_id,
      name: item.name,
      color: item.color || null,
      formality_score: item.formality_score ?? 5,
      season: item.season || ["All"],
      image_url: item.image_url || null,
    }));
    // Onboarding uses only bundled representative assets; it never pays for images.
    if (
      items.some(
        (item) =>
          item.image_url &&
          !/^\/images\/wardrobe\/generated\/onboarding\/[a-z0-9-]+\.png$/.test(
            item.image_url,
          ),
      )
    )
      return NextResponse.json(
        { error: "Choose a default wardrobe image." },
        { status: 400 },
      );
    const { data, error } = await createAdminClient().rpc(
      "persist_onboarding_batch",
      {
        p_user_id: user.id,
        p_key: parsed.data.requestKey,
        p_hash: aiRequestHash(items),
        p_items: items,
      },
    );
    if (error)
      return NextResponse.json(
        {
          error:
            "Could not save these pieces. Check your wardrobe allowance and try again. Nothing from this batch was added.",
        },
        { status: 409 },
      );
    return NextResponse.json({ success: data, failed: 0, errors: [] });
  } catch (error) {
    if (error instanceof RequestBodyError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(
      {
        error:
          "Could not save your wardrobe. Your selections are still here. Retry to finish the same request.",
      },
      { status: 503 },
    );
  }
}
