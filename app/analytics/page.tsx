import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAnalyticsDashboard } from '@/lib/actions/analytics';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';
import { PageContentSkeleton } from '@/components/loading-skeleton';

export const dynamic = 'force-dynamic';
// eslint-disable-next-line react-refresh/only-export-components
export const metadata = { title: 'Analytics — My AI Outfit' };

export default async function AnalyticsPage() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) redirect('/auth/login');
  } catch {
    redirect('/auth/login');
  }

  const data = await getAnalyticsDashboard();

  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <AnalyticsDashboard data={data} />
    </Suspense>
  );
}
