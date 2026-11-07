import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPageSession } from '@/lib/server/page-session';
import { TopBarWrapper } from '@/components/top-bar-wrapper';
import { TripsPageClient } from './trips-page-client';

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: 'Trip Planner',
  description: 'Plan weather-aware trips with outfit slots and packing checklist.',
};

export const dynamic = 'force-dynamic';

export default async function CalendarTripsPage() {
  const { supabase, user, error: authError } = await getPageSession();

  if (authError || !user) {
    redirect('/auth/login');
  }

  const { data: wardrobeItems, error: wardrobeError } = await supabase
    .from('wardrobe_items')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .eq('active', true);

  if (wardrobeError) {
    throw new Error("Could not load your wardrobe. Please try again.");
  }

  if (!wardrobeItems?.length) redirect('/onboarding');

  return (
    <div className="page-shell min-h-screen">
      <TopBarWrapper user={user} />
      <TripsPageClient wardrobeItems={wardrobeItems || []} />
    </div>
  );
}
