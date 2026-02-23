import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env', override: false });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const months = Number(process.env.ADMIN_AUDIT_RETENTION_MONTHS || 13);
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  const cutoffIso = cutoffDate.toISOString();

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: auditError, count: auditCount } = await admin
    .from('admin_audit_log')
    .delete({ count: 'exact' })
    .lt('occurred_at', cutoffIso);
  if (auditError) throw new Error(auditError.message);

  const { error: sessionError, count: sessionCount } = await admin
    .from('admin_impersonation_sessions')
    .delete({ count: 'exact' })
    .in('status', ['ended', 'expired', 'revoked'])
    .lt('updated_at', cutoffIso);
  if (sessionError) throw new Error(sessionError.message);

  const staleRateLimitCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error: rateLimitError, count: rateLimitCount } = await admin
    .from('admin_rate_limits')
    .delete({ count: 'exact' })
    .lt('reset_at', staleRateLimitCutoff);
  if (rateLimitError) throw new Error(rateLimitError.message);

  console.info(`Prune complete. deleted_audit_rows=${auditCount || 0} deleted_impersonation_rows=${sessionCount || 0} deleted_rate_limit_rows=${rateLimitCount || 0}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
