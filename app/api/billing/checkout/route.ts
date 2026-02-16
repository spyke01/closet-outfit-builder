import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createStripeCheckoutSession, getStripePriceId } from '@/lib/services/billing/stripe';
import type { PlanCode } from '@/lib/services/billing/plans';
import { resolveAppUrl } from '@/lib/services/billing/app-url';

export const dynamic = 'force-dynamic';

const CheckoutSchema = z.object({
  plan: z.enum(['plus', 'pro']),
  interval: z.enum(['month', 'year']),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
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

    const session = await createStripeCheckoutSession({
      priceId,
      userId: user.id,
      email: user.email,
      appUrl,
      customerId: subscription?.stripe_customer_id || null,
      previousSubscriptionId: subscription?.stripe_subscription_id || null,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
