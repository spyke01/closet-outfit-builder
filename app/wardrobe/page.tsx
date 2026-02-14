import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasActiveWardrobeItems } from "@/lib/server/wardrobe-readiness";
import { redirect } from "next/navigation";
import { WardrobePageClient } from "./wardrobe-page-client";
import { PageContentSkeleton } from "@/components/loading-skeleton";

export const dynamic = "force-dynamic";

export default async function WardrobePage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      redirect("/auth/login");
    }

    const hasItems = await hasActiveWardrobeItems(supabase, user.id);
    if (!hasItems) {
      redirect("/onboarding");
    }
  } catch {
    // If auth bootstrap fails in SSR/CI, keep route safe and redirect to login.
    redirect("/auth/login");
  }

  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <WardrobePageClient />
    </Suspense>
  );
}
