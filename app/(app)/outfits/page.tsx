import { Suspense } from "react";
import { getPageSession } from "@/lib/server/page-session";
import { hasActiveWardrobeItems } from "@/lib/server/wardrobe-readiness";
import { redirect } from "next/navigation";
import { OutfitsPageClient } from './outfits-page-client';
import { CollectionPageSkeleton } from "@/components/page-skeletons";

export const dynamic = 'force-dynamic';

export default async function OutfitsPage() {
  const { supabase, user, error } = await getPageSession();
  if (error || !user) redirect('/auth/login');
  const hasItems = await hasActiveWardrobeItems(supabase, user.id);
  if (!hasItems) redirect('/onboarding');

  return (
    <Suspense fallback={<CollectionPageSkeleton kind="Outfits" />}>
      <OutfitsPageClient />
    </Suspense>
  );
}
