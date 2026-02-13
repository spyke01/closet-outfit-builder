// Re-export database types
export type {
  Category,
  WardrobeItem,
  Outfit,
  OutfitItem,
  UserPreferences,
  CreateWardrobeItemInput,
  UpdateWardrobeItemInput,
  CreateOutfitInput,
  UpdateOutfitInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  OutfitSelection,
  ApiResponse,
  PaginatedResponse,
} from './database';

// Re-export generation types
export type {
  WeatherContext,
  ColorCategory,
  FormalityBand,
  EnrichedItem,
  CompatibilityScore,
  GeneratedOutfit,
  GenerationOptions,
  SwapOptions,
} from './generation';

// Re-export sizes types
export type {
  SizeCategory,
  StandardSize,
  BrandSize,
  CategoryMeasurements,
  PinnedPreference,
  MeasurementGuide,
  MeasurementField,
  SizingFormat,
  Gender,
  DisplayMode,
  MeasurementUnit,
} from './sizes';

// Re-export onboarding types
export type {
  StyleBaseline,
  QuantityLabel,
  SubcategoryColorSelection,
  GeneratedWardrobeItem,
  WizardState,
} from './onboarding';

export { QUANTITY_MAP, INITIAL_WIZARD_STATE } from './onboarding';
