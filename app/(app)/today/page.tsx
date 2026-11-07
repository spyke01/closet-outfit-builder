import { getPageSession } from '@/lib/server/page-session';
import { redirect } from 'next/navigation';
import TodayPageClient from './today-page-client';
import { TopBarWrapper } from '@/components/top-bar-wrapper';
import type { Metadata } from 'next';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'app-today-page' });


// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: "Today's Outfit",
  description: 'Get personalized outfit recommendations based on weather and your wardrobe',
};

function getDisplayName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const candidates = [
    metadata?.first_name,
    metadata?.full_name,
    metadata?.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim().split(/\s+/)[0] || candidate.trim();
    }
  }

  return null;
}

export default async function TodayPage() {
  const { supabase, user, error: authError } = await getPageSession();
  
  if (authError || !user) {
    redirect('/auth/login');
  }

  // Fetch wardrobe items with categories
  const { data: wardrobeItems, error: wardrobeError } = await supabase
    .from('wardrobe_items')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .eq('active', true);
  
  if (wardrobeError) {
    logger.error('Failed to fetch wardrobe:', wardrobeError);
    throw new Error("Could not load your wardrobe. Please try again.");
  }
  
  if (!wardrobeItems?.length) redirect('/onboarding');

  return (
    <div className="page-shell min-h-screen">
      <TopBarWrapper user={user} />
      <TodayPageClient wardrobeItems={wardrobeItems || []} userName={getDisplayName(user)} />
    </div>
  );
}
