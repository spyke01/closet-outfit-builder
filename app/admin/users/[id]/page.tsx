'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface OverviewPayload {
  user: {
    id: string;
    email: string | null;
    last_sign_in_at: string | null;
    created_at: string | null;
  };
  roles: string[];
  subscription: Record<string, unknown> | null;
  billing_issues: Array<Record<string, unknown>>;
  admin_notes: Array<{ id: string; note_text: string; created_at: string }>;
  support_cases: Array<{ id: string; status: string; priority: string; summary: string; updated_at: string }>;
  billing_events: Array<{ id: string; event_type: string; processing_status: string; created_at: string; error_text: string | null }>;
}

export default function AdminUserOverviewPage() {
  const params = useParams();
  const userIdValue = params?.id;
  const userId = Array.isArray(userIdValue) ? userIdValue[0] : userIdValue;
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/users/${userId}/overview`)
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to load overview');
        setOverview(payload);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const startImpersonation = async () => {
    if (!userId || !reason.trim()) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/impersonation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_user_id: userId,
          reason: reason.trim(),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to start impersonation');
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start impersonation');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading user overview...</p>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">{error}</div>
      ) : !overview ? (
        <p className="text-sm text-muted-foreground">No overview available.</p>
      ) : (
        <>
          <div>
            <h1 className="text-3xl font-bold text-foreground">User 360</h1>
            <p className="mt-1 text-muted-foreground">{overview.user.email || overview.user.id}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-lg font-semibold">Identity</h2>
              <p className="mt-2 text-sm text-muted-foreground">User ID</p>
              <p className="text-sm font-mono break-all">{overview.user.id}</p>
              <p className="mt-2 text-sm text-muted-foreground">Last sign in</p>
              <p className="text-sm">{overview.user.last_sign_in_at ? new Date(overview.user.last_sign_in_at).toLocaleString() : 'Unknown'}</p>
              <p className="mt-2 text-sm text-muted-foreground">Roles</p>
              <p className="text-sm">{overview.roles.join(', ') || 'none'}</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 xl:col-span-2">
              <h2 className="text-lg font-semibold">Impersonation (Read-only)</h2>
              <p className="mt-1 text-sm text-muted-foreground">Privileged action. Requires MFA step-up and logs full audit trail. Add a clear reason before starting.</p>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for impersonation"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm md:col-span-2"
                />
              </div>
              <Button className="mt-3" onClick={() => startImpersonation().catch(() => undefined)} disabled={starting || !reason.trim()}>
                {starting ? 'Starting...' : 'Start read-only impersonation'}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-lg font-semibold">Subscription Snapshot</h2>
            <pre className="mt-2 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs">{JSON.stringify(overview.subscription, null, 2)}</pre>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-lg font-semibold">Recent Billing Events</h2>
              <div className="mt-2 space-y-2">
                {overview.billing_events.map((event) => (
                  <div key={event.id} className="rounded-md border border-border px-3 py-2 text-sm">
                    <p>{event.event_type} | {event.processing_status}</p>
                    <p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {overview.billing_events.length === 0 && <p className="text-sm text-muted-foreground">No events.</p>}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-lg font-semibold">Support Cases</h2>
              <div className="mt-2 space-y-2">
                {overview.support_cases.map((item) => (
                  <div key={item.id} className="rounded-md border border-border px-3 py-2 text-sm">
                    <p className="font-medium">{item.priority} | {item.status}</p>
                    <p>{item.summary}</p>
                  </div>
                ))}
                {overview.support_cases.length === 0 && <p className="text-sm text-muted-foreground">No cases.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
