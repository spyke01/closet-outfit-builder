import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminRoleRow {
  role?: {
    role?: string;
  } | null;
}

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  billing_admin: ['billing.read', 'billing.write', 'support.read', 'support.write', 'audit.read'],
  support_admin: ['support.read', 'support.write', 'audit.read'],
  impersonation_admin: ['support.read', 'impersonation.start', 'impersonation.stop', 'audit.read'],
};

export async function listUserAdminRoles(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role:app_roles(role)')
    .eq('user_id', userId);

  if (error) return [];

  return ((data || []) as AdminRoleRow[])
    .map((row) => row.role?.role)
    .filter((role): role is string => Boolean(role));
}

export async function hasAnyAdminRole(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const roles = await listUserAdminRoles(supabase, userId);
  return roles.some((role) => role === 'billing_admin' || role === 'support_admin' || role === 'impersonation_admin' || role === 'super_admin');
}

export async function hasAdminRole(supabase: SupabaseClient, userId: string, role: string): Promise<boolean> {
  const roles = await listUserAdminRoles(supabase, userId);
  return roles.includes(role);
}

export async function hasAdminPermission(supabase: SupabaseClient, userId: string, permissionKey: string): Promise<boolean> {
  const roles = await listUserAdminRoles(supabase, userId);
  if (!roles.length) return false;
  if (roles.includes('super_admin')) return true;
  return roles.some((role) => (ROLE_PERMISSION_MAP[role] || []).includes(permissionKey));
}
