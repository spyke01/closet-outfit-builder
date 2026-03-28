import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveUserEntitlements } from '@/lib/services/billing/entitlements';
import { PageContentSkeleton } from '@/components/loading-skeleton';
import { ExportShareClient } from '@/components/export/export-share-client';
import { TopBarWrapper } from '@/components/top-bar-wrapper';

export const dynamic = 'force-dynamic';
// eslint-disable-next-line react-refresh/only-export-components
export const metadata = { title: 'Export & Share — My AI Outfit' };

export default async function ExportPage() {
  let tier: 'free' | 'plus' | 'pro' = 'free';
  let outfits: Array<{ id: string; name: string; score: number | null }> = [];
  let user: Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>['auth']['getUser']>>['data']['user'] | null = null;

  try {
    const supabase = await createClient();
    const { data: userData, error } = await supabase.auth.getUser();
    user = userData.user;
    if (error || !user) redirect('/auth/login');

    const entitlements = await resolveUserEntitlements(supabase, user.id);
    tier = entitlements.effectivePlanCode as 'free' | 'plus' | 'pro';

    const { data } = await supabase
      .from('outfits')
      .select('id, name, score')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    outfits = (data || []).map((o) => ({ id: o.id, name: o.name, score: o.score }));
  } catch {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBarWrapper user={user} />
      <Suspense fallback={<PageContentSkeleton />}>
        <ExportShareClient tier={tier} outfits={outfits} />
      </Suspense>
    </div>
  );
}
