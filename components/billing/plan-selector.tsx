'use client';

import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type PlanCode = 'free' | 'plus' | 'pro';
export type PlanInterval = 'month' | 'year';

interface PlanSelectorProps {
  context: 'public' | 'billing';
  isAuthenticated: boolean;
  currentPlanCode?: PlanCode;
  busyAction?: string | null;
  onCheckout?: (plan: Exclude<PlanCode, 'free'>, interval: PlanInterval) => void;
  onSwitchToFree?: () => void;
}

type PlanDefinition = {
  code: PlanCode;
  name: string;
  tagline: string;
  description: string;
  monthlyCents: number;
  yearlyCents?: number;
  featured?: boolean;
  featureList: string[];
};

const PLANS: PlanDefinition[] = [
  {
    code: 'free',
    name: 'Closet Starter',
    tagline: 'Great for getting started',
    description: 'Build a personal wardrobe and plan your week with weather-aware basics.',
    monthlyCents: 0,
    featureList: [
      'Up to 100 wardrobe items',
      'Up to 50 saved outfits',
      'AI outfit generation (20 per cycle)',
      'Calendar and trip planner basics',
      'Seasonal fallback recommendations',
    ],
  },
  {
    code: 'plus',
    name: 'Closet Plus',
    tagline: 'Most popular',
    description: 'For users who plan weekly outfits and trips with higher limits.',
    monthlyCents: 499,
    yearlyCents: 3999,
    featured: true,
    featureList: [
      'Up to 500 wardrobe items',
      'Up to 300 saved outfits',
      'AI outfit generation (300 per cycle)',
      'AI image generation (30 per cycle)',
      'Sebastian AI assistant access',
      '10 active trips and 30-day trip windows',
      'Basic analytics',
    ],
  },
  {
    code: 'pro',
    name: 'Closet Pro',
    tagline: 'For power users',
    description: 'Unlimited planning capacity with advanced insights and exports.',
    monthlyCents: 999,
    yearlyCents: 7999,
    featureList: [
      'Unlimited wardrobe and saved outfits',
      'Unlimited active trips and calendar depth',
      'Unlimited AI outfit generation (fair use)',
      'AI image generation (100 per cycle)',
      'Sebastian AI assistant access',
      'Advanced analytics',
      'Export and share',
      'Priority support',
    ],
  },
];

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getPublicHref(planCode: PlanCode, isAuthenticated: boolean) {
  if (planCode === 'free') {
    return isAuthenticated ? '/today' : '/auth/sign-up';
  }
  return isAuthenticated ? '/settings/billing' : '/auth/login';
}

export function PlanSelector({
  context,
  isAuthenticated,
  currentPlanCode,
  busyAction,
  onCheckout,
  onSwitchToFree,
}: PlanSelectorProps) {
  const rootClassName = context === 'billing'
    ? 'rounded-xl border border-border bg-card p-6 space-y-5'
    : 'space-y-5';

  return (
    <div className={rootClassName}>
      {context === 'billing' && (
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Change your membership</h2>
          <p className="text-sm text-muted-foreground">Pick a plan, review features, then continue to secure checkout.</p>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-1/2 bg-primary" />
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlanCode === plan.code;
          const paidPlanCode = plan.code === 'free' ? null : plan.code;
          const monthlyActionKey = plan.code === 'free' ? null : `${plan.code}-month`;
          const yearlyActionKey = plan.code === 'free' ? null : `${plan.code}-year`;
          const isMonthlyBusy = monthlyActionKey ? busyAction === monthlyActionKey : false;
          const isYearlyBusy = yearlyActionKey ? busyAction === yearlyActionKey : false;

          return (
            <section
              key={plan.code}
              className={`rounded-xl border p-5 bg-card/95 ${plan.featured ? 'border-primary/60 shadow-sm' : 'border-border'}`}
            >
              <div className="space-y-2 min-h-[112px]">
                {isCurrent && (
                  <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-500">
                    Current Plan
                  </span>
                )}
                {!isCurrent && plan.featured && (
                  <span className="inline-flex items-center rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {plan.tagline}
                  </span>
                )}
                <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mt-5 space-y-2">
                <div className="text-3xl font-bold text-foreground">
                  {formatPrice(plan.monthlyCents)}
                  <span className="text-base font-medium text-muted-foreground">/month</span>
                </div>
                {plan.yearlyCents != null && (
                  <p className="text-xs text-muted-foreground">or {formatPrice(plan.yearlyCents)}/year</p>
                )}
              </div>

              <div className="mt-5 space-y-2">
                {context === 'billing' ? (
                  <>
                    {plan.code === 'free' ? (
                      <Button
                        className="w-full"
                        variant={isCurrent ? 'outline' : 'secondary'}
                        disabled={isCurrent || !onSwitchToFree || Boolean(busyAction)}
                        onClick={() => onSwitchToFree?.()}
                      >
                        {isCurrent ? 'Current Plan' : busyAction === 'switch-free' ? 'Switching...' : 'Switch to Free'}
                      </Button>
                    ) : (
                      <>
                        <Button
                          className="w-full"
                          disabled={isCurrent || !onCheckout || Boolean(busyAction)}
                          onClick={() => paidPlanCode && onCheckout?.(paidPlanCode, 'month')}
                        >
                          {isCurrent ? 'Current Plan' : isMonthlyBusy ? 'Loading...' : `Choose ${plan.name} Monthly`}
                        </Button>
                        <Button
                          className="w-full"
                          variant="outline"
                          disabled={isCurrent || !onCheckout || Boolean(busyAction)}
                          onClick={() => paidPlanCode && onCheckout?.(paidPlanCode, 'year')}
                        >
                          {isCurrent ? 'Current Plan' : isYearlyBusy ? 'Loading...' : `Choose ${plan.name} Yearly`}
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <Button asChild className="w-full" variant={plan.featured ? 'default' : 'outline'}>
                    <Link href={getPublicHref(plan.code, isAuthenticated)}>
                      {plan.code === 'free' ? 'Start Free' : 'Choose Plan'}
                    </Link>
                  </Button>
                )}
              </div>

              <ul className="mt-5 space-y-2">
                {plan.featureList.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 mt-0.5 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
