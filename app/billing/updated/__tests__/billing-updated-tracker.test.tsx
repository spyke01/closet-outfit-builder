import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingUpdatedTracker } from "@/app/billing/updated/billing-updated-tracker";

const mockTrackPurchaseCompleted = vi.fn();

vi.mock("@/lib/analytics/gtag", () => ({
  trackPurchaseCompleted: (...args: unknown[]) => mockTrackPurchaseCompleted(...args),
}));

describe("BillingUpdatedTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("tracks the purchase once with the expected payload", () => {
    render(
      <BillingUpdatedTracker
        sessionId="cs_test_123"
        planCode="plus"
        planInterval="month"
        priceCents={499}
        planName="Closet Plus Monthly"
      />
    );

    expect(mockTrackPurchaseCompleted).toHaveBeenCalledWith({
      transaction_id: "cs_test_123",
      currency: "USD",
      value: 4.99,
      items: [
        {
          item_id: "plus_month",
          item_name: "Closet Plus Monthly",
          price: 4.99,
          quantity: 1,
        },
      ],
    });
    expect(window.sessionStorage.getItem("ga:purchase:cs_test_123")).toBe("1");
  });

  it("does not track the purchase twice for the same session", () => {
    const props = {
      sessionId: "cs_test_123",
      planCode: "plus" as const,
      planInterval: "month" as const,
      priceCents: 499,
      planName: "Closet Plus Monthly",
    };

    const { rerender } = render(<BillingUpdatedTracker {...props} />);
    rerender(<BillingUpdatedTracker {...props} />);

    expect(mockTrackPurchaseCompleted).toHaveBeenCalledTimes(1);
  });

  it("skips tracking when the billing metadata is incomplete", () => {
    render(
      <BillingUpdatedTracker
        sessionId="cs_test_123"
        planCode={null}
        planInterval="month"
        priceCents={499}
        planName="Closet Plus Monthly"
      />
    );

    expect(mockTrackPurchaseCompleted).not.toHaveBeenCalled();
  });
});
