import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cancelStripeSubscriptionNow, getPlanFromStripePriceId, verifyStripeWebhookSignature } from '@/lib/services/billing/stripe';

export const dynamic = 'force-dynamic';

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

type BillingState = 'active' | 'past_due' | 'unpaid' | 'canceled' | 'trialing' | 'scheduled_cancel';

interface ExistingSubscriptionRecord {
  user_id: string;
  plan_code: 'free' | 'plus' | 'pro';
  status: string;
  billing_state: BillingState;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plan_anchor_date: string | null;
}

function toIsoDate(value: unknown): string | null {
  if (typeof value !== 'number') return null;
  return new Date(value * 1000).toISOString();
}

function toAnchorDate(value: unknown): string | null {
  const iso = toIsoDate(value);
  if (!iso) return null;
  return iso.slice(0, 10);
}

function extractPriceId(object: Record<string, unknown>): string | null {
  const topLevelPrice = (object.price as { id?: string } | undefined)?.id;
  if (topLevelPrice) return topLevelPrice;

  const itemPrice = (object.items as { data?: Array<{ price?: { id?: string } }> } | undefined)
    ?.data?.[0]?.price?.id;
  if (itemPrice) return itemPrice;

  const linePrice = (object.lines as { data?: Array<{ price?: { id?: string } }> } | undefined)
    ?.data?.[0]?.price?.id;
  if (linePrice) return linePrice;

  return null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  try {
    if (!verifyStripeWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as StripeEvent;
    const admin = createAdminClient();

    const { data: existingEvent } = await admin
      .from('billing_events')
      .select('id, processing_status')
      .eq('stripe_event_id', event.id)
      .maybeSingle();

    if (existingEvent?.processing_status === 'processed') {
      return NextResponse.json({ received: true, deduped: true });
    }

    const { data: insertedEvent, error: insertEventError } = await admin
      .from('billing_events')
      .upsert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload_json: event,
        processing_status: 'pending',
      }, { onConflict: 'stripe_event_id' })
      .select('id')
      .single();

    if (insertEventError) {
      throw new Error(`Failed to persist billing event: ${insertEventError.message}`);
    }

    const object = event.data.object;
    const subscriptionId = (object.subscription as string | undefined)
      || (object.id as string | undefined);
    const customerId = (object.customer as string | undefined) || null;
    const status = (object.status as string | undefined) || null;

    let userId: string | null = null;

    if (event.type === 'checkout.session.completed') {
      userId = (object.metadata as Record<string, string> | undefined)?.user_id || null;
    }

    const metadata = (object.metadata as Record<string, string> | undefined) || {};
    const previousSubscriptionId = metadata.previous_subscription_id || null;

    let existingSubscription: ExistingSubscriptionRecord | null = null;

    if (!userId && subscriptionId) {
      const { data: existingSub } = await admin
        .from('user_subscriptions')
        .select('user_id, plan_code, status, billing_state, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end, plan_anchor_date')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle();
      existingSubscription = (existingSub as ExistingSubscriptionRecord | null) || null;
      userId = existingSubscription?.user_id || null;
    }

    if (!userId && customerId) {
      const { data: existingCustomerSub } = await admin
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
      userId = existingCustomerSub?.user_id || null;
    }

    const priceId = extractPriceId(object);

    const plan = getPlanFromStripePriceId(priceId);

    if (userId) {
      if (!existingSubscription) {
        const { data: foundByUser } = await admin
          .from('user_subscriptions')
          .select('user_id, plan_code, status, billing_state, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end, plan_anchor_date')
          .eq('user_id', userId)
          .maybeSingle();
        existingSubscription = (foundByUser as ExistingSubscriptionRecord | null) || null;
      }

      const incomingCurrentPeriodStart = toIsoDate(object.current_period_start);
      const incomingCurrentPeriodEnd = toIsoDate(object.current_period_end);
      const currentPeriodStart = incomingCurrentPeriodStart || existingSubscription?.current_period_start || null;
      const currentPeriodEnd = incomingCurrentPeriodEnd || existingSubscription?.current_period_end || null;
      const hasCancelAtPeriodEnd = typeof object.cancel_at_period_end === 'boolean';
      const cancelAtPeriodEnd = hasCancelAtPeriodEnd
        ? Boolean(object.cancel_at_period_end)
        : (existingSubscription?.cancel_at_period_end || false);

      const subscriptionLikeStatuses = new Set(['active', 'past_due', 'unpaid', 'canceled', 'trialing', 'incomplete', 'incomplete_expired']);
      const normalizedStatus = status && subscriptionLikeStatuses.has(status)
        ? status
        : (existingSubscription?.status || 'active');

      let billingState: BillingState = 'active';
      if (normalizedStatus === 'past_due') billingState = 'past_due';
      else if (normalizedStatus === 'unpaid') billingState = 'unpaid';
      else if (normalizedStatus === 'trialing') billingState = 'trialing';
      else if (normalizedStatus === 'canceled') billingState = 'canceled';
      else if (cancelAtPeriodEnd) billingState = 'scheduled_cancel';

      if (event.type === 'invoice.payment_failed') {
        billingState = 'past_due';
      }

      if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.paid') {
        if (billingState !== 'canceled') {
          billingState = cancelAtPeriodEnd ? 'scheduled_cancel' : 'active';
        }
      }

      const nextPlanCode = plan.planCode === 'free'
        ? (existingSubscription?.plan_code || 'free')
        : plan.planCode;

      const effectivePlanCode = (billingState === 'past_due' || billingState === 'unpaid' || billingState === 'canceled')
        ? 'free'
        : nextPlanCode;

      await admin
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan_code: effectivePlanCode,
          status: normalizedStatus,
          billing_state: billingState,
          stripe_customer_id: customerId || existingSubscription?.stripe_customer_id || null,
          stripe_subscription_id: subscriptionId || existingSubscription?.stripe_subscription_id || null,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: cancelAtPeriodEnd,
          plan_anchor_date: currentPeriodStart
            ? currentPeriodStart.slice(0, 10)
            : (existingSubscription?.plan_anchor_date || toAnchorDate(object.current_period_start)),
        }, { onConflict: 'user_id' });

      if (billingState === 'past_due' || billingState === 'unpaid') {
        await admin
          .from('billing_issues')
          .insert({
            user_id: userId,
            issue_type: 'payment_failed',
            status: 'open',
            last_event_id: insertedEvent.id,
            metadata_json: { stripe_status: status, event_type: event.type },
          });
      }

      if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.paid') {
        await admin
          .from('billing_issues')
          .update({ status: 'resolved', resolved_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('status', 'open');
      }

      if (
        event.type === 'checkout.session.completed'
        && previousSubscriptionId
        && subscriptionId
        && previousSubscriptionId !== subscriptionId
      ) {
        await cancelStripeSubscriptionNow(previousSubscriptionId);
      }
    }

    await admin
      .from('billing_events')
      .update({
        user_id: userId,
        processed_at: new Date().toISOString(),
        processing_status: 'processed',
      })
      .eq('stripe_event_id', event.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    try {
      const admin = createAdminClient();
      const event = JSON.parse(rawBody) as StripeEvent;
      await admin
        .from('billing_events')
        .update({
          processing_status: 'failed',
          error_text: error instanceof Error ? error.message : 'Unknown webhook error',
        })
        .eq('stripe_event_id', event.id);
    } catch {
      // noop - keep primary error response
    }

    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
