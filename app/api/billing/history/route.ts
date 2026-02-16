import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listStripeInvoices } from '@/lib/services/billing/stripe';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ invoices: [] });
    }

    const invoices = await listStripeInvoices(subscription.stripe_customer_id, 25);
    return NextResponse.json({ invoices: invoices.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load billing history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
