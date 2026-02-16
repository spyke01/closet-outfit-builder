import type { SupabaseClient } from '@supabase/supabase-js';

export async function hasBillingAdminRole(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role:app_roles(role)')
    .eq('user_id', userId);

  if (error) return false;

  return (data || []).some((row) => {
    const roleData = row.role as { role?: string } | null;
    return roleData?.role === 'billing_admin';
  });
}
