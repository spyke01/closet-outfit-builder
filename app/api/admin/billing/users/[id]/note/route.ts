import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasBillingAdminRole } from '@/lib/services/billing/roles';

export const dynamic = 'force-dynamic';

const NoteSchema = z.object({
  note: z.string().min(1).max(1000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await hasBillingAdminRole(supabase, user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ note: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create admin note';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
