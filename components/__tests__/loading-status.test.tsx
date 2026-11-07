import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoadingStatus } from "../loading-status";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("loading feedback", () => {
  it("explains a slow request without preventing navigation", () => {
    vi.useFakeTimers();
    render(<LoadingStatus label="Planner" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading Planner…");
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.getByRole("status")).toHaveTextContent("Still loading Planner. You can open another page while you wait.");
  });

  it("explains a lost connection and updates on reconnection", () => {
    vi.stubGlobal("navigator", { onLine: false });
    render(<LoadingStatus label="Analytics" />);
    expect(screen.getByRole("status")).toHaveTextContent("You’re offline");
    act(() => { vi.stubGlobal("navigator", { onLine: true }); window.dispatchEvent(new Event("online")); });
    expect(screen.getByRole("status")).toHaveTextContent("Loading Analytics…");
  });

  it("cleans up its slow request timer when the content arrives", () => {
    vi.useFakeTimers();
    const { unmount } = render(<LoadingStatus label="Planner" />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
