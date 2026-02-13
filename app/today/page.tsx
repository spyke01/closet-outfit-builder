import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TodayPageClient from './today-page-client';
import { TopBarWrapper } from '@/components/top-bar-wrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Today's Outfit",
  description: 'Get personalized outfit recommendations based on weather and your wardrobe',
};

export default async function TodayPage() {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
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
    console.error('Failed to fetch wardrobe:', wardrobeError);
    return (
      <div className="min-h-screen bg-background">
        <TopBarWrapper user={user} />
        <div className="container mx-auto p-4 pt-24">
          <h1 className="text-2xl font-bold mb-4 text-foreground">Today&apos;s Outfit</h1>
          <div className="text-center py-12">
            <p className="text-lg text-destructive mb-4">
              Error loading wardrobe. Please try again.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <TopBarWrapper user={user} />
      <TodayPageClient wardrobeItems={wardrobeItems || []} />
    </div>
  );
}
