import { useEffect, useState } from "react";
import {
  categories,
  items,
  outfits,
  entries,
  user,
  weather,
  trip,
} from "./fixtures";
export const query = (data) => ({
  data,
  isLoading: false,
  error: null,
  refetch: async () => ({ data }),
});
export const navigate = (href, replace = false) => {
  const target = new URL(href, location.origin),
    url = new URL(location.href);
  url.search = "";
  url.searchParams.set("screen", target.pathname);
  for (const [key, value] of target.searchParams)
    url.searchParams.set(key, value);
  history[replace ? "replaceState" : "pushState"]({}, "", url);
  window.dispatchEvent(new Event("fixture-change"));
};
export function useVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const tick = () => setV((v) => v + 1);
    window.addEventListener("fixture-change", tick);
    window.addEventListener("popstate", tick);
    return () => {
      window.removeEventListener("fixture-change", tick);
      window.removeEventListener("popstate", tick);
    };
  }, []);
  return v;
}
export const changed = () => {
  localStorage.setItem("experience-fixture-items", JSON.stringify(items));
  localStorage.setItem("experience-fixture-outfits", JSON.stringify(outfits));
  localStorage.setItem("experience-fixture-entries", JSON.stringify(entries));
  window.dispatchEvent(new Event("fixture-change"));
};
const mutation = (fn = async () => ({})) => ({
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
  mutate: (...args) => void fn(...args),
  mutateAsync: fn,
  reset: () => {},
});
const createClient = () => ({
  auth: {
    getUser: async () => ({ data: { user } }),
    getSession: async () => ({ data: { session: { user } } }),
    signOut: async () => ({ error: null }),
  },
  functions: {
    invoke: async () => ({ data: { is_duplicate: false }, error: null }),
  },
  from: (table) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve) =>
        Promise.resolve({
          data:
            table === "categories"
              ? categories
              : table === "outfits"
                ? outfits.map((outfit) => ({
                    ...outfit,
                    outfit_items: outfit.items.map((item) => ({
                      item_id: item.id,
                    })),
                  }))
                : [],
          error: null,
        }).then(resolve),
    };
    return chain;
  },
});
export const special = {
  useCategories: () => query(categories),
  useWardrobeItems: () => {
    useVersion();
    return query(items);
  },
  useWardrobeItem: (id) => {
    useVersion();
    return query(items.find((item) => item.id === id));
  },
  useOutfits: () => {
    useVersion();
    return query(outfits);
  },
  useRouter: () => ({
    push: navigate,
    replace: (href) => navigate(href, true),
    refresh: changed,
    back: () => history.back(),
  }),
  usePathname: () => {
    useVersion();
    return new URL(location.href).searchParams.get("screen") || "/today";
  },
  useSearchParams: () => {
    useVersion();
    const url = new URL(location.href);
    url.searchParams.delete("screen");
    return url.searchParams;
  },
  useAuth: () => ({
    user,
    userId: user.id,
    isAuthenticated: true,
    loading: false,
  }),
  useWeather: () => weather,
  useAppWeather: () => weather,
  useConditionalWeather: () => weather,
  useWeatherPreference: () => true,
  useBillingEntitlements: () => ({
    entitlements: {
      isPaid: true,
      effectivePlanCode: "plus",
      plan: { limits: { wardrobe_items: 500 } },
    },
    loading: false,
  }),
  useAdminPortalAccess: () => ({ isAdminPortalUser: false, loading: false }),
  useUserPreferences: () =>
    query({ theme: "dark", show_brands: true, weather_enabled: true }),
  useUpdateUserPreferences: () =>
    mutation(async (value) => {
      localStorage.setItem("fixture-theme", value.theme);
      document.documentElement.dataset.theme = value.theme;
      document.documentElement.classList.toggle("dark", value.theme === "dark");
      changed();
    }),
  useTheme: () => ({
    theme: localStorage.getItem("fixture-theme") || "dark",
    resolvedTheme: localStorage.getItem("fixture-theme") || "dark",
    setTheme: (value) => {
      document.documentElement.dataset.theme = value;
      document.documentElement.classList.toggle("dark", value === "dark");
      localStorage.setItem("fixture-theme", value);
      changed();
    },
  }),
  useNavigationPreloading: () => ({ getNavigationProps: () => ({}) }),
  useWalkthrough: () => ({
    isActive: false,
    currentStep: 1,
    start: () => {},
    complete: () => {},
  }),
  useGenerateWardrobeItemImage: () => ({
    generateAsync: async () => {
      throw new Error("Paid inference is disabled in fixtures");
    },
  }),
  useImageGenerationQuota: () => ({
    canGenerate: false,
    isFreeTier: false,
    limits: { monthly_remaining: 25, monthly_limit: 30 },
    isLoading: false,
  }),
  useCalendarEntriesByMonth: () => {
    useVersion();
    return query({
      entries,
      wornEntriesThisMonth: entries.filter((e) => e.status === "worn").length,
    });
  },
  useCreateCalendarEntry: () =>
    mutation(async (input) => {
      const entry = {
        ...input,
        id: crypto.randomUUID(),
        items: items.filter((item) => input.item_ids.includes(item.id)),
      };
      entries.push(entry);
      changed();
      return entry;
    }),
  useUpdateCalendarEntry: () =>
    mutation(async (input) => {
      const found = entries.find((entry) => entry.id === input.id);
      if (found)
        Object.assign(
          found,
          input,
          input.item_ids
            ? {
                items: items.filter((item) => input.item_ids.includes(item.id)),
              }
            : {},
        );
      changed();
      return found;
    }),
  useDeleteCalendarEntry: () =>
    mutation(async (id) => {
      const index = entries.findIndex((entry) => entry.id === id);
      entries.splice(index, 1);
      changed();
    }),
  useCreateWardrobeItem: () =>
    mutation(async (input) => {
      const item = {
        ...input,
        id: crypto.randomUUID(),
        user_id: user.id,
        category: categories.find((cat) => cat.id === input.category_id),
      };
      items.push(item);
      changed();
      return item;
    }),
  useUpdateWardrobeItem: () =>
    mutation(async (input) => {
      const item = items.find((item) => item.id === input.id);
      Object.assign(item, input);
      changed();
      return item;
    }),
  useCreateOutfit: () => mutation(async (input) => special.createOutfit(input)),
  createOutfit: async (input) => {
    outfits.push({
      ...input,
      id: crypto.randomUUID(),
      items: items.filter((item) => input.items.includes(item.id)),
    });
    changed();
    return { success: true };
  },
  markTodayAiOutfitSaved: async () => ({ success: true }),
  useTrips: () => query([trip]),
  useTripDetail: () =>
    query({
      ...trip,
      days: [
        {
          id: "day-1",
          trip_id: trip.id,
          day_date: trip.start_date,
          slot_number: 1,
          slot_label: "Daytime",
          outfit_id: outfits[0].id,
          outfit: outfits[0],
          items: outfits[0].items,
          slots: [],
        },
      ],
      pack_items: [],
    }),
  useFindTripOverlaps: () => mutation(async () => []),
  createClient,
};
export function mock(name, args) {
  if (special[name]) return special[name](...args);
  if (/Mutation|Create|Update|Delete|Seed|Reset/.test(name)) return mutation();
  return query([]);
}
