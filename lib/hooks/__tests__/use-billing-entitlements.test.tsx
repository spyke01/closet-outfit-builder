import type { ReactNode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/lib/test/query-utils";
import { BILLING_ENTITLEMENTS_REFRESH_EVENT, useBillingEntitlements } from "../use-billing-entitlements";

const auth = vi.hoisted(() => ({ userId: "account-a" as string | null }));
vi.mock("../use-auth", () => ({ useAuth: () => auth }));
const free = { effectivePlanCode: "free", billingState: "active", isPaid: false };
const pro = { effectivePlanCode: "pro", billingState: "active", isPaid: true };
const fetchMock = vi.fn();

beforeEach(() => {
  auth.userId = "account-a";
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({ entitlements: free }) }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function setup() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

describe("shared membership query", () => {
  it("deduplicates shell/page consumers and reuses recent data when a page reopens", async () => {
    const { wrapper } = setup();
    const header = renderHook(() => useBillingEntitlements(true), { wrapper });
    const page = renderHook(() => useBillingEntitlements(true), { wrapper });
    await waitFor(() => expect(page.result.current.entitlements).toEqual(free));
    expect(header.result.current.entitlements).toEqual(free);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    page.unmount();
    const returning = renderHook(() => useBillingEntitlements(true), { wrapper });
    expect(returning.result.current.entitlements).toEqual(free);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes after a membership change without restarting duplicate requests", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => [useBillingEntitlements(true), useBillingEntitlements(true)], { wrapper });
    await waitFor(() => expect(result.current[0].entitlements).toEqual(free));
    fetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({ entitlements: pro }) }));
    act(() => window.dispatchEvent(new Event(BILLING_ENTITLEMENTS_REFRESH_EVENT)));
    await waitFor(() => expect(result.current[0].entitlements).toEqual(pro));
    expect(result.current[1].entitlements).toEqual(pro);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not show one account's cached entitlements for another account", async () => {
    const { wrapper } = setup();
    const { result, rerender } = renderHook(() => useBillingEntitlements(true), { wrapper });
    await waitFor(() => expect(result.current.entitlements).toEqual(free));
    let complete!: (value: unknown) => void;
    fetchMock.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    auth.userId = "account-b";
    rerender();
    expect(result.current.entitlements).toBeNull();
    expect(result.current.loading).toBe(true);
    await act(async () => complete({ ok: true, json: async () => ({ entitlements: pro }) }));
    await waitFor(() => expect(result.current.entitlements).toEqual(pro));
  });

  it("keeps disabled and signed-out consumers from requesting membership data", () => {
    const { wrapper } = setup();
    const { result, rerender } = renderHook(() => useBillingEntitlements(false), { wrapper });
    expect(result.current).toMatchObject({ entitlements: null, loading: false });
    auth.userId = null;
    rerender();
    expect(result.current.entitlements).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("finishes a failed lookup so a membership outage cannot leave the page loading forever", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    const { wrapper } = setup();
    const { result } = renderHook(() => useBillingEntitlements(true), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entitlements).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe(true);
  });
});
