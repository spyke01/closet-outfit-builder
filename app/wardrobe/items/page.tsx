import { Suspense } from "react";
import { AuthBoundary } from "@/components/auth-boundary";
import { AddItemPageClient } from './add-item-client';
import { PageContentSkeleton } from "@/components/loading-skeleton";

export default function WardrobeItemsPage() {
  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <AuthBoundary>
        <AddItemPageClient />
      </AuthBoundary>
    </Suspense>
  );
}