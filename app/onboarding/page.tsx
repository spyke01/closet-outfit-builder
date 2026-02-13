import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthBoundary } from '@/components/auth-boundary';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { TopBarWrapper } from '@/components/top-bar-wrapper';

export const metadata: Metadata = {
  title: 'Wardrobe Setup – My AI Outfit',
  description: 'Set up your wardrobe by selecting categories, items, colors, and quantities to get started with personalized outfit recommendations.',
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-muted bg-background">
      <TopBarWrapper />
      
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
            <OnboardingWizard />
          </AuthBoundary>
        </Suspense>
      </main>
    </div>
  );
}
