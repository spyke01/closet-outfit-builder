import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withSecurity, SecurityConfigs, SecureRequest } from '@/lib/middleware/security-middleware';
import { WardrobeItemSchema } from '@/lib/schemas';
import { logError, logValidationError } from '@/lib/utils/error-logging';
import { createClient } from '@/lib/supabase/server';

// Input validation schema for this endpoint
const CreateItemRequestSchema = z.object({
  name: z.string().min(1).max(100),
  category_id: z.string().uuid(),
  brand: z.string().max(50).optional(),
  color: z.string().max(30).optional(),
  material: z.string().max(50).optional(),
  formality_score: z.number().int().min(1).max(10).optional(),
  season: z.array(z.enum(['All', 'Summer', 'Winter', 'Spring', 'Fall'])).default(['All']),
});

// Secure POST handler
async function securePostHandler(request: SecureRequest): Promise<NextResponse> {
  try {
    const { user, validatedData } = request;
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // The input has already been validated by the security middleware
    const itemData = validatedData as z.infer<typeof CreateItemRequestSchema>;

    // Create Supabase client
    const supabase = await createClient();

    // Insert the wardrobe item with user_id
    const { data, error } = await supabase
      .from('wardrobe_items')
      .insert({
        ...itemData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      logError(error, 'database', 'high', {
        userId: user.id,
        component: 'secure-example',
        action: 'create_wardrobe_item',
        metadata: { itemData: { name: itemData.name, category_id: itemData.category_id } },
      });

      return NextResponse.json(
        { error: 'Failed to create wardrobe item' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    const errorId = logError(error instanceof Error ? error : 'Unknown error', 'system', 'high', {
      userId: request.user?.id,
      component: 'secure-example',
      action: 'post_handler',
    });

    return NextResponse.json(
      { error: 'Internal server error', errorId },
      { status: 500 }
    );
  }
}

// Secure GET handler
async function secureGetHandler(request: SecureRequest): Promise<NextResponse> {
  try {
    const { user } = request;
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Get user's wardrobe items
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      logError(error, 'database', 'medium', {
        userId: user.id,
        component: 'secure-example',
        action: 'get_wardrobe_items',
      });

      return NextResponse.json(
        { error: 'Failed to fetch wardrobe items' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    const errorId = logError(error instanceof Error ? error : 'Unknown error', 'system', 'high', {
      userId: request.user?.id,
      component: 'secure-example',
      action: 'get_handler',
    });

    return NextResponse.json(
      { error: 'Internal server error', errorId },
      { status: 500 }
    );
  }
}

// Apply security middleware with configuration
export const POST = withSecurity({
  ...SecurityConfigs.authenticated,
  validateInput: CreateItemRequestSchema,
  rateLimit: { maxRequests: 50, windowMs: 15 * 60 * 1000 }, // 50 requests per 15 minutes
})(securePostHandler);

export const GET = withSecurity({
  ...SecurityConfigs.authenticated,
  rateLimit: { maxRequests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
})(secureGetHandler);