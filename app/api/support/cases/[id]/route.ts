import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enforceAdminRateLimitDurable } from '@/lib/services/billing/admin-security';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'user-support-case-detail');
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const admin = createAdminClient();
    const [{ data: supportCase }, { data: comments }] = await Promise.all([
      admin.from('support_cases').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
      admin.from('support_case_comments').select('*').eq('case_id', id).order('created_at', { ascending: true }),
    ]);

    if (!supportCase) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const authorIds = [...new Set((comments || []).map((comment) => comment.author_user_id))];
    const authorEntries = await Promise.all(
      authorIds.map(async (authorId) => {
        const response = await admin.auth.admin.getUserById(authorId);
        const authUser = response.data.user;
        const metadata = (authUser?.user_metadata || {}) as Record<string, unknown>;
        const firstName = typeof metadata.first_name === 'string' ? metadata.first_name : '';
        const lastName = typeof metadata.last_name === 'string' ? metadata.last_name : '';
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
        const authorName = fullName || authUser?.email || 'User';
        const avatarUrlRaw = metadata.avatar_url || metadata.picture;
        const avatarUrl = typeof avatarUrlRaw === 'string' && avatarUrlRaw.trim().length > 0 ? avatarUrlRaw.trim() : null;
        return [authorId, { name: authorName, avatar_url: avatarUrl }] as const;
      })
    );
    const authorMap = new Map(authorEntries);
    const enrichedComments = (comments || []).map((comment) => ({
      ...comment,
      author_name: authorMap.get(comment.author_user_id)?.name || 'User',
      author_avatar_url: authorMap.get(comment.author_user_id)?.avatar_url || null,
    }));

    return NextResponse.json({ case: supportCase, comments: enrichedComments });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load support case';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
