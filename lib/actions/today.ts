'use server';

import { createClient } from '@/lib/supabase/server';
import { verifySession } from './auth';

/**
 * Marks the current user's Today AI outfit recommendation as saved/accepted.
 * Called when the user explicitly saves the AI-recommended outfit to their collection.
 * Sets today_ai_outfits.user_saved = true for today's entry.
 */
export async function markTodayAiOutfitSaved(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await verifySession();
    const supabase = await createClient();

    const today = new Date().toISOString().slice(0, 10);

    const { error } = await supabase
      .from('today_ai_outfits')
      .update({ user_saved: true })
      .eq('user_id', user.id)
      .eq('entry_date', today);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to mark outfit as saved' };
  }
}
