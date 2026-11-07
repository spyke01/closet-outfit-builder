import { Suspense } from "react";
import { getPageSession } from "@/lib/server/page-session";
import { hasActiveWardrobeItems } from "@/lib/server/wardrobe-readiness";
import { redirect } from "next/navigation";
import { WardrobePageClient } from "./wardrobe-page-client";
import { CollectionPageSkeleton } from "@/components/page-skeletons";

export const dynamic = "force-dynamic";

export default async function WardrobePage() {
  const { supabase, user, error } = await getPageSession();
  if (error || !user) redirect("/auth/login");
  const [hasItems, preferences] = await Promise.all([
    hasActiveWardrobeItems(supabase, user.id),
    supabase.from("user_preferences").select("walkthrough_completed_at").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!hasItems) redirect("/onboarding");
  const walkthroughCompleted = preferences.error ? true : Boolean(preferences.data?.walkthrough_completed_at);

  return (
    <Suspense fallback={<CollectionPageSkeleton />}>
      <WardrobePageClient initialWalkthroughCompleted={walkthroughCompleted} />
    </Suspense>
  );
}
