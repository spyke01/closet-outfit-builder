import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function isDebugAllowed(): boolean {
  return process.env.NODE_ENV !== 'production';
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user, error };
}

export async function GET() {
  if (!isDebugAllowed()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const { supabase, user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase.from('wardrobe_items').select('count').limit(1);
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Supabase query failed',
        details: {
          message: error.message,
          code: error.code,
          hint: error.hint,
        }
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      details: {
        hasUser: true,
        userId: user.id,
        queryResult: data,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Server error',
      details: {
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isDebugAllowed()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { testType = 'basic' } = body;
    
    const { supabase, user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    switch (testType) {
      case 'auth': {
        return NextResponse.json({
          success: true,
          user: { id: user.id },
          error: null,
        });
      }
        
      case 'tables': {
        const tables = ['wardrobe_items', 'categories', 'outfits', 'user_preferences'];
        const results: Record<string, { success: boolean; error?: string }> = {};
        
        // Execute table checks in parallel for better performance
        const tableChecks = await Promise.all(
          tables.map(async (table) => {
            try {
              const { error } = await supabase.from(table).select('id').limit(1);
              return { table, result: error ? { success: false, error: error.message } : { success: true } };
            } catch (err) {
              return { table, result: { success: false, error: err instanceof Error ? err.message : 'Unknown error' } };
            }
          })
        );
        
        // Convert array to object
        for (const { table, result } of tableChecks) {
          results[table] = result;
        }
        
        return NextResponse.json({
          success: true,
          tables: results,
        });
      }
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid test type',
        }, { status: 400 });
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
