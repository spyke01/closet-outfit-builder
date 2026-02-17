import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasBillingAdminRole } from '@/lib/services/billing/roles';
import { enforceAdminRateLimit, hasRecentAdminAuth } from '@/lib/services/billing/admin-security';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await hasBillingAdminRole(supabase, user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hasRecentAuth = await hasRecentAdminAuth(supabase);
    if (!hasRecentAuth) {
      return NextResponse.json({ error: 'Recent authentication required' }, { status: 401 });
    }

    const rateLimit = enforceAdminRateLimit(user.id, 'admin-billing-user-detail');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) } }
      );
    }

    const admin = createAdminClient();

    const [{ data: subscription }, { data: issues }, { data: notes }, { data: events }] = await Promise.all([
      admin.from('user_subscriptions').select('*').eq('user_id', id).maybeSingle(),
      admin.from('billing_issues').select('*').eq('user_id', id).order('opened_at', { ascending: false }).limit(20),
      admin.from('admin_notes').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(50),
      admin.from('billing_events').select('id, stripe_event_id, event_type, processing_status, processed_at, created_at, error_text').eq('user_id', id).order('created_at', { ascending: false }).limit(30),
    ]);

    return NextResponse.json({ subscription, issues: issues || [], notes: notes || [], events: events || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load billing user detail';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
