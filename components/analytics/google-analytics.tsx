"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { initializeGoogleAnalytics, trackPageView } from "@/lib/analytics/gtag";

interface GoogleAnalyticsProps {
  measurementId?: string;
}

export function GoogleAnalytics({
  measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
}: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() ?? "";

  useEffect(() => {
    if (!measurementId) {
      return;
    }

    initializeGoogleAnalytics(measurementId);
  }, [measurementId]);

  useEffect(() => {
    if (!measurementId || !pathname) {
      return;
    }

    const pagePath = queryString ? `${pathname}?${queryString}` : pathname;
    trackPageView({
      page_title: document.title,
      page_location: window.location.href,
      page_path: pagePath,
    });
  }, [measurementId, pathname, queryString]);

  if (!measurementId) {
    return null;
  }

  return (
    <Script
      id="google-analytics"
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="afterInteractive"
    />
  );
}
