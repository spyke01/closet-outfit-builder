import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";

const mockThirdPartyAnalytics = vi.fn(({ gaId }: { gaId: string }) => (
  <div data-testid="next-third-party-ga" data-ga-id={gaId} />
));

vi.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: (props: { gaId: string }) => mockThirdPartyAnalytics(props),
}));

describe("GoogleAnalytics", () => {
  beforeEach(() => {
    document.title = "My AI Outfit";
    window.history.replaceState({}, "", "/");
    mockThirdPartyAnalytics.mockClear();
  });

  it("does not render the GA script when measurement id is missing", () => {
    render(<GoogleAnalytics measurementId={undefined} />);

    expect(mockThirdPartyAnalytics).not.toHaveBeenCalled();
  });

  it("renders the GA component with the configured measurement id", () => {
    render(<GoogleAnalytics measurementId="G-TEST123" />);

    expect(mockThirdPartyAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({ gaId: "G-TEST123" })
    );
  });
});
