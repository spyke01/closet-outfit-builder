import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/lib/test/query-utils";
import { useUserPreferences } from "../use-user-preferences";

vi.mock("../use-auth", () => ({
  useAuth: () => ({ userId: "11111111-1111-4111-8111-111111111111" }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { code: "PGRST116" } }),
        }),
      }),
      insert: (record: Record<string, unknown>) => ({
        select: () => ({
          single: async () =>
            "account_tier" in record
              ? {
                  data: null,
                  error: {
                    code: "PGRST204",
                    message: "Column account_tier does not exist",
                  },
                }
              : { data: record, error: null },
        }),
      }),
    }),
  }),
}));

describe("first-use preferences against the hosted schema", () => {
  it("creates weather preferences without sending the obsolete billing field", async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.weather_enabled).toBe(true);
    expect(result.current.data?.theme).toBe("system");
    // The legacy UI default is still supplied by parsing, rather than stored.
    expect(result.current.data?.account_tier).toBe("starter");
  });
});
