import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  initializeGoogleAnalytics,
  isGtagAvailable,
  trackPageView,
  trackPurchaseCompleted,
  trackSignUp,
  trackSignUpStart,
} from "@/lib/analytics/gtag";

describe("gtag helpers", () => {
  beforeEach(() => {
    delete window.gtag;
    delete window.dataLayer;
    delete window.__gtagMeasurementIds;
  });

  it("returns false and no-ops when gtag is unavailable", () => {
    expect(isGtagAvailable()).toBe(false);

    expect(() => {
      trackPageView({
        page_title: "Home",
        page_location: "https://example.com",
        page_path: "/",
      });
      trackPurchaseCompleted({
        transaction_id: "cs_test_123",
        currency: "USD",
        value: 49.99,
        items: [
          {
            item_id: "plus_month",
            item_name: "Closet Plus Monthly",
            price: 49.99,
            quantity: 1,
          },
        ],
      });
      trackSignUp({ method: "email" });
      trackSignUpStart({ method: "google" });
    }).not.toThrow();
  });

  it("initializes the GA shim once per measurement id", () => {
    initializeGoogleAnalytics("G-TEST123");
    expect(window.dataLayer).toHaveLength(2);
    expect(window.__gtagMeasurementIds).toEqual(["G-TEST123"]);

    initializeGoogleAnalytics("G-TEST123");
    expect(window.dataLayer).toHaveLength(2);
  });

  it("sends the expected GA4 event payloads", () => {
    window.gtag = vi.fn();

    trackPageView({
      page_title: "Pricing",
      page_location: "https://example.com/pricing",
      page_path: "/pricing",
    });
    trackPurchaseCompleted({
      transaction_id: "cs_test_123",
      currency: "USD",
      value: 9.99,
      items: [
        {
          item_id: "pro_month",
          item_name: "Closet Pro Monthly",
          price: 9.99,
          quantity: 1,
        },
      ],
    });
    trackSignUp({ method: "email" });
    trackSignUpStart({ method: "google" });

    expect(window.gtag).toHaveBeenNthCalledWith(1, "event", "page_view", {
      page_title: "Pricing",
      page_location: "https://example.com/pricing",
      page_path: "/pricing",
    });
    expect(window.gtag).toHaveBeenNthCalledWith(2, "event", "purchase", {
      transaction_id: "cs_test_123",
      currency: "USD",
      value: 9.99,
      items: [
        {
          item_id: "pro_month",
          item_name: "Closet Pro Monthly",
          price: 9.99,
          quantity: 1,
        },
      ],
    });
    expect(window.gtag).toHaveBeenNthCalledWith(3, "event", "sign_up", { method: "email" });
    expect(window.gtag).toHaveBeenNthCalledWith(4, "event", "sign_up_start", { method: "google" });
  });
});
