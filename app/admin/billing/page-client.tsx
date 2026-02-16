'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
}

export function AdminBillingPageClient() {
  const [users, setUsers] = useState<BillingUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [detail, setDetail] = useState<BillingUserDetail | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [noteInput, setNoteInput] = useState('');
  const [error, setError] = useState<string | null>(null);

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
    fetch(`/api/admin/billing/users/${selectedUserId}`)
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to load user detail');
        setDetail(payload);
      })
      .catch((err: Error) => setError(err.message));
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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Billing</h1>
        <p className="text-muted-foreground mt-1">Inspect subscriptions and help users resolve billing issues.</p>
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
          ) : !detail ? (
            <p className="text-sm text-muted-foreground">Loading details...</p>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Subscription</h2>
                <pre className="text-xs bg-muted/50 border border-border rounded-md p-3 overflow-auto">{JSON.stringify(detail.subscription, null, 2)}</pre>
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
