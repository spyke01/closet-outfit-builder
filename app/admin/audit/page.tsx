'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface AuditRow {
  id: string;
  occurred_at: string;
  actor_user_id: string;
  target_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  outcome: 'success' | 'denied' | 'failed';
  error_code: string | null;
  reason: string | null;
}

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (action.trim()) params.set('action', action.trim());
      if (outcome.trim()) params.set('outcome', outcome.trim());
      const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load audit log');
      setRows(payload.rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Audit Log</h1>
        <p className="mt-1 text-muted-foreground">Immutable trail of privileged actions and outcomes.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Filter by action"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="Filter by outcome"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <Button variant="outline" onClick={() => load().catch(() => undefined)}>Apply filters</Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">{error}</div>}

      <div className="rounded-xl border border-border bg-card p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading audit log...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit events found.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="rounded-md border border-border px-3 py-2 text-sm">
                <p className="font-medium">{row.action} | {row.outcome}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(row.occurred_at).toLocaleString()} | actor {row.actor_user_id}
                  {row.target_user_id ? ` | target ${row.target_user_id}` : ''}
                  {row.error_code ? ` | ${row.error_code}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
