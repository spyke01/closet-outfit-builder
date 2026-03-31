'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface SupportCase {
  id: string;
  subject: string;
  summary: string;
  category: string;
  priority: string;
  status: 'open' | 'in_progress' | 'closed';
  reopen_deadline_at: string | null;
  updated_at: string;
  created_at: string;
}

export default function SupportCasesPage() {
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState<'billing' | 'account' | 'bug' | 'feature' | 'other'>('other');

  const loadCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/support/cases', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load support cases');
      setCases(payload.cases || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases().catch(() => undefined);
  }, []);

  const createCase = async () => {
    if (!subject.trim() || !summary.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/support/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          summary: summary.trim(),
          category,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to create support case');
      setSubject('');
      setSummary('');
      setCategory('other');
      await loadCases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create support case');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Support</h1>
        <p className="mt-1 text-muted-foreground">Open requests, track updates, and continue conversations with support.</p>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">{error}</div>}

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">Open New Case</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as 'billing' | 'account' | 'bug' | 'feature' | 'other')}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="billing">Billing</option>
            <option value="account">Account</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="other">Other</option>
          </select>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Describe your request"
            className="min-h-28 rounded-md border border-border bg-background px-3 py-2 text-sm md:col-span-2"
          />
        </div>
        <Button className="mt-3" onClick={() => createCase().catch(() => undefined)} disabled={submitting || !subject.trim() || !summary.trim()}>
          {submitting ? 'Submitting...' : 'Submit Support Case'}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">My Cases</h2>
        {loading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading cases...</p>
        ) : cases.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No support cases yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
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
                {cases.map((item) => (
                  <tr key={item.id} className="border-b border-border/60">
                    <td className="px-3 py-2">
                      <p className="font-medium">{item.subject}</p>
                      {item.status === 'closed' && item.reopen_deadline_at && (
                        <p className="text-xs text-muted-foreground">Reopen until {new Date(item.reopen_deadline_at).toLocaleDateString()}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 capitalize">{item.category}</td>
                    <td className="px-3 py-2">You</td>
                    <td className="px-3 py-2">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 capitalize">{item.status.replace('_', ' ')}</td>
                    <td className="px-3 py-2">
                      <Link href={`/support/${item.id}`} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                        View
                      </Link>
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
