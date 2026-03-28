import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAnalyticsDashboard } from '@/lib/actions/analytics';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';
import { PageContentSkeleton } from '@/components/loading-skeleton';
import { TopBarWrapper } from '@/components/top-bar-wrapper';

export const dynamic = 'force-dynamic';
// eslint-disable-next-line react-refresh/only-export-components
export const metadata = { title: 'Analytics — My AI Outfit' };

export default async function AnalyticsPage() {
  let user: Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>['auth']['getUser']>>['data']['user'] | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    user = data.user;
    if (error || !user) redirect('/auth/login');
  } catch {
    redirect('/auth/login');
  }

  const data = await getAnalyticsDashboard();

  return (
    <div className="min-h-screen bg-background">
      <TopBarWrapper user={user} />
      <Suspense fallback={<PageContentSkeleton />}>
        <AnalyticsDashboard data={data} />
      </Suspense>
    </div>
  );
}
