import { Suspense } from "react";
import { AuthBoundary } from "@/components/auth-boundary";
import { SettingsPageClient } from "./settings-page-client";
import { SettingsSkeleton } from "@/components/loading-skeleton";

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <AuthBoundary>
        <SettingsPageClient />
      </AuthBoundary>
    </Suspense>
  );
}