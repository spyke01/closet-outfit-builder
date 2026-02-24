'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface SupportCaseRow {
  id: string;
  user_id: string;
  user_email: string | null;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

export default function AdminSupportCasesPage() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<SupportCaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [userId, setUserId] = useState(searchParams.get('user_id') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (userId) params.set('user_id', userId);
      if (category) params.set('category', category);
      const res = await fetch(`/api/admin/support-cases?${params.toString()}`, { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load support cases');
      setRows(payload.cases || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support cases');
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
        <h1 className="text-3xl font-bold text-foreground">Support Cases</h1>
        <p className="mt-1 text-muted-foreground">View all support cases, then jump to case details or user profiles.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Filter by user id" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">All categories</option>
            <option value="billing">Billing</option>
            <option value="account">Account</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="other">Other</option>
          </select>
          <Button variant="outline" onClick={() => load().catch(() => undefined)}>Apply Filters</Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">{error}</div>}

      <div className="rounded-xl border border-border bg-card p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading support cases...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No support cases found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Subject</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Date Submitted</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-b border-border/60">
                    <td className="px-3 py-2">
                      <p className="font-medium">{item.subject}</p>
                      <p className="text-xs text-muted-foreground">{item.priority}</p>
                    </td>
                    <td className="px-3 py-2 capitalize">{item.category}</td>
                    <td className="px-3 py-2">
                      <p className="truncate">{item.user_email || item.user_id}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.user_id}</p>
                    </td>
                    <td className="px-3 py-2">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 capitalize">{item.status.replace('_', ' ')}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/support/${item.id}`} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">View</Link>
                        <Link href={`/admin/users/${item.user_id}`} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">User</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
