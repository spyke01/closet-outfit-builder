import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasActiveWardrobeItems } from '@/lib/server/wardrobe-readiness';
import { TopBarWrapper } from '@/components/top-bar-wrapper';
import { CalendarPageClient } from './calendar-page-client';

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: 'Outfit Calendar',
  description: 'Plan and track your outfits with weather-aware recommendations.',
};

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  const hasItems = await hasActiveWardrobeItems(supabase, user.id);
  if (!hasItems) {
    redirect('/onboarding');
  }

  const { data: wardrobeItems, error: wardrobeError } = await supabase
    .from('wardrobe_items')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .eq('active', true);

  if (wardrobeError) {
    return (
      <div className="min-h-screen bg-background">
        <TopBarWrapper user={user} />
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-foreground">Outfit Calendar</h1>
          <p className="text-destructive mt-4">Failed to load wardrobe data. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBarWrapper user={user} />
      <CalendarPageClient wardrobeItems={wardrobeItems || []} />
    </div>
  );
}
