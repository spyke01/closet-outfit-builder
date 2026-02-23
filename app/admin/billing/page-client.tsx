'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface BillingUser {
  user_id: string;
  email: string | null;
  plan_code: string;
  billing_state: string;
  current_period_end: string | null;
}

interface BillingUserDetail {
  subscription: Record<string, unknown> | null;
  issues: Array<Record<string, unknown>>;
  notes: Array<{ id: string; note_text: string; created_at: string }>;
  events: Array<{ id: string; event_type: string; processing_status: string; created_at: string }>;
  unmatched_events_count: number;
  last_webhook_at: string | null;
  open_case_count: number;
}

export function AdminBillingPageClient() {
  const [users, setUsers] = useState<BillingUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [detail, setDetail] = useState<BillingUserDetail | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/billing/users${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load users');
      setUsers(payload.users || []);
      if (!selectedUserId && payload.users?.[0]?.user_id) {
        setSelectedUserId(payload.users[0].user_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    setDetailLoading(true);
    fetch(`/api/admin/billing/users/${selectedUserId}`)
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to load user detail');
        setDetail(payload);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setDetailLoading(false));
  }, [selectedUserId]);

  const addNote = async () => {
    if (!selectedUserId || !noteInput.trim()) return;
    const res = await fetch(`/api/admin/billing/users/${selectedUserId}/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: noteInput.trim() }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.error || 'Failed to save note');
      return;
    }
    setNoteInput('');

    const refreshed = await fetch(`/api/admin/billing/users/${selectedUserId}`).then((r) => r.json());
    setDetail(refreshed);
  };

  const resyncSubscription = async () => {
    if (!selectedUserId) return;
    setResyncing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/billing/users/${selectedUserId}/resync`, { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to resync');
      const refreshed = await fetch(`/api/admin/billing/users/${selectedUserId}`).then((r) => r.json());
      setDetail(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resync');
    } finally {
      setResyncing(false);
    }
  };

  const subscription = detail?.subscription as {
    plan_code?: string;
    billing_state?: string;
    status?: string;
    current_period_end?: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    updated_at?: string | null;
  } | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Billing</h1>
        <p className="text-muted-foreground mt-1">Inspect subscriptions, close billing issues, and handle webhook mismatches.</p>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search email or user id"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <Button variant="outline" onClick={() => loadUsers().catch(() => undefined)}>Search</Button>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading users...</div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
              {users.map((user) => (
                <button
                  key={user.user_id}
                  type="button"
                  onClick={() => setSelectedUserId(user.user_id)}
                  className={`w-full text-left border rounded-lg p-2.5 ${selectedUserId === user.user_id ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary/70 hover:border-foreground/25'}`}
                >
                  <p className="text-sm font-medium text-foreground truncate">{user.email || user.user_id}</p>
                  <p className="text-xs text-muted-foreground">{user.plan_code} | {user.billing_state}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-2 bg-card border border-border rounded-xl p-4 space-y-4">
          {!selectedUserId ? (
            <p className="text-sm text-muted-foreground">Select a user.</p>
          ) : !detail || detailLoading ? (
            <p className="text-sm text-muted-foreground">Loading details...</p>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-foreground">Subscription</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={resyncing} onClick={() => resyncSubscription().catch(() => undefined)}>
                      {resyncing ? 'Resyncing...' : 'Resync from Stripe'}
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/admin/users/${selectedUserId}`}>Open User 360</Link>
                    </Button>
                  </div>
                </div>
                {!subscription ? (
                  <p className="text-sm text-muted-foreground">No subscription record for this user.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Plan</p>
                      <p className="text-sm font-semibold">{subscription.plan_code || 'unknown'}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Billing state</p>
                      <p className="text-sm font-semibold">{subscription.billing_state || 'unknown'}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="text-sm font-semibold">{subscription.status || 'unknown'}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Current period end</p>
                      <p className="text-sm">{subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Last webhook</p>
                      <p className="text-sm">{detail.last_webhook_at ? new Date(detail.last_webhook_at).toLocaleString() : 'No webhook seen'}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Unmatched webhook events</p>
                      <p className="text-sm font-semibold">{detail.unmatched_events_count}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Open support cases</p>
                      <p className="text-sm font-semibold">{detail.open_case_count}</p>
                    </div>
                    <div className="rounded-md border border-border p-3 sm:col-span-2 xl:col-span-2">
                      <p className="text-xs text-muted-foreground">Stripe customer/subscription</p>
                      <p className="text-sm break-all">{subscription.stripe_customer_id || 'none'} / {subscription.stripe_subscription_id || 'none'}</p>
                    </div>
                  </div>
                )}
                <details className="rounded-md border border-border bg-muted/30 p-3">
                  <summary className="cursor-pointer text-sm text-muted-foreground">Raw Subscription JSON</summary>
                  <pre className="mt-2 overflow-auto rounded-md border border-border bg-muted/50 p-3 text-xs">{JSON.stringify(detail.subscription, null, 2)}</pre>
                </details>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-foreground">Recent Billing Events</h2>
                <div className="space-y-1">
                  {detail.events.map((event) => (
                    <div key={event.id} className="text-sm border border-border rounded-md px-3 py-2">
                      {event.event_type} | {event.processing_status} | {new Date(event.created_at).toLocaleString()}
                    </div>
                  ))}
                  {detail.events.length === 0 && <p className="text-sm text-muted-foreground">No events.</p>}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-foreground">Billing Issues</h2>
                <div className="space-y-1">
                  {detail.issues.map((issue, index) => (
                    <pre key={index} className="text-xs bg-muted/50 border border-border rounded-md p-3 overflow-auto">{JSON.stringify(issue, null, 2)}</pre>
                  ))}
                  {detail.issues.length === 0 && <p className="text-sm text-muted-foreground">No open issues.</p>}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-foreground">Admin Notes</h2>
                <div className="flex gap-2 mb-2">
                  <input
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Add internal note"
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                  <Button onClick={() => addNote().catch(() => undefined)}>Save</Button>
                </div>
                <div className="space-y-1">
                  {detail.notes.map((note) => (
                    <div key={note.id} className="border border-border rounded-md px-3 py-2">
                      <p className="text-sm text-foreground">{note.note_text}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(note.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                  {detail.notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
