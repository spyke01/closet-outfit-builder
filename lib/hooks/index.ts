// Wardrobe items hooks
export {
  useWardrobeItems,
  useWardrobeItem,
  useCreateWardrobeItem,
  useUpdateWardrobeItem,
  useDeleteWardrobeItem,
} from './use-wardrobe-items';

// Outfit management hooks
export {
  useOutfits,
  useOutfit,
  useOutfitsByAnchor,
  useCheckOutfitDuplicate,
  useScoreOutfit,
  useCreateOutfit,
  useUpdateOutfit,
  useDeleteOutfit,
} from './use-outfits';

// Category management hooks
export {
  useCategories,
  useCategory,
  useAnchorCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useReorderCategories,
} from './use-categories';

// User preferences hooks
export {
  useUserPreferences,
  useUpdateUserPreferences,
  useResetUserPreferences,
  usePreference,
} from './use-user-preferences';

// Weather preference hooks
export {
  useWeatherPreference,
  useShowWeather,
} from './use-weather-preference';

// Weather data hooks
export {
  useWeather,
  type WeatherData,
  type WeatherResponse,
  type WeatherError,
} from './use-weather';

// Authentication hooks
export { useAuth } from './use-auth';

// Realtime subscription hooks
export { useWardrobeRealtime } from './use-realtime-wardrobe';

// Advanced pattern hooks
export { useLatest } from './use-latest';
export { useEventCallback, useStableCallback } from './use-event-callback';

// Calendar hooks
export {
  useCalendarEntriesByMonth,
  useCreateCalendarEntry,
  useUpdateCalendarEntry,
  useDeleteCalendarEntry,
  sanitizeCalendarNotes,
} from './use-calendar-entries';

// Trip planner hooks
export {
  useTrips,
  useTripDetail,
  useCreateTrip,
  useUpdateTrip,
  useDeleteTrip,
  useCreateTripDay,
  useUpdateTripDay,
  useDeleteTripDay,
  useCreateTripPackItem,
  useUpdateTripPackItem,
  useDeleteTripPackItem,
  useFindTripOverlaps,
  sanitizePackLabel,
} from './use-trips';
