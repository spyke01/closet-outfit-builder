'use server'

import { createClient } from '@/lib/supabase/server';
import { verifySession, verifyOwnership } from './auth';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

/**
 * Server Actions for outfit management
 * All actions include proper authentication and authorization checks
 * 
 * **Validates: Requirements 5.1**
 */

// Validation schemas
const CreateOutfitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  items: z.array(z.string().uuid()).min(2),
  score: z.number().min(0).max(100).optional(),
  source: z.string().optional(),
  tuck_style: z.enum(['Tucked', 'Untucked']).optional(),
  loved: z.boolean().optional(),
  weight: z.number().int().min(1).max(10).optional(),
});

const UpdateOutfitSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  jacket_item_id: z.string().uuid().optional().nullable(),
  shirt_item_id: z.string().uuid().optional().nullable(),
  pants_item_id: z.string().uuid().optional().nullable(),
  shoes_item_id: z.string().uuid().optional().nullable(),
  belt_item_id: z.string().uuid().optional().nullable(),
  watch_item_id: z.string().uuid().optional().nullable(),
  score: z.number().min(0).max(100).optional(),
});

const DeleteOutfitSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Create a new outfit
 * Requires authentication and validates input
 */
export async function createOutfit(data: unknown) {
  try {
    // 1. Authenticate user
    const user = await verifySession();
    
    // 2. Validate input
    const validated = CreateOutfitSchema.parse(data);
    const { items, ...outfitData } = validated;
    
    // 3. Create Supabase client
    const supabase = await createClient();
    
    // 4. Insert outfit with user_id
    const { data: outfit, error } = await supabase
      .from('outfits')
      .insert({
        ...outfitData,
        user_id: user.id,
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create outfit: ${error.message}`);
    }

    const { data: wardrobeItems, error: wardrobeError } = await supabase
      .from('wardrobe_items')
      .select('id, category_id')
      .in('id', items)
      .eq('user_id', user.id);

    if (wardrobeError || !wardrobeItems) {
      await supabase.from('outfits').delete().eq('id', outfit.id);
      throw new Error(`Failed to fetch wardrobe items: ${wardrobeError?.message || 'Unknown error'}`);
    }

    if (wardrobeItems.length !== items.length) {
      await supabase.from('outfits').delete().eq('id', outfit.id);
      throw new Error('Some wardrobe items do not exist or do not belong to user');
    }

    const outfitItems = wardrobeItems.map((wardrobeItem) => ({
      outfit_id: outfit.id,
      item_id: wardrobeItem.id,
      category_id: wardrobeItem.category_id,
    }));

    const { error: outfitItemsError } = await supabase
      .from('outfit_items')
      .insert(outfitItems);

    if (outfitItemsError) {
      await supabase.from('outfits').delete().eq('id', outfit.id);
      throw new Error(`Failed to create outfit items: ${outfitItemsError.message}`);
    }

    // 5. Revalidate outfits page
    revalidatePath('/outfits');
    
    return { success: true, data: outfit };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        details: error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', '),
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create outfit',
    };
  }
}

/**
 * Update an existing outfit
 * Requires authentication and ownership verification
 */
export async function updateOutfit(data: unknown) {
  try {
    // 1. Authenticate user
    const user = await verifySession();
    
    // 2. Validate input
    const validated = UpdateOutfitSchema.parse(data);
    
    // 3. Create Supabase client
    const supabase = await createClient();
    
    // 4. Verify ownership
    const { data: existingOutfit, error: fetchError } = await supabase
      .from('outfits')
      .select('user_id')
      .eq('id', validated.id)
      .single();
    
    if (fetchError || !existingOutfit) {
      throw new Error('Outfit not found');
    }
    
    await verifyOwnership(user.id, existingOutfit.user_id);
    
    // 5. Update outfit
    const { id, ...updateData } = validated;
    const { data: outfit, error } = await supabase
      .from('outfits')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // Additional safety check
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update outfit: ${error.message}`);
    }
    
    // 6. Revalidate outfits page
    revalidatePath('/outfits');
    revalidatePath(`/outfits/${id}`);
    
    return { success: true, data: outfit };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        details: error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', '),
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update outfit',
    };
  }
}

/**
 * Delete an outfit
 * Requires authentication and ownership verification
 */
export async function deleteOutfit(data: unknown) {
  try {
    // 1. Authenticate user
    const user = await verifySession();
    
    // 2. Validate input
    const validated = DeleteOutfitSchema.parse(data);
    
    // 3. Create Supabase client
    const supabase = await createClient();
    
    // 4. Verify ownership
    const { data: existingOutfit, error: fetchError } = await supabase
      .from('outfits')
      .select('user_id')
      .eq('id', validated.id)
      .single();
    
    if (fetchError || !existingOutfit) {
      throw new Error('Outfit not found');
    }
    
    await verifyOwnership(user.id, existingOutfit.user_id);
    
    // 5. Delete linked calendar entries for this outfit
    const { error: calendarError } = await supabase
      .from('calendar_entries')
      .delete()
      .eq('outfit_id', validated.id)
      .eq('user_id', user.id);

    if (calendarError) {
      throw new Error(`Failed to delete linked calendar entries: ${calendarError.message}`);
    }

    // 6. Delete linked trip day slots for this outfit
    const { error: tripDaysError } = await supabase
      .from('trip_days')
      .delete()
      .eq('outfit_id', validated.id);

    if (tripDaysError) {
      throw new Error(`Failed to delete linked trip days: ${tripDaysError.message}`);
    }

    // 7. Delete outfit
    const { error } = await supabase
      .from('outfits')
      .delete()
      .eq('id', validated.id)
      .eq('user_id', user.id); // Additional safety check
    
    if (error) {
      throw new Error(`Failed to delete outfit: ${error.message}`);
    }
    
    // 8. Revalidate affected pages
    revalidatePath('/outfits');
    revalidatePath('/calendar');
    revalidatePath('/calendar/trips');
    
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        details: error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', '),
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete outfit',
    };
  }
}
