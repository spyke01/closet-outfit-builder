import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enforceAdminRateLimitDurable, hasRecentAdminAuth } from '@/lib/services/billing/admin-security';
import { hasAdminPermission } from '@/lib/services/admin/permissions';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canReadBilling = await hasAdminPermission(supabase, user.id, 'billing.read');
    if (!canReadBilling) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hasRecentAuth = await hasRecentAdminAuth(supabase, { maxAgeSeconds: Number(process.env.ADMIN_LOW_RISK_MAX_AGE_SECONDS || 43_200) });
    if (!hasRecentAuth) {
      return NextResponse.json({ error: 'Recent authentication required', code: 'ADMIN_STEP_UP_REQUIRED' }, { status: 401 });
    }

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-billing-user-detail');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) } }
      );
    }

    const admin = createAdminClient();

    const [{ data: subscription }, { data: issues }, { data: notes }, { data: events }, { data: supportCases }] = await Promise.all([
      admin.from('user_subscriptions').select('*').eq('user_id', id).maybeSingle(),
      admin.from('billing_issues').select('*').eq('user_id', id).order('opened_at', { ascending: false }).limit(20),
      admin.from('admin_notes').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(50),
      admin.from('billing_events').select('id, stripe_event_id, event_type, processing_status, processed_at, created_at, error_text').eq('user_id', id).order('created_at', { ascending: false }).limit(30),
      admin.from('support_cases').select('id, status').eq('user_id', id).in('status', ['open', 'in_progress']),
    ]);

    let unmatchedEventsCount = 0;
    let lastWebhookAt = (events || [])[0]?.created_at || null;

    if (subscription?.stripe_customer_id || subscription?.stripe_subscription_id) {
      const { data: unmatchedCandidateEvents } = await admin
        .from('billing_events')
        .select('id, created_at, payload_json')
        .is('user_id', null)
        .order('created_at', { ascending: false })
        .limit(500);

      for (const event of unmatchedCandidateEvents || []) {
        const payload = event.payload_json as { data?: { object?: { customer?: string; subscription?: string; id?: string } } } | null;
        const customer = payload?.data?.object?.customer || null;
        const subscriptionId = payload?.data?.object?.subscription || payload?.data?.object?.id || null;

        const matchesCustomer = Boolean(subscription?.stripe_customer_id && customer && customer === subscription.stripe_customer_id);
        const matchesSubscription = Boolean(subscription?.stripe_subscription_id && subscriptionId && subscriptionId === subscription.stripe_subscription_id);
        if (matchesCustomer || matchesSubscription) {
          unmatchedEventsCount += 1;
          if (!lastWebhookAt || new Date(event.created_at).getTime() > new Date(lastWebhookAt).getTime()) {
            lastWebhookAt = event.created_at;
          }
        }
      }
    }

    return NextResponse.json({
      subscription,
      issues: issues || [],
      notes: notes || [],
      events: events || [],
      unmatched_events_count: unmatchedEventsCount,
      last_webhook_at: lastWebhookAt,
      open_case_count: (supportCases || []).length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load billing user detail';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
