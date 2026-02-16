import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const { data: thread } = await supabase
      .from('assistant_threads')
      .select('id, title, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found', code: 'THREAD_NOT_FOUND' }, { status: 404 });
    }

    const { data: messages, error: messageError } = await supabase
      .from('assistant_messages')
      .select('id, role, content, image_url, created_at')
      .eq('thread_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }

    return NextResponse.json({
      thread: {
        id: thread.id,
        title: thread.title,
        createdAt: thread.created_at,
        updatedAt: thread.updated_at,
      },
      messages: (messages || []).map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        imageUrl: message.image_url,
        createdAt: message.created_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load thread';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
