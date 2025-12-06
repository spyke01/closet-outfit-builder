import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('🔍 Debug: Testing Supabase connection from server...');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
        }
      }, { status: 500 });
    }

    // Create Supabase client
    const supabase = await createClient();
    
    // Test basic connectivity
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Supabase query failed:', error);
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

    // Test auth
    const { data: { user } } = await supabase.auth.getUser();
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      details: {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        queryResult: data,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('❌ Debug API error:', error);
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
  try {
    const body = await request.json();
    const { testType = 'basic' } = body;
    
    const supabase = await createClient();
    
    switch (testType) {
      case 'auth': {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        return NextResponse.json({
          success: !authError,
          user: user ? { id: user.id, email: user.email } : null,
          error: authError?.message,
        });
      }
        
      case 'tables': {
        const tables = ['wardrobe_items', 'categories', 'outfits', 'user_preferences'];
        const results: Record<string, { success: boolean; error?: string }> = {};
        
        for (const table of tables) {
          try {
            const { error } = await supabase.from(table).select('id').limit(1);
            results[table] = error ? { success: false, error: error.message } : { success: true };
          } catch (err) {
            results[table] = { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
          }
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