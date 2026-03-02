"use client";

import { useEffect } from "react";
import { trackPurchaseCompleted } from "@/lib/analytics/gtag";
import type { PlanCode, PlanInterval } from "@/lib/services/billing/plans";

interface BillingUpdatedTrackerProps {
  sessionId: string | null;
  planCode: Exclude<PlanCode, "free"> | null;
  planInterval: Exclude<PlanInterval, "none"> | null;
  priceCents: number | null;
  planName: string | null;
}

export function BillingUpdatedTracker({
  sessionId,
  planCode,
  planInterval,
  priceCents,
  planName,
}: BillingUpdatedTrackerProps) {
  useEffect(() => {
    if (!sessionId || !planCode || !planInterval || priceCents == null || !planName) {
      return;
    }

    const sessionStorageKey = `ga:purchase:${sessionId}`;
    if (window.sessionStorage.getItem(sessionStorageKey)) {
      return;
    }

    const price = priceCents / 100;
    trackPurchaseCompleted({
      transaction_id: sessionId,
      currency: "USD",
      value: price,
      items: [
        {
          item_id: `${planCode}_${planInterval}`,
          item_name: planName,
          price,
          quantity: 1,
        },
      ],
    });
    window.sessionStorage.setItem(sessionStorageKey, "1");
  }, [planCode, planInterval, planName, priceCents, sessionId]);

  return null;
}
