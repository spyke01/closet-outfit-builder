'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronRight, MessageSquare, RotateCcw, XCircle } from 'lucide-react';

interface SupportCaseDetail {
  id: string;
  subject: string;
  summary: string;
  category: string;
  status: 'open' | 'in_progress' | 'closed';
  reopen_deadline_at: string | null;
  updated_at: string;
}

interface SupportComment {
  id: string;
  author_role: 'user' | 'admin';
  body: string;
  created_at: string;
  author_name: string;
  author_avatar_url: string | null;
}

export default function SupportCaseDetailPage() {
  const params = useParams();
  const idValue = params?.id;
  const caseId = Array.isArray(idValue) ? idValue[0] : idValue;
  const [supportCase, setSupportCase] = useState<SupportCaseDetail | null>(null);
  const [comments, setComments] = useState<SupportComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/cases/${caseId}`, { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load support case');
      setSupportCase(payload.case);
      setComments(payload.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support case');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const addComment = async () => {
    if (!caseId || !commentBody.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/cases/${caseId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentBody.trim() }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to add comment');
      setCommentBody('');
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSaving(false);
    }
  };

  const closeCase = async () => {
    if (!caseId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/cases/${caseId}/close`, { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to close case');
      setSupportCase(payload.case);
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close case');
    } finally {
      setSaving(false);
    }
  };

  const reopenCase = async () => {
    if (!caseId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/cases/${caseId}/reopen`, { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to reopen case');
      setSupportCase(payload.case);
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reopen case');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading support case...</p>
      ) : !supportCase ? (
        <p className="text-sm text-muted-foreground">Support case not found.</p>
      ) : (
        <>
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/support" className="hover:text-foreground">Support</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="truncate">{supportCase.subject}</span>
          </nav>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Support Case</h1>
                <p className="mt-1 text-base font-medium">{supportCase.subject}</p>
                <p className="mt-1 text-sm text-muted-foreground">{supportCase.category} | {supportCase.status}</p>
              </div>
              <div className="flex gap-2">
                {supportCase.status !== 'closed' ? (
                  <Button variant="outline" onClick={() => closeCase().catch(() => undefined)} disabled={saving}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Close Case
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => reopenCase().catch(() => undefined)} disabled={saving}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reopen Case
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-3 text-sm">{supportCase.summary}</p>
            {supportCase.status === 'closed' && supportCase.reopen_deadline_at && (
              <p className="mt-2 text-xs text-muted-foreground">Reopen available until {new Date(supportCase.reopen_deadline_at).toLocaleString()}</p>
            )}
          </div>

          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">{error}</div>}

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-lg font-semibold">Conversation</h2>
            <div className="mt-3 space-y-2">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {comment.author_avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- avatar URLs are dynamic user profile content.
                      <img src={comment.author_avatar_url} alt={`${comment.author_name} avatar`} className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-foreground">
                        {comment.author_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-foreground">{comment.author_name}</span>
                    <span>{new Date(comment.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-sm">{comment.body}</p>
                </div>
              ))}
              {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
            </div>
            <div className="mt-3 space-y-2">
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Add a comment"
                className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <Button onClick={() => addComment().catch(() => undefined)} disabled={saving || !commentBody.trim()}>
                <MessageSquare className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Post Comment'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
