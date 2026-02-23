import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enforceAdminRateLimitDurable, hasRecentAdminAuth } from '@/lib/services/billing/admin-security';
import { requireSameOriginWithOptions } from '@/lib/utils/request-security';
import { hasAdminPermission } from '@/lib/services/admin/permissions';
import { writeAdminAuditLog } from '@/lib/services/admin/audit';

export const dynamic = 'force-dynamic';

const NoteSchema = z.object({
  note: z.string().min(1).max(1000),
  case_id: z.string().uuid().optional().nullable(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sameOriginError = requireSameOriginWithOptions(request, {
    mode: (process.env.SECURITY_CSRF_MODE as 'off' | 'report' | 'enforce' | undefined) || 'enforce',
    protectMethods: ['POST'],
    reasonTag: 'admin_billing_note',
  });
  if (sameOriginError) {
    return sameOriginError;
  }

  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canWriteSupport = await hasAdminPermission(supabase, user.id, 'support.write');
    if (!canWriteSupport) {
      await writeAdminAuditLog({
        actorUserId: user.id,
        targetUserId: id,
        action: 'billing.note.create',
        outcome: 'denied',
        resourceType: 'admin_note',
        errorCode: 'ADMIN_PERMISSION_DENIED',
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hasRecentAuth = await hasRecentAdminAuth(supabase, {
      maxAgeSeconds: Number(process.env.ADMIN_PRIVILEGED_AUTH_MAX_AGE_SECONDS || 900),
      requireAal2: true,
    });
    if (!hasRecentAuth) {
      return NextResponse.json({ error: 'Recent authentication required', code: 'ADMIN_STEP_UP_REQUIRED' }, { status: 401 });
    }

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-billing-note-write');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) } }
      );
    }

    const body = await request.json();
    const parsed = NoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid note' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('admin_notes')
      .insert({
        user_id: id,
        admin_user_id: user.id,
        note_text: parsed.data.note,
        case_id: parsed.data.case_id || null,
      })
      .select('*')
      .single();

    if (error) {
      await writeAdminAuditLog({
        actorUserId: user.id,
        targetUserId: id,
        action: 'billing.note.create',
        outcome: 'failed',
        resourceType: 'admin_note',
        errorCode: 'ADMIN_NOTE_INSERT_FAILED',
        metadata: { message: error.message },
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await writeAdminAuditLog({
      actorUserId: user.id,
      targetUserId: id,
      action: 'billing.note.create',
      outcome: 'success',
      resourceType: 'admin_note',
      resourceId: data.id,
      metadata: { case_id: data.case_id || null },
    });

    return NextResponse.json({ note: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create admin note';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
