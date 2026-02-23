import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env', override: false });

interface BillingEventRow {
  id: string;
  payload_json: {
    data?: {
      object?: {
        customer?: string;
        subscription?: string;
        id?: string;
      };
    };
  } | null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: subscriptions, error: subError } = await admin
    .from('user_subscriptions')
    .select('user_id, stripe_customer_id, stripe_subscription_id')
    .or('stripe_customer_id.not.is.null,stripe_subscription_id.not.is.null');
  if (subError) throw new Error(subError.message);

  const customerMap = new Map<string, string>();
  const subscriptionMap = new Map<string, string>();
  for (const row of subscriptions || []) {
    if (row.stripe_customer_id) customerMap.set(row.stripe_customer_id, row.user_id);
    if (row.stripe_subscription_id) subscriptionMap.set(row.stripe_subscription_id, row.user_id);
  }

  const { data: events, error: eventsError } = await admin
    .from('billing_events')
    .select('id, payload_json')
    .is('user_id', null)
    .order('created_at', { ascending: false })
    .limit(5000);
  if (eventsError) throw new Error(eventsError.message);

  const updatesByUser = new Map<string, string[]>();

  for (const event of (events || []) as BillingEventRow[]) {
    const customer = event.payload_json?.data?.object?.customer || null;
    const subscriptionId = event.payload_json?.data?.object?.subscription || event.payload_json?.data?.object?.id || null;
    const mappedUser = (customer && customerMap.get(customer)) || (subscriptionId && subscriptionMap.get(subscriptionId)) || null;
    if (!mappedUser) continue;
    if (!updatesByUser.has(mappedUser)) updatesByUser.set(mappedUser, []);
    updatesByUser.get(mappedUser)?.push(event.id);
  }

  let totalLinked = 0;
  for (const [userId, eventIds] of updatesByUser.entries()) {
    totalLinked += eventIds.length;
    if (dryRun) continue;

    const { error: updateError } = await admin
      .from('billing_events')
      .update({ user_id: userId })
      .in('id', eventIds);
    if (updateError) {
      throw new Error(`Failed updating events for user ${userId}: ${updateError.message}`);
    }
  }

  console.info(`Backfill complete. Matched ${totalLinked} events across ${updatesByUser.size} users.${dryRun ? ' (dry-run)' : ''}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
