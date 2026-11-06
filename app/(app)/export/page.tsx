import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveUserEntitlements } from "@/lib/services/billing/entitlements";
import { PageContentSkeleton } from "@/components/loading-skeleton";
import { ExportShareClient } from "@/components/export/export-share-client";
import { TopBarWrapper } from "@/components/top-bar-wrapper";
import type { WardrobeItem } from "@/lib/types/database";

export const dynamic = "force-dynamic";
// eslint-disable-next-line react-refresh/only-export-components
export const metadata = { title: "Export & Share — My AI Outfit" };

export default async function ExportPage() {
  let tier: "free" | "plus" | "pro" = "free";
  let outfits: Array<{
    id: string;
    name: string;
    score: number | null;
    items: WardrobeItem[];
  }> = [];
  let user:
    | Awaited<
        ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]>
      >["data"]["user"]
    | null = null;

  try {
    const supabase = await createClient();
    const { data: userData, error } = await supabase.auth.getUser();
    user = userData.user;
    if (error || !user) redirect("/auth/login");

    const entitlements = await resolveUserEntitlements(supabase, user.id);
    tier = entitlements.effectivePlanCode as "free" | "plus" | "pro";

    const { data, error: outfitError } = await supabase
      .from("outfits")
      .select(
        "id, name, score, pieces:outfit_items(item:wardrobe_items(*,category:categories(*)))",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (outfitError) throw new Error("Could not load outfits");
    outfits = (data || []).map((o) => ({
      id: o.id,
      name: o.name,
      score: o.score,
      items: (o.pieces || [])
        .map((piece) => piece.item as unknown as WardrobeItem | null)
        .filter((item): item is WardrobeItem => Boolean(item)),
    }));
  } catch {
    redirect("/auth/login");
  }

  return (
    <div className="page-shell min-h-screen">
      <TopBarWrapper user={user} />
      <Suspense fallback={<PageContentSkeleton />}>
        <ExportShareClient tier={tier} outfits={outfits} />
      </Suspense>
    </div>
  );
}
