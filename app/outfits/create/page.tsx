import { Suspense } from "react";
import { AuthBoundary } from "@/components/auth-boundary";
import { CreateOutfitPageClient } from './create-outfit-client';
import { PageContentSkeleton } from "@/components/loading-skeleton";

export default function CreateOutfitPage() {
  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <AuthBoundary>
        <CreateOutfitPageClient />
      </AuthBoundary>
    </Suspense>
  );
}