import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function loadStats() {
  const admin = createAdminClient();
  const [
    openBillingIssues,
    failedWebhooks,
    activeImpersonations,
    unresolvedCases,
  ] = await Promise.all([
    admin.from('billing_issues').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    admin.from('billing_events').select('id', { count: 'exact', head: true }).eq('processing_status', 'failed'),
    admin.from('admin_impersonation_sessions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('support_cases').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
  ]);

  return {
    openBillingIssues: openBillingIssues.count || 0,
    failedWebhooks: failedWebhooks.count || 0,
    activeImpersonations: activeImpersonations.count || 0,
    unresolvedCases: unresolvedCases.count || 0,
  };
}

export default async function AdminDashboardPage() {
  const stats = await loadStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Portal</h1>
        <p className="mt-1 text-muted-foreground">Billing + Support operations with secure read-only impersonation.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Open billing issues</p>
          <p className="mt-2 text-2xl font-semibold">{stats.openBillingIssues}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Failed webhooks</p>
          <p className="mt-2 text-2xl font-semibold">{stats.failedWebhooks}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active impersonations</p>
          <p className="mt-2 text-2xl font-semibold">{stats.activeImpersonations}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Unresolved support cases</p>
          <p className="mt-2 text-2xl font-semibold">{stats.unresolvedCases}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Action Queue</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/admin/billing" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">Open Billing Ops</Link>
          <Link href="/admin/users" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">Open User 360</Link>
          <Link href="/admin/audit" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">Open Audit Log</Link>
        </div>
      </div>
    </div>
  );
}
