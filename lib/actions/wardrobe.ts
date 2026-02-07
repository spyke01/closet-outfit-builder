'use server'

import { createClient } from '@/lib/supabase/server';
import { verifySession, verifyOwnership } from './auth';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

/**
 * Server Actions for wardrobe management
 * All actions include proper authentication and authorization checks
 * 
 * **Validates: Requirements 5.1**
 */

// Validation schemas
const CreateWardrobeItemSchema = z.object({
  name: z.string().min(1).max(100),
  category_id: z.string().uuid(),
  image_url: z.string().url().optional(),
  formality_score: z.number().min(1).max(10).optional(),
  color: z.string().optional(),
  pattern: z.string().optional(),
  season: z.array(z.string()).optional(),
  capsule_tags: z.array(z.string()).optional(),
});

const UpdateWardrobeItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  category_id: z.string().uuid().optional(),
  image_url: z.string().url().optional(),
  formality_score: z.number().min(1).max(10).optional(),
  color: z.string().optional(),
  pattern: z.string().optional(),
  season: z.array(z.string()).optional(),
  capsule_tags: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

const DeleteWardrobeItemSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Create a new wardrobe item
 * Requires authentication and validates input
 */
export async function createWardrobeItem(data: unknown) {
  try {
    // 1. Authenticate user
    const user = await verifySession();
    
    // 2. Validate input
    const validated = CreateWardrobeItemSchema.parse(data);
    
    // 3. Create Supabase client
    const supabase = await createClient();
    
    // 4. Insert item with user_id
    const { data: item, error } = await supabase
      .from('wardrobe_items')
      .insert({
        ...validated,
        user_id: user.id,
        active: true,
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create wardrobe item: ${error.message}`);
    }
    
    // 5. Revalidate wardrobe page
    revalidatePath('/wardrobe');
    
    return { success: true, data: item };
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
      error: error instanceof Error ? error.message : 'Failed to create wardrobe item',
    };
  }
}

/**
 * Update an existing wardrobe item
 * Requires authentication and ownership verification
 */
export async function updateWardrobeItem(data: unknown) {
  try {
    // 1. Authenticate user
    const user = await verifySession();
    
    // 2. Validate input
    const validated = UpdateWardrobeItemSchema.parse(data);
    
    // 3. Create Supabase client
    const supabase = await createClient();
    
    // 4. Verify ownership
    const { data: existingItem, error: fetchError } = await supabase
      .from('wardrobe_items')
      .select('user_id')
      .eq('id', validated.id)
      .single();
    
    if (fetchError || !existingItem) {
      throw new Error('Wardrobe item not found');
    }
    
    await verifyOwnership(user.id, existingItem.user_id);
    
    // 5. Update item
    const { id, ...updateData } = validated;
    const { data: item, error } = await supabase
      .from('wardrobe_items')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // Additional safety check
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update wardrobe item: ${error.message}`);
    }
    
    // 6. Revalidate wardrobe page
    revalidatePath('/wardrobe');
    
    return { success: true, data: item };
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
      error: error instanceof Error ? error.message : 'Failed to update wardrobe item',
    };
  }
}

/**
 * Delete a wardrobe item (soft delete by setting active=false)
 * Requires authentication and ownership verification
 */
export async function deleteWardrobeItem(data: unknown) {
  try {
    // 1. Authenticate user
    const user = await verifySession();
    
    // 2. Validate input
    const validated = DeleteWardrobeItemSchema.parse(data);
    
    // 3. Create Supabase client
    const supabase = await createClient();
    
    // 4. Verify ownership
    const { data: existingItem, error: fetchError } = await supabase
      .from('wardrobe_items')
      .select('user_id')
      .eq('id', validated.id)
      .single();
    
    if (fetchError || !existingItem) {
      throw new Error('Wardrobe item not found');
    }
    
    await verifyOwnership(user.id, existingItem.user_id);
    
    // 5. Soft delete (set active=false)
    const { error } = await supabase
      .from('wardrobe_items')
      .update({ active: false })
      .eq('id', validated.id)
      .eq('user_id', user.id); // Additional safety check
    
    if (error) {
      throw new Error(`Failed to delete wardrobe item: ${error.message}`);
    }
    
    // 6. Revalidate wardrobe page
    revalidatePath('/wardrobe');
    
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
      error: error instanceof Error ? error.message : 'Failed to delete wardrobe item',
    };
  }
}
