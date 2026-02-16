import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  cancelStripeSubscriptionAtPeriodEnd,
  listStripeSubscriptionsByCustomer,
} from '@/lib/services/billing/stripe';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createClient();
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
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    if (!subscription?.stripe_customer_id && !subscription?.stripe_subscription_id) {
      return NextResponse.json({ ok: true, message: 'No active paid subscription found.' });
    }

    const toCancel = new Set<string>();
    if (subscription?.stripe_subscription_id) {
      toCancel.add(subscription.stripe_subscription_id);
    }

    if (subscription?.stripe_customer_id) {
      const stripeSubs = await listStripeSubscriptionsByCustomer(subscription.stripe_customer_id, 50);
      for (const item of stripeSubs.data || []) {
        if (['active', 'trialing', 'past_due', 'unpaid'].includes(item.status)) {
          toCancel.add(item.id);
        }
      }
    }

    for (const subId of toCancel) {
      await cancelStripeSubscriptionAtPeriodEnd(subId);
    }

    await supabase
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: true,
        billing_state: 'scheduled_cancel',
      })
      .eq('user_id', user.id);

    return NextResponse.json({
      ok: true,
      canceled_subscription_count: toCancel.size,
      message: 'Membership set to cancel at period end. Benefits remain until current period ends.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to switch to free';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
