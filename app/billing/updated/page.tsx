import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPlanByCodeAndInterval } from '@/lib/services/billing/plans';
import { BillingUpdatedTracker } from './billing-updated-tracker';

type BillingUpdatedPageProps = {
  searchParams: Promise<{
    session_id?: string;
    plan?: string;
    interval?: string;
  }>;
};

export default async function BillingUpdatedPage({ searchParams }: BillingUpdatedPageProps) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === 'string' ? params.session_id : null;
  const planCode = params.plan === 'plus' || params.plan === 'pro' ? params.plan : null;
  const planInterval = params.interval === 'month' || params.interval === 'year' ? params.interval : null;

  const plan = planCode && planInterval
    ? getPlanByCodeAndInterval(planCode, planInterval)
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <BillingUpdatedTracker
        sessionId={sessionId}
        planCode={planCode}
        planInterval={planInterval}
        priceCents={plan?.priceCents ?? null}
        planName={plan?.name ?? null}
      />
      <div className="max-w-xl w-full rounded-xl border border-border bg-card p-6 space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Membership Updated</h1>
        <p className="text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 inline mr-1" />
          Your billing update was successful. Your plan benefits are now active.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/settings/billing">View Billing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/today">Back to App</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
