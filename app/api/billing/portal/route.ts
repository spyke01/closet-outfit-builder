import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createStripePortalSession } from '@/lib/services/billing/stripe';
import { resolveAppUrl } from '@/lib/services/billing/app-url';
import { requireSameOrigin } from '@/lib/utils/request-security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const sameOriginError = requireSameOrigin(request);
  if (sameOriginError) {
    return sameOriginError;
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !subscription?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
    }

    const appUrl = resolveAppUrl(request);
    const portal = await createStripePortalSession({
      customerId: subscription.stripe_customer_id,
      appUrl,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error('Billing portal session creation failed', error);
    return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 });
  }
}
