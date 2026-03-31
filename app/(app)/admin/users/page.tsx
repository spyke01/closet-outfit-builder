'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface UserRow {
  user_id: string;
  email: string | null;
  plan_code: string;
  billing_state: string;
}

export default function AdminUsersPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load users');
      setUsers(payload.users || []);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Users (User 360)</h1>
        <p className="mt-1 text-muted-foreground">Search users and open support operations, billing context, and impersonation controls.</p>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">{error}</div>}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search email or user id"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <Button variant="outline" onClick={() => loadUsers().catch(() => undefined)}>Search</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users found.</p>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <Link
                key={user.user_id}
                href={`/admin/users/${user.user_id}`}
                className="block rounded-lg border border-border px-3 py-2 hover:bg-muted"
              >
                <p className="truncate text-sm font-medium text-foreground">{user.email || user.user_id}</p>
                <p className="text-xs text-muted-foreground">{user.plan_code} | {user.billing_state}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
