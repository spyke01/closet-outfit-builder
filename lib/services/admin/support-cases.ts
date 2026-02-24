import type { SupabaseClient } from '@supabase/supabase-js';

export type SupportCaseStatus = 'open' | 'in_progress' | 'closed';
export type SupportCaseCategory = 'billing' | 'account' | 'bug' | 'feature' | 'other';

export interface SupportCaseRecord {
  id: string;
  user_id: string;
  status: SupportCaseStatus;
  closed_at: string | null;
  reopen_deadline_at: string | null;
}

const REOPEN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function canReopenCase(caseRecord: Pick<SupportCaseRecord, 'status' | 'reopen_deadline_at'>, now = new Date()): boolean {
  if (caseRecord.status !== 'closed') return false;
  if (!caseRecord.reopen_deadline_at) return false;
  const deadline = new Date(caseRecord.reopen_deadline_at).getTime();
  return Number.isFinite(deadline) && now.getTime() <= deadline;
}

export function buildCloseCasePatch(actorUserId: string, now = new Date()) {
  const nowIso = now.toISOString();
  const reopenDeadline = new Date(now.getTime() + REOPEN_WINDOW_MS).toISOString();
  return {
    status: 'closed' as SupportCaseStatus,
    closed_at: nowIso,
    closed_by_user_id: actorUserId,
    reopen_deadline_at: reopenDeadline,
    updated_at: nowIso,
  };
}

export function buildReopenCasePatch(now = new Date()) {
  const nowIso = now.toISOString();
  return {
    status: 'open' as SupportCaseStatus,
    closed_at: null,
    closed_by_user_id: null,
    reopen_deadline_at: null,
    updated_at: nowIso,
  };
}

export async function getSupportCaseById(admin: SupabaseClient, caseId: string): Promise<SupportCaseRecord | null> {
  const { data } = await admin
    .from('support_cases')
    .select('id, user_id, status, closed_at, reopen_deadline_at')
    .eq('id', caseId)
    .maybeSingle();

  return (data as SupportCaseRecord | null) || null;
}
