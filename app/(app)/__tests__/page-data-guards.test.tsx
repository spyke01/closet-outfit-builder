import { beforeEach, describe, expect, it, vi } from "vitest";
import TodayPage from "../today/page";
import CalendarPage from "../calendar/page";
import TripsPage from "../calendar/trips/page";

const { session, redirect, from, result } = vi.hoisted(() => ({
  session: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
  from: vi.fn(),
  result: { data: [] as unknown[] | null, error: null as { message: string } | null },
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/server/page-session", () => ({ getPageSession: session }));
vi.mock("../today/today-page-client", () => ({ default: () => null }));
vi.mock("../calendar/calendar-page-client", () => ({ CalendarPageClient: () => null }));
vi.mock("../calendar/trips/trips-page-client", () => ({ TripsPageClient: () => null }));
vi.mock("@/components/top-bar-wrapper", () => ({ TopBarWrapper: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  result.data = []; result.error = null;
  const query = { select: vi.fn(), eq: vi.fn() };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValueOnce(query).mockImplementation(() => Promise.resolve(result));
  from.mockReturnValue(query);
  session.mockResolvedValue({ user: { id: "user-1" }, supabase: { from }, error: null });
});

for (const [name, page] of [["Today", TodayPage], ["Calendar", CalendarPage], ["Trips", TripsPage]] as const) {
  describe(`${name} data guard`, () => {
    it("authenticates before querying personal data", async () => {
      session.mockResolvedValue({ user: null, error: null });
      await expect(page()).rejects.toThrow("REDIRECT:/auth/login");
      expect(from).not.toHaveBeenCalled();
    });
    it("uses the wardrobe result to route empty accounts to setup", async () => {
      await expect(page()).rejects.toThrow("REDIRECT:/onboarding");
      expect(from).toHaveBeenCalledTimes(1);
    });
    it("shows a retryable page error for a failed query instead of redirecting to setup", async () => {
      result.data = null; result.error = { message: "temporary failure" };
      await expect(page()).rejects.toThrow("Could not load your wardrobe");
      expect(redirect).not.toHaveBeenCalled();
    });
  });
}
