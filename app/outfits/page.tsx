import { Suspense } from "react";
import { AuthBoundary } from "@/components/auth-boundary";
import { OutfitsPageClient } from './outfits-page-client';
import { OutfitGridSkeleton } from "@/components/loading-skeleton";

export const dynamic = 'force-dynamic';

export default function OutfitsPage() {
  return (
    <Suspense fallback={<OutfitGridSkeleton />}>
      <AuthBoundary>
        <OutfitsPageClient />
      </AuthBoundary>
    </Suspense>
  );
}