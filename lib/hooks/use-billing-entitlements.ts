import { useEffect, useState } from 'react';

interface BillingEntitlements {
  effectivePlanCode: 'free' | 'plus' | 'pro';
  billingState: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'trialing' | 'scheduled_cancel';
  isPaid: boolean;
}

export function useBillingEntitlements(enabled: boolean) {
  const [entitlements, setEntitlements] = useState<BillingEntitlements | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setEntitlements(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/billing/entitlements', {
          method: 'GET',
          signal: controller.signal,
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
    };

    load().catch(() => undefined);

    return () => {
      controller.abort();
    };
  }, [enabled]);

  return { entitlements, loading };
}
