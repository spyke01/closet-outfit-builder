import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";

const mockInitializeGoogleAnalytics = vi.fn();
const mockTrackPageView = vi.fn();

let mockPathname = "/";
let mockSearchParams = new URLSearchParams();

vi.mock("next/script", () => ({
  default: ({
    children,
    ...props
  }: {
    children?: ReactNode;
    [key: string]: unknown;
  }) => <script {...props}>{children}</script>,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/lib/analytics/gtag", () => ({
  initializeGoogleAnalytics: (...args: unknown[]) => mockInitializeGoogleAnalytics(...args),
  trackPageView: (...args: unknown[]) => mockTrackPageView(...args),
}));

describe("GoogleAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockSearchParams = new URLSearchParams();
    document.title = "My AI Outfit";
    window.history.replaceState({}, "", "/");
  });

  it("does not render the GA script when measurement id is missing", () => {
    render(<GoogleAnalytics measurementId={undefined} />);

    expect(document.querySelector("#google-analytics")).toBeNull();
    expect(mockInitializeGoogleAnalytics).not.toHaveBeenCalled();
    expect(mockTrackPageView).not.toHaveBeenCalled();
  });

  it("renders the GA script and tracks the initial page view", () => {
    render(<GoogleAnalytics measurementId="G-TEST123" />);

    const script = document.querySelector("#google-analytics");
    expect(script).toBeInTheDocument();
    expect(script).toHaveAttribute(
      "src",
      "https://www.googletagmanager.com/gtag/js?id=G-TEST123"
    );
    expect(mockInitializeGoogleAnalytics).toHaveBeenCalledWith("G-TEST123");
    expect(mockTrackPageView).toHaveBeenCalledWith({
      page_title: "My AI Outfit",
      page_location: "http://localhost:3000/",
      page_path: "/",
    });
  });

  it("tracks a new page view when the route changes", () => {
    const { rerender } = render(<GoogleAnalytics measurementId="G-TEST123" />);

    mockPathname = "/pricing";
    mockSearchParams = new URLSearchParams("source=nav");
    window.history.replaceState({}, "", "/pricing?source=nav");
    rerender(<GoogleAnalytics measurementId="G-TEST123" />);

    expect(mockTrackPageView).toHaveBeenNthCalledWith(2, {
      page_title: "My AI Outfit",
      page_location: "http://localhost:3000/pricing?source=nav",
      page_path: "/pricing?source=nav",
    });
  });
});
