import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enforceAdminRateLimitDurable } from '@/lib/services/billing/admin-security';
import { writeAdminAuditLog } from '@/lib/services/admin/audit';
import { requireSameOriginWithOptions } from '@/lib/utils/request-security';

export const dynamic = 'force-dynamic';

const CreateCaseSchema = z.object({
  subject: z.string().min(1).max(160),
  summary: z.string().min(1).max(2000),
  category: z.enum(['billing', 'account', 'bug', 'feature', 'other']).default('other'),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'user-support-cases-list');
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('support_cases')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(200);
    if (error) return NextResponse.json({ error: 'Failed to load support cases' }, { status: 500 });

    return NextResponse.json({ cases: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load support cases';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sameOriginError = requireSameOriginWithOptions(request, {
    mode: (process.env.SECURITY_CSRF_MODE as 'off' | 'report' | 'enforce' | undefined) || 'enforce',
    protectMethods: ['POST'],
    reasonTag: 'user_support_case_create',
  });
  if (sameOriginError) return sameOriginError;

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'user-support-case-create');
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const body = await request.json();
    const parsed = CreateCaseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid case payload' }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('support_cases')
      .insert({
        user_id: user.id,
        subject: parsed.data.subject,
        summary: parsed.data.summary,
        category: parsed.data.category,
        status: 'open',
        priority: 'normal',
        source: 'user_portal',
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: 'Failed to create support case' }, { status: 500 });

    await writeAdminAuditLog({
      actorUserId: user.id,
      targetUserId: user.id,
      action: 'support.case.create',
      outcome: 'success',
      resourceType: 'support_case',
      resourceId: data.id,
      metadata: { actor_role: 'user' },
    });

    return NextResponse.json({ case: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create support case';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
