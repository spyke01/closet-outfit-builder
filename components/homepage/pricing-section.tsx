'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { PlanSelector } from '@/components/billing/plan-selector';

export function PricingSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground">Simple, transparent pricing</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free, then upgrade for higher limits, image generation, analytics, and exports.
          </p>
        </div>

        <PlanSelector context="public" isAuthenticated={isAuthenticated} />

        <p className="text-xs text-muted-foreground text-center">
          * Unlimited AI outfit generation is subject to fair-use and abuse protection.
        </p>
      </div>
    </section>
  );
}
