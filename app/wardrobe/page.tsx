import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasActiveWardrobeItems } from "@/lib/server/wardrobe-readiness";
import { redirect } from "next/navigation";
import { WardrobePageClient } from './wardrobe-page-client';
import { PageContentSkeleton } from "@/components/loading-skeleton";

export const dynamic = 'force-dynamic';

export default async function WardrobePage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  const hasItems = await hasActiveWardrobeItems(supabase, user.id);
  if (!hasItems) {
    redirect('/onboarding');
  }

  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <WardrobePageClient />
    </Suspense>
  );
}
