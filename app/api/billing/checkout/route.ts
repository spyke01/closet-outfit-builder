import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createStripeCheckoutSession, getStripePriceId } from '@/lib/services/billing/stripe';
import type { PlanCode } from '@/lib/services/billing/plans';
import { resolveAppUrl } from '@/lib/services/billing/app-url';
import { requireSameOrigin } from '@/lib/utils/request-security';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'app-api-billing-checkout-route' });


export const dynamic = 'force-dynamic';

const CheckoutSchema = z.object({
  plan: z.enum(['plus', 'pro']),
  interval: z.enum(['month', 'year']),
});

export async function POST(request: NextRequest) {
  const sameOriginError = requireSameOrigin(request);
  if (sameOriginError) {
    return sameOriginError;
  }

  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.id || !user.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid plan selection' }, { status: 400 });
    }

    const selected = parsed.data;
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const priceId = getStripePriceId({ code: selected.plan as PlanCode, interval: selected.interval });
    const appUrl = resolveAppUrl(request);

    const baseCheckoutInput = {
      priceId,
      userId: user.id,
      email: user.email,
      appUrl,
      previousSubscriptionId: subscription?.stripe_subscription_id || null,
    };

    let session;
    try {
      session = await createStripeCheckoutSession({
        ...baseCheckoutInput,
        customerId: subscription?.stripe_customer_id || null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const isMissingCustomer = message.toLowerCase().includes('no such customer');

      if (!isMissingCustomer) {
        throw error;
      }

      // Recover from stale/deleted Stripe customer IDs by clearing local reference
      // and letting Stripe create/attach by customer_email.
      const { error: clearCustomerError } = await admin
        .from('user_subscriptions')
        .update({ stripe_customer_id: null })
        .eq('user_id', user.id);
      if (clearCustomerError) {
        throw new Error(clearCustomerError.message);
      }

      session = await createStripeCheckoutSession({
        ...baseCheckoutInput,
        customerId: null,
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error('Checkout session creation failed', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
