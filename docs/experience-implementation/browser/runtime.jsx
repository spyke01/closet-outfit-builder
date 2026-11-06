import { useEffect, useState } from "react";
import {
  categories,
  items,
  outfits,
  entries,
  user,
  weather,
  trip,
  tripsList,
  tripDays,
  tripPackItems,
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
  localStorage.setItem("experience-fixture-trips", JSON.stringify(tripsList));
  localStorage.setItem(
    "experience-fixture-trip-days",
    JSON.stringify(tripDays),
  );
  localStorage.setItem(
    "experience-fixture-trip-pack",
    JSON.stringify(tripPackItems),
  );
  window.dispatchEvent(new Event("fixture-change"));
};
const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
  useConditionalWeather: () => {
    const mode = new URL(location.href).searchParams.get("weather");
    if (mode === "loading")
      return {
        ...weather,
        current: null,
        forecast: [],
        weatherEnabled: false,
        preferenceLoading: true,
      };
    if (mode === "error")
      return {
        ...weather,
        current: null,
        forecast: [],
        weatherEnabled: false,
        preferenceError: true,
        weatherDisabledReason: "preferences-error",
        retryPreferences: changed,
      };
    if (
      mode === "off" &&
      localStorage.getItem("fixture-weather-enabled") !== "true"
    )
      return {
        ...weather,
        current: null,
        forecast: [],
        weatherEnabled: false,
        weatherDisabledReason: "preference-off",
        retryPreferences: changed,
      };
    return weather;
  },
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
      if (value.theme) {
        localStorage.setItem("fixture-theme", value.theme);
        document.documentElement.dataset.theme = value.theme;
        document.documentElement.classList.toggle(
          "dark",
          value.theme === "dark",
        );
      }
      if (value.weather_enabled !== undefined)
        localStorage.setItem(
          "fixture-weather-enabled",
          String(value.weather_enabled),
        );
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
  useTrips: () => {
    useVersion();
    return query(tripsList);
  },
  useTripDetail: (id) => {
    useVersion();
    const detail = () => {
      const selected = tripsList.find((item) => item.id === id);
      return selected
        ? {
            ...selected,
            days: tripDays.filter((day) => day.trip_id === id),
            pack_items: tripPackItems.filter((item) => item.trip_id === id),
          }
        : undefined;
    };
    return { ...query(detail()), refetch: async () => ({ data: detail() }) };
  },
  useCreateTrip: () =>
    mutation(async (input) => {
      const created = { ...input, id: crypto.randomUUID() };
      tripsList.push(created);
      for (
        let cursor = new Date(input.start_date + "T12:00:00");
        dateKey(cursor) <= input.end_date;
        cursor.setDate(cursor.getDate() + 1)
      )
        tripDays.push({
          id: crypto.randomUUID(),
          trip_id: created.id,
          day_date: dateKey(cursor),
          slot_number: 1,
          items: [],
        });
      changed();
      return created;
    }),
  useUpdateTrip: () =>
    mutation(async (input) => {
      const found = tripsList.find((item) => item.id === input.id);
      Object.assign(found, input);
      changed();
      return found;
    }),
  useDeleteTrip: () =>
    mutation(async (id) => {
      const index = tripsList.findIndex((item) => item.id === id);
      if (index >= 0) tripsList.splice(index, 1);
      changed();
    }),
  useCreateTripDay: () =>
    mutation(async (input) => {
      const created = { ...input, id: crypto.randomUUID(), items: [] };
      tripDays.push(created);
      changed();
      return created;
    }),
  useUpdateTripDay: () =>
    mutation(async (input) => {
      const found = tripDays.find((day) => day.id === input.id);
      Object.assign(found, input, {
        outfit: input.outfit_id
          ? outfits.find((item) => item.id === input.outfit_id)
          : null,
        ...(input.item_ids
          ? { items: items.filter((item) => input.item_ids.includes(item.id)) }
          : {}),
      });
      changed();
      return found;
    }),
  useDeleteTripDay: () =>
    mutation(async (input) => {
      const index = tripDays.findIndex((day) => day.id === input.tripDayId);
      if (index >= 0) tripDays.splice(index, 1);
      changed();
    }),
  useCreateTripPackItem: () =>
    mutation(async (input) => {
      const created = { ...input, id: crypto.randomUUID() };
      tripPackItems.push(created);
      changed();
      return created;
    }),
  useUpdateTripPackItem: () =>
    mutation(async (input) => {
      const found = tripPackItems.find((item) => item.id === input.id);
      Object.assign(found, input);
      changed();
      return found;
    }),
  useDeleteTripPackItem: () =>
    mutation(async (input) => {
      const index = tripPackItems.findIndex(
        (item) => item.id === input.tripPackItemId,
      );
      if (index >= 0) tripPackItems.splice(index, 1);
      changed();
    }),
  useFindTripOverlaps: () => mutation(async () => []),
  createClient,
};
export function mock(name, args) {
  if (special[name]) return special[name](...args);
  if (/Mutation|Create|Update|Delete|Seed|Reset/.test(name)) return mutation();
  return query([]);
}
