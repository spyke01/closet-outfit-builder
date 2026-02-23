import { useCallback, useEffect, useState } from 'react';

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
  const [entitlements, setEntitlements] = useState<BillingEntitlements | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/billing/entitlements', {
        method: 'GET',
      });
      if (!response.ok) return;
      const payload = await response.json() as { entitlements?: BillingEntitlements };
      if (payload.entitlements) {
        setEntitlements(payload.entitlements);
      }
    } catch {
      // Silent fallback; nav should remain usable even if billing endpoint fails.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setEntitlements(null);
      setLoading(false);
      return;
    }

    load().catch(() => undefined);
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      load().catch(() => undefined);
    };

    window.addEventListener(BILLING_ENTITLEMENTS_REFRESH_EVENT, refresh);
    return () => {
      window.removeEventListener(BILLING_ENTITLEMENTS_REFRESH_EVENT, refresh);
    };
  }, [enabled, load]);

  return { entitlements, loading };
}
