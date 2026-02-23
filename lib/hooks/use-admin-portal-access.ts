import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface RoleRow {
  role?: {
    role?: string;
  } | null;
}

const ADMIN_ROLES = new Set(['billing_admin', 'support_admin', 'impersonation_admin', 'super_admin']);

export function useAdminPortalAccess(userId?: string) {
  const [isAdminPortalUser, setIsAdminPortalUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!userId) {
      setIsAdminPortalUser(false);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    const supabase = createClient();
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role:app_roles(role)')
        .eq('user_id', userId);

      if (!mounted) return;
      if (error) {
        setIsAdminPortalUser(false);
        setLoading(false);
        return;
      }

      const rows = (data || []) as RoleRow[];
      setIsAdminPortalUser(rows.some((row) => ADMIN_ROLES.has(row.role?.role || '')));
      setLoading(false);
    };

    load().catch(() => {
      if (!mounted) return;
      setIsAdminPortalUser(false);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [userId]);

  return { isAdminPortalUser, loading };
}
