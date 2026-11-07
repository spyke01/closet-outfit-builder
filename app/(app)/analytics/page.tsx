import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getPageSession } from "@/lib/server/page-session";
import { loadAnalyticsDashboard } from "@/lib/services/analytics/dashboard";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { AnalyticsPageSkeleton } from "@/components/page-skeletons";
import { TopBarWrapper } from "@/components/top-bar-wrapper";

export const dynamic = "force-dynamic";
// eslint-disable-next-line react-refresh/only-export-components
export const metadata = { title: "Analytics — My AI Outfit" };

async function AnalyticsContent() {
  const { supabase, user, error } = await getPageSession();
  if (error || !user) redirect("/auth/login");
  const data = await loadAnalyticsDashboard(supabase, user.id);
  return <AnalyticsDashboard data={data} />;
}

export default async function AnalyticsPage() {
  const { user, error } = await getPageSession();
  if (error || !user) redirect("/auth/login");
  return (
    <div className="page-shell min-h-screen">
      <TopBarWrapper user={user} />
      <Suspense fallback={<AnalyticsPageSkeleton />}>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
