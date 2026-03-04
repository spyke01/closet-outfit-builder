"use client";

export type GtagArgs = [string, ...unknown[]];

export interface PageViewPayload {
  page_title: string;
  page_location: string;
  page_path: string;
}

export interface PurchaseItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
}

export interface PurchasePayload {
  transaction_id: string;
  currency: string;
  value: number;
  items: PurchaseItem[];
}

export interface SignUpPayload {
  method: string;
}

declare global {
  interface Window {
    __gtagMeasurementIds?: string[];
    dataLayer?: GtagArgs[];
    gtag?: (...args: GtagArgs) => void;
  }
}

export function isGtagAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

export function initializeGoogleAnalytics(measurementId: string): void {
  if (typeof window === "undefined" || !measurementId) {
    return;
  }

  const initializedMeasurementIds = window.__gtagMeasurementIds ?? [];
  if (initializedMeasurementIds.includes(measurementId)) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = (...args: GtagArgs) => {
      window.dataLayer?.push(args);
    };
  }

  window.__gtagMeasurementIds = [...initializedMeasurementIds, measurementId];
}

export function trackEvent(eventName: string, parameters?: object): void {
  if (!isGtagAvailable()) {
    return;
  }

  if (parameters) {
    window.gtag?.("event", eventName, parameters);
    return;
  }

  window.gtag?.("event", eventName);
}

export function trackPageView(payload: PageViewPayload): void {
  trackEvent("page_view", payload);
}

export function trackPurchaseCompleted(payload: PurchasePayload): void {
  trackEvent("purchase", payload);
}

export function trackSignUp(payload: SignUpPayload): void {
  trackEvent("sign_up", payload);
}

export function trackSignUpStart(payload: SignUpPayload): void {
  trackEvent("sign_up_start", payload);
}
