"use client";

import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";

interface GoogleAnalyticsProps {
  measurementId?: string;
}

export function GoogleAnalytics({
  measurementId,
}: GoogleAnalyticsProps) {
  const resolvedMeasurementId = measurementId ?? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!resolvedMeasurementId) {
    return null;
  }

  return <NextGoogleAnalytics gaId={resolvedMeasurementId} />;
}
