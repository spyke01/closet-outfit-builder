import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthBoundary } from '@/components/auth-boundary';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { TopBarWrapper } from '@/components/top-bar-wrapper';
import { createClient } from '@/lib/supabase/server';
import { hasBillingAdminRole } from '@/lib/services/billing/roles';

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: 'Wardrobe Setup – My AI Outfit',
  description: 'Set up your wardrobe by selecting categories, items, colors, and quantities to get started with personalized outfit recommendations.',
};

interface OnboardingPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const params = searchParams ? await searchParams : {};
  const forceParam = params.force;
  const forceValue = Array.isArray(forceParam) ? forceParam[0] : forceParam;
  const isForceRequested = forceValue === '1' || forceValue === 'true';

  let canUseForceMode = false;
  if (isForceRequested && user) {
    canUseForceMode = await hasBillingAdminRole(supabase, user.id);
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted bg-background">
      <TopBarWrapper user={user} />
      
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border mx-auto mb-4" />
                <p className="text-muted-foreground">Loading onboarding...</p>
              </div>
            </div>
          }
        >
          <AuthBoundary>
            <OnboardingWizard
              forceMode={canUseForceMode}
              forceFreshStart={canUseForceMode}
            />
          </AuthBoundary>
        </Suspense>
      </main>
    </div>
  );
}
