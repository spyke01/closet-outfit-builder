import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserRoleRow {
  role?: {
    role?: string;
  } | null;
}

export function useBillingAdminRole(userId: string | null | undefined) {
  const [isBillingAdmin, setIsBillingAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!userId) {
        setIsBillingAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('user_roles')
          .select('role:app_roles(role)')
          .eq('user_id', userId);

        if (cancelled) return;
        if (error) {
          setIsBillingAdmin(false);
          return;
        }

        const rows = (data || []) as UserRoleRow[];
        setIsBillingAdmin(rows.some((row) => row.role?.role === 'billing_admin'));
      } catch {
        if (!cancelled) {
          setIsBillingAdmin(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { isBillingAdmin, loading };
}
