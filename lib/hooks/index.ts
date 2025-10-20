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
  useUpdatePreference,
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