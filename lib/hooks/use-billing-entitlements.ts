import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';

interface BillingEntitlements {
  effectivePlanCode: 'free' | 'plus' | 'pro';
  billingState: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'trialing' | 'scheduled_cancel';
  isPaid: boolean;
  plan?: {
    limits?: {
      wardrobe_items?: number | null;
    };
  };
}

export const BILLING_ENTITLEMENTS_REFRESH_EVENT = 'billing:entitlements-refresh';

export function useBillingEntitlements(enabled: boolean) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['billing-entitlements', userId],
    enabled: enabled && !!userId,
    queryFn: async ({ signal }): Promise<BillingEntitlements | null> => {
      const response = await fetch('/api/billing/entitlements', { signal });
      if (!response.ok) throw new Error('Could not load membership');
      const payload = await response.json() as { entitlements?: BillingEntitlements };
      return payload.entitlements || null;
    },
    // The shell and each page share one request. Returning to a page can reuse
    // recent data; the server still authorizes every paid operation separately.
    staleTime: 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (!enabled || !userId) return;
    const refresh = () => {
      void queryClient.invalidateQueries(
        { queryKey: ['billing-entitlements', userId], exact: true },
        { cancelRefetch: false },
      );
    };
    window.addEventListener(BILLING_ENTITLEMENTS_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(BILLING_ENTITLEMENTS_REFRESH_EVENT, refresh);
  }, [enabled, userId, queryClient]);

  return {
    entitlements: enabled && userId ? query.data ?? null : null,
    loading: enabled && query.isPending,
  };
}
