import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasAdminPermission } from '@/lib/services/admin/permissions';
import { enforceAdminRateLimitDurable, hasRecentAdminAuth } from '@/lib/services/billing/admin-security';
import { syncUserSubscriptionFromStripe } from '@/lib/services/billing/subscription-sync';
import { writeAdminAuditLog } from '@/lib/services/admin/audit';
import { requireSameOriginWithOptions } from '@/lib/utils/request-security';

export const dynamic = 'force-dynamic';

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || null;
  return request.headers.get('x-real-ip') || null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sameOriginError = requireSameOriginWithOptions(request, {
    mode: (process.env.SECURITY_CSRF_MODE as 'off' | 'report' | 'enforce' | undefined) || 'enforce',
    protectMethods: ['POST'],
    reasonTag: 'admin_billing_resync',
  });
  if (sameOriginError) return sameOriginError;

  const { id } = await params;
  const ip = getClientIp(request);

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canWriteBilling = await hasAdminPermission(supabase, user.id, 'billing.write');
    if (!canWriteBilling) {
      await writeAdminAuditLog({
        actorUserId: user.id,
        targetUserId: id,
        action: 'billing.subscription.resync',
        outcome: 'denied',
        resourceType: 'user_subscription',
        errorCode: 'ADMIN_PERMISSION_DENIED',
        ip,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hasRecentAuth = await hasRecentAdminAuth(supabase, {
      maxAgeSeconds: Number(process.env.ADMIN_PRIVILEGED_AUTH_MAX_AGE_SECONDS || 900),
      requireAal2: true,
    });
    if (!hasRecentAuth) {
      return NextResponse.json({ error: 'Recent authentication required', code: 'ADMIN_STEP_UP_REQUIRED' }, { status: 401 });
    }

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-billing-subscription-resync');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const admin = createAdminClient();
    const userResponse = await admin.auth.admin.getUserById(id);
    const email = userResponse?.data?.user?.email || null;
    if (!email) {
      return NextResponse.json({ error: 'Unable to resolve target user email' }, { status: 400 });
    }

    const synced = await syncUserSubscriptionFromStripe(admin, { userId: id, email });
    const { data: subscription } = await admin
      .from('user_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', id)
      .maybeSingle();

    let linkedEventCount = 0;
    if (subscription?.stripe_customer_id || subscription?.stripe_subscription_id) {
      const { data: unmatchedCandidateEvents } = await admin
        .from('billing_events')
        .select('id, payload_json')
        .is('user_id', null)
        .order('created_at', { ascending: false })
        .limit(500);

      const matchingIds: string[] = [];
      for (const event of unmatchedCandidateEvents || []) {
        const payload = event.payload_json as { data?: { object?: { customer?: string; subscription?: string; id?: string } } } | null;
        const customer = payload?.data?.object?.customer || null;
        const subscriptionId = payload?.data?.object?.subscription || payload?.data?.object?.id || null;
        const matchesCustomer = Boolean(subscription?.stripe_customer_id && customer && customer === subscription.stripe_customer_id);
        const matchesSubscription = Boolean(subscription?.stripe_subscription_id && subscriptionId && subscriptionId === subscription.stripe_subscription_id);
        if (matchesCustomer || matchesSubscription) {
          matchingIds.push(event.id);
        }
      }

      if (matchingIds.length > 0) {
        const { error: linkError } = await admin
          .from('billing_events')
          .update({ user_id: id })
          .in('id', matchingIds);
        if (!linkError) {
          linkedEventCount = matchingIds.length;
        }
      }
    }

    await writeAdminAuditLog({
      actorUserId: user.id,
      targetUserId: id,
      action: 'billing.subscription.resync',
      outcome: 'success',
      resourceType: 'user_subscription',
      resourceId: id,
      ip,
      metadata: {
        stripe_sync_success: synced,
        linked_events: linkedEventCount,
      },
    });

    return NextResponse.json({ ok: true, synced, linked_events: linkedEventCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resync billing data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
