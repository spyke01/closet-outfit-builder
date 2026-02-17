import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveUserEntitlements } from '@/lib/services/billing/entitlements';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncUserSubscriptionFromStripe } from '@/lib/services/billing/subscription-sync';
import { getStripeSubscriptionById } from '@/lib/services/billing/stripe';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Always attempt a best-effort sync from Stripe so cancellations/refunds
    // are reflected even when local records already exist.
    if (user.email) {
      try {
        const admin = createAdminClient();
        await syncUserSubscriptionFromStripe(admin, { userId: user.id, email: user.email });
      } catch {
        // Non-fatal fallback path; entitlements route should still return.
      }
    }

    // Self-heal missing renewal dates for active paid users by backfilling
    // current_period_* directly from Stripe subscription details.
    try {
      const admin = createAdminClient();
      const { data: sub } = await admin
        .from('user_subscriptions')
        .select('stripe_subscription_id, current_period_start, current_period_end, plan_anchor_date, plan_code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (
        sub?.plan_code &&
        sub.plan_code !== 'free' &&
        sub.stripe_subscription_id &&
        !sub.current_period_end
      ) {
        const stripeSub = await getStripeSubscriptionById(sub.stripe_subscription_id);
        const currentPeriodStart = stripeSub.current_period_start
          ? new Date(stripeSub.current_period_start * 1000).toISOString()
          : null;
        const currentPeriodEnd = stripeSub.current_period_end
          ? new Date(stripeSub.current_period_end * 1000).toISOString()
          : null;

        if (currentPeriodEnd) {
          await admin
            .from('user_subscriptions')
            .update({
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              plan_anchor_date: currentPeriodStart
                ? currentPeriodStart.slice(0, 10)
                : sub.plan_anchor_date,
            })
            .eq('user_id', user.id);
        }
      }
    } catch {
      // Best-effort only; do not fail entitlements response.
    }

    const entitlements = await resolveUserEntitlements(supabase, user.id);

    return NextResponse.json({ entitlements });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load entitlements';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
