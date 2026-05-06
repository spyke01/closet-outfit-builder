"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const ANALYTICS_IDLE_TIMEOUT_MS = 10000;
const ANALYTICS_FALLBACK_DELAY_MS = 8000;
const ANALYTICS_INTENT_EVENTS = ["pointerdown", "keydown", "scroll"] as const;

const DeferredGoogleAnalytics = dynamic(
  () => import("@next/third-parties/google").then((mod) => mod.GoogleAnalytics),
  { ssr: false },
);

interface GoogleAnalyticsProps {
  measurementId?: string;
}

export function GoogleAnalytics({
  measurementId,
}: GoogleAnalyticsProps) {
  const resolvedMeasurementId = measurementId ?? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!resolvedMeasurementId) return;
    if (process.env.NODE_ENV !== "production") return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;

    const enableAnalytics = () => {
      cleanupListeners();
      if (!cancelled) {
        setShouldLoad(true);
      }
    };

    const cleanupListeners = () => {
      ANALYTICS_INTENT_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, enableAnalytics);
      });
    };

    ANALYTICS_INTENT_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, enableAnalytics, { once: true, passive: true });
    });

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(enableAnalytics, { timeout: ANALYTICS_IDLE_TIMEOUT_MS });
    } else {
      timeoutId = setTimeout(enableAnalytics, ANALYTICS_FALLBACK_DELAY_MS);
    }

    return () => {
      cancelled = true;
      cleanupListeners();
      if (idleId !== undefined) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [resolvedMeasurementId]);

  if (!resolvedMeasurementId || !shouldLoad) {
    return null;
  }

  return <DeferredGoogleAnalytics gaId={resolvedMeasurementId} />;
}
