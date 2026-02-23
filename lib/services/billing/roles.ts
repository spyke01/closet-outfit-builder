import type { SupabaseClient } from '@supabase/supabase-js';
import { hasAdminRole } from '@/lib/services/admin/permissions';

export async function hasBillingAdminRole(supabase: SupabaseClient, userId: string): Promise<boolean> {
  return hasAdminRole(supabase, userId, 'billing_admin');
}
