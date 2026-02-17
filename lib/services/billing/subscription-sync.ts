import type { SupabaseClient } from '@supabase/supabase-js';
import { getPlanFromStripePriceId, listStripeCustomersByEmail, listStripeSubscriptionsByCustomer } from './stripe';

type BillingState = 'active' | 'past_due' | 'unpaid' | 'canceled' | 'trialing' | 'scheduled_cancel';

interface StripeSubscriptionLite {
  id: string;
  created?: number;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_start: number | null;
  current_period_end: number | null;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
}

function resolveBillingState(subscription: StripeSubscriptionLite): BillingState {
  if (subscription.status === 'past_due') return 'past_due';
  if (subscription.status === 'unpaid') return 'unpaid';
  if (subscription.status === 'trialing') return 'trialing';
  if (subscription.status === 'canceled') return 'canceled';
  if (subscription.cancel_at_period_end) return 'scheduled_cancel';
  return 'active';
}

function chooseBestSubscription(subscriptions: StripeSubscriptionLite[]): StripeSubscriptionLite | null {
  if (!subscriptions.length) return null;

  // Ignore terminal checkout states that should not grant paid access.
  const relevant = subscriptions.filter(
    (subscription) => subscription.status !== 'incomplete' && subscription.status !== 'incomplete_expired'
  );
  if (!relevant.length) return null;

  const ranked = [...relevant].sort((a, b) => {
    const rank = (status: string) => {
      if (status === 'active' || status === 'trialing') return 4;
      if (status === 'past_due' || status === 'unpaid') return 3;
      if (status === 'canceled') return 2;
      return 1;
    };
    const statusDiff = rank(b.status) - rank(a.status);
    if (statusDiff !== 0) return statusDiff;

    const createdDiff = (b.created || 0) - (a.created || 0);
    if (createdDiff !== 0) return createdDiff;

    return (b.current_period_end || 0) - (a.current_period_end || 0);
  });

  return ranked[0] || null;
}

function toIso(ts: number | null): string | null {
  if (!ts) return null;
  return new Date(ts * 1000).toISOString();
}

function toDateOnly(ts: number | null): string | null {
  const iso = toIso(ts);
  return iso ? iso.slice(0, 10) : null;
}

export async function syncUserSubscriptionFromStripe(
  admin: SupabaseClient,
  input: { userId: string; email: string }
): Promise<boolean> {
  const customerSearch = await listStripeCustomersByEmail(input.email, 10);
  const exactMatch = (customerSearch.data || []).find(
    (customer) => customer.email?.toLowerCase() === input.email.toLowerCase()
  );
  const customer = exactMatch || customerSearch.data?.[0];

  if (!customer) return false;

  const subscriptionsResponse = await listStripeSubscriptionsByCustomer(customer.id, 20);
  const subscription = chooseBestSubscription(subscriptionsResponse.data || []);

  if (!subscription) {
    await admin
      .from('user_subscriptions')
      .upsert(
        {
          user_id: input.userId,
          plan_code: 'free',
          status: 'active',
          billing_state: 'active',
          stripe_customer_id: customer.id,
          stripe_subscription_id: null,
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
          plan_anchor_date: null,
        },
        { onConflict: 'user_id' }
      );
    return true;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id || null;
  const plan = getPlanFromStripePriceId(priceId);
  const billingState = resolveBillingState(subscription);
  const effectivePlanCode = billingState === 'past_due' || billingState === 'unpaid' || billingState === 'canceled'
    ? 'free'
    : plan.planCode;

  await admin
    .from('user_subscriptions')
    .upsert(
      {
        user_id: input.userId,
        plan_code: effectivePlanCode,
        status: subscription.status,
        billing_state: billingState,
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        current_period_start: toIso(subscription.current_period_start),
        current_period_end: toIso(subscription.current_period_end),
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        plan_anchor_date: toDateOnly(subscription.current_period_start),
      },
      { onConflict: 'user_id' }
    );

  return true;
}
