'use server';

import { createClient } from '@/lib/supabase/server';
import { verifySession } from './auth';

/**
 * Marks the walkthrough as completed/dismissed for the current user.
 * Sets walkthrough_completed_at to now() so the tour does not re-trigger.
 */
export async function completeWalkthrough(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await verifySession();
    const supabase = await createClient();

    const { error } = await supabase
      .from('user_preferences')
      .update({ walkthrough_completed_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to complete walkthrough' };
  }
}

/**
 * Resets walkthrough state so it triggers again from the wardrobe page.
 * Used by the "Replay walkthrough" option in Settings.
 */
export async function resetWalkthrough(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await verifySession();
    const supabase = await createClient();

    const { error } = await supabase
      .from('user_preferences')
      .update({ walkthrough_completed_at: null })
      .eq('user_id', user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to reset walkthrough' };
  }
}

/**
 * Returns whether the current user has completed the walkthrough.
 */
export async function getWalkthroughCompleted(): Promise<{ completed: boolean }> {
  try {
    const user = await verifySession();
    const supabase = await createClient();

    const { data } = await supabase
      .from('user_preferences')
      .select('walkthrough_completed_at')
      .eq('user_id', user.id)
      .maybeSingle();

    return { completed: Boolean(data?.walkthrough_completed_at) };
  } catch {
    return { completed: true }; // Safe default: don't show walkthrough if we can't check
  }
}
