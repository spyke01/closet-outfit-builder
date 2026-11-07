import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPageSession } from '@/lib/server/page-session';
import { TopBarWrapper } from '@/components/top-bar-wrapper';
import { CalendarPageClient } from './calendar-page-client';

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: 'Outfit Calendar',
  description: 'Plan and track your outfits with weather-aware recommendations.',
};

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
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
      <CalendarPageClient wardrobeItems={wardrobeItems || []} />
    </div>
  );
}
