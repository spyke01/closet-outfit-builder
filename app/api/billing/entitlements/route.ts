import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveUserEntitlements } from '@/lib/services/billing/entitlements';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncUserSubscriptionFromStripe } from '@/lib/services/billing/subscription-sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Always attempt a best-effort sync from Stripe so cancellations/refunds
    // are reflected even when local records already exist.
    if (user.email) {
      try {
        const admin = createAdminClient();
        await syncUserSubscriptionFromStripe(admin, { userId: user.id, email: user.email });
      } catch {
        // Non-fatal fallback path; entitlements route should still return.
      }
    }

    const entitlements = await resolveUserEntitlements(supabase, user.id);

    return NextResponse.json({ entitlements });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load entitlements';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
