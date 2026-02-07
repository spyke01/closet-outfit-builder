import { Suspense } from "react";
import { AuthBoundary } from "@/components/auth-boundary";
import { WardrobePageClient } from './wardrobe-page-client';
import { PageContentSkeleton } from "@/components/loading-skeleton";

export const dynamic = 'force-dynamic';

export default function WardrobePage() {
  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <AuthBoundary>
        <WardrobePageClient />
      </AuthBoundary>
    </Suspense>
  );
}