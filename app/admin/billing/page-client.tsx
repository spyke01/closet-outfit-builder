'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
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

interface PromoCode {
  id: string;
  code: string;
  discountPercent: number;
  durationMonths: number;
  maxRedemptions: number;
  currentRedemptions: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  isActive: boolean;
}

export function AdminBillingPageClient() {
  const [activeTab, setActiveTab] = useState<'users' | 'promo-codes'>('users');

  // Users tab state
  const [users, setUsers] = useState<BillingUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [detail, setDetail] = useState<BillingUserDetail | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState(false);

  // Promo codes tab state
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newDiscountPercent, setNewDiscountPercent] = useState('');
  const [newDurationMonths, setNewDurationMonths] = useState('');
  const [newMaxRedemptions, setNewMaxRedemptions] = useState('');
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

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

  const loadPromoCodes = async () => {
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await fetch('/api/admin/billing/promo-codes');
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load promo codes');
      setPromoCodes(payload.codes || []);
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Failed to load promo codes');
    } finally {
      setPromoLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'promo-codes') {
      loadPromoCodes().catch(() => undefined);
    }
  }, [activeTab]);

  const createPromoCode = async () => {
    if (!newCode.trim() || !newDiscountPercent || !newDurationMonths || !newMaxRedemptions) return;
    setCreating(true);
    setPromoError(null);
    try {
      const body: Record<string, unknown> = {
        code: newCode.trim().toUpperCase(),
        discountPercent: Number(newDiscountPercent),
        durationMonths: Number(newDurationMonths),
        maxRedemptions: Number(newMaxRedemptions),
      };
      if (newExpiresAt) body.expiresAt = new Date(newExpiresAt).toISOString();
      const res = await fetch('/api/admin/billing/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to create promo code');
      setNewCode('');
      setNewDiscountPercent('');
      setNewDurationMonths('');
      setNewMaxRedemptions('');
      setNewExpiresAt('');
      await loadPromoCodes();
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Failed to create promo code');
    } finally {
      setCreating(false);
    }
  };

  const revokePromoCode = async (id: string) => {
    setRevoking(id);
    setPromoError(null);
    try {
      const res = await fetch(`/api/admin/billing/promo-codes/${id}`, { method: 'DELETE' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to revoke promo code');
      await loadPromoCodes();
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Failed to revoke promo code');
    } finally {
      setRevoking(null);
    }
  };

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
        <p className="text-muted-foreground mt-1">Inspect subscriptions, close billing issues, and manage promotional codes.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Users
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('promo-codes')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'promo-codes' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Promotional Codes
        </button>
      </div>

      {activeTab === 'promo-codes' && (
        <div className="space-y-6">
          {promoError && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">{promoError}</div>}

          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Create Promo Code</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="promo-code-name" className="text-xs text-muted-foreground">Code (4–20 uppercase chars)</label>
                <input
                  id="promo-code-name"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="BETA50"
                  maxLength={20}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm uppercase tracking-wider"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="promo-discount-pct" className="text-xs text-muted-foreground">Discount % (1–99)</label>
                <input
                  id="promo-discount-pct"
                  type="number"
                  value={newDiscountPercent}
                  onChange={(e) => setNewDiscountPercent(e.target.value)}
                  placeholder="50"
                  min={1}
                  max={99}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="promo-duration" className="text-xs text-muted-foreground">Duration months (1–12)</label>
                <input
                  id="promo-duration"
                  type="number"
                  value={newDurationMonths}
                  onChange={(e) => setNewDurationMonths(e.target.value)}
                  placeholder="3"
                  min={1}
                  max={12}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="promo-max-redemptions" className="text-xs text-muted-foreground">Max redemptions (1–10000)</label>
                <input
                  id="promo-max-redemptions"
                  type="number"
                  value={newMaxRedemptions}
                  onChange={(e) => setNewMaxRedemptions(e.target.value)}
                  placeholder="100"
                  min={1}
                  max={10000}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="promo-expires-at" className="text-xs text-muted-foreground">Expires at (optional)</label>
                <input
                  id="promo-expires-at"
                  type="date"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <Button
              onClick={() => createPromoCode().catch(() => undefined)}
              disabled={creating || !newCode.trim() || !newDiscountPercent || !newDurationMonths || !newMaxRedemptions}
              className="flex items-center gap-1.5"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {creating ? 'Creating...' : 'Create Code'}
            </Button>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Promotional Codes</h2>
              <Button variant="outline" size="sm" onClick={() => loadPromoCodes().catch(() => undefined)} disabled={promoLoading}>
                {promoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Refresh'}
              </Button>
            </div>

            {promoLoading ? (
              <p className="text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading...</p>
            ) : promoCodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No promotional codes yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left pb-2 pr-4">Code</th>
                      <th className="text-left pb-2 pr-4">Discount</th>
                      <th className="text-left pb-2 pr-4">Duration</th>
                      <th className="text-left pb-2 pr-4">Redemptions</th>
                      <th className="text-left pb-2 pr-4">Expires</th>
                      <th className="text-left pb-2 pr-4">Status</th>
                      <th className="text-left pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {promoCodes.map((pc) => (
                      <tr key={pc.id} className="py-2">
                        <td className="py-2 pr-4 font-mono font-semibold text-foreground">{pc.code}</td>
                        <td className="py-2 pr-4">{pc.discountPercent}%</td>
                        <td className="py-2 pr-4">{pc.durationMonths}mo</td>
                        <td className="py-2 pr-4">{pc.currentRedemptions}/{pc.maxRedemptions}</td>
                        <td className="py-2 pr-4">{pc.expiresAt ? new Date(pc.expiresAt).toLocaleDateString() : '—'}</td>
                        <td className="py-2 pr-4">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${pc.isActive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                            {pc.revokedAt ? 'Revoked' : pc.isActive ? 'Active' : 'Exhausted/Expired'}
                          </span>
                        </td>
                        <td className="py-2">
                          {pc.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokePromoCode(pc.id).catch(() => undefined)}
                              disabled={revoking === pc.id}
                              className="text-destructive hover:text-destructive h-7 px-2"
                              aria-label={`Revoke ${pc.code}`}
                            >
                              {revoking === pc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && <>
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
      </>}
    </div>
  );
}
