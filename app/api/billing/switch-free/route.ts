import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  cancelStripeSubscriptionAtPeriodEnd,
  listStripeSubscriptionsByCustomer,
} from '@/lib/services/billing/stripe';
import { requireSameOrigin } from '@/lib/utils/request-security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const sameOriginError = requireSameOrigin(request);
  if (sameOriginError) {
    return sameOriginError;
  }

  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, plan_code, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError) {
      console.error('Failed to load subscription for switch-free', subError);
      return NextResponse.json({ error: 'Failed to switch to free' }, { status: 500 });
    }

    if (!subscription?.stripe_customer_id && !subscription?.stripe_subscription_id) {
      // Ensure local state is normalized to free even when no Stripe identifiers exist.
      const { error: resetError } = await admin
        .from('user_subscriptions')
        .upsert(
          {
            user_id: user.id,
            plan_code: 'free',
            status: 'active',
            billing_state: 'active',
            stripe_subscription_id: null,
            current_period_start: null,
            current_period_end: null,
            cancel_at_period_end: false,
            plan_anchor_date: null,
          },
          { onConflict: 'user_id' }
        );

      if (resetError) {
        console.error('Failed to reset free membership state', resetError);
        return NextResponse.json({ error: 'Failed to switch to free' }, { status: 500 });
      }

      return NextResponse.json({ ok: true, message: 'No active paid subscription found. Membership reset to Free immediately.' });
    }

    const toCancel = new Set<string>();
    const cancelableStatuses = new Set(['active', 'trialing', 'past_due', 'unpaid']);
    let activeStripeSubscriptionCount = 0;

    if (subscription?.stripe_customer_id) {
      const stripeSubs = await listStripeSubscriptionsByCustomer(subscription.stripe_customer_id, 50);
      for (const item of stripeSubs.data || []) {
        if (cancelableStatuses.has(item.status)) {
          toCancel.add(item.id);
          activeStripeSubscriptionCount += 1;
        }
      }
    } else if (subscription?.stripe_subscription_id) {
      // Fall back to local subscription id when no customer id exists.
      toCancel.add(subscription.stripe_subscription_id);
    }

    const cancellationResults = await Promise.all(
      [...toCancel].map((subId) => cancelStripeSubscriptionAtPeriodEnd(subId))
    );

    const hasDeferredCancellation = cancellationResults.some((result) => cancelableStatuses.has(result.status));

    if (activeStripeSubscriptionCount === 0 && !hasDeferredCancellation) {
      const { error: resetError } = await admin
        .from('user_subscriptions')
        .update({
          plan_code: 'free',
          status: 'active',
          billing_state: 'active',
          stripe_subscription_id: null,
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
          plan_anchor_date: null,
        })
        .eq('user_id', user.id);

      if (resetError) {
        console.error('Failed to normalize free membership state', resetError);
        return NextResponse.json({ error: 'Failed to switch to free' }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        canceled_subscription_count: toCancel.size,
        message: 'No active Stripe subscription found. Membership reset to Free immediately.',
      });
    }

    const { error: scheduleError } = await admin
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: true,
        billing_state: 'scheduled_cancel',
      })
      .eq('user_id', user.id);

    if (scheduleError) {
      console.error('Failed to schedule cancellation', scheduleError);
      return NextResponse.json({ error: 'Failed to switch to free' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      canceled_subscription_count: toCancel.size,
      message: 'Membership set to cancel at period end. Benefits remain until current period ends.',
    });
  } catch (error) {
    console.error('Switch-free failed', error);
    return NextResponse.json({ error: 'Failed to switch to free' }, { status: 500 });
  }
}
