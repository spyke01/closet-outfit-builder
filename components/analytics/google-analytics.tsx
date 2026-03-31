"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

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

    const enableAnalytics = () => {
      if (!cancelled) {
        setShouldLoad(true);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(enableAnalytics, { timeout: 3000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = setTimeout(enableAnalytics, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [resolvedMeasurementId]);

  if (!resolvedMeasurementId || !shouldLoad) {
    return null;
  }

  return <DeferredGoogleAnalytics gaId={resolvedMeasurementId} />;
}
