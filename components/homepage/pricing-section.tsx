'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { PlanSelector } from '@/components/billing/plan-selector';

export function PricingSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative py-16 lg:py-24">
      <div className="mx-auto max-w-[1240px] px-6 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="font-display text-4xl font-normal text-foreground lg:text-5xl">Simple, transparent pricing</h2>
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
