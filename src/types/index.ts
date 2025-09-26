// Internal category keys (used in code)
export type CategoryKey = "jacket" | "shirt" | "undershirt" | "pants" | "shoes" | "belt" | "watch";

// Display category names (shown to users)
export type Category = "Jacket/Overshirt" | "Shirt" | "Undershirt" | "Pants" | "Shoes" | "Belt" | "Watch";

export type CapsuleTag = "Refined" | "Adventurer" | "Crossover" | "Shorts";

export type Season = "All" | "Summer";

export type Formality = "Refined" | "Rugged" | "Neutral";

export type TuckStyle = "Tucked" | "Untucked";

export interface WardrobeItem {
  id: string;
  name: string;
  category: Category;
  brand?: string; // Optional brand field for item identification
  color?: string;
  material?: string;
  capsuleTags?: CapsuleTag[];
  season?: Season[];
  formality?: Formality;
  formalityScore?: number; // 1-10 scale: 1=very casual, 10=very formal
  image?: string;
  active?: boolean;
}

export interface CuratedOutfit {
  id: string;
  items: string[];
  tuck?: TuckStyle;
  weight?: number;
  loved?: boolean;
}

export interface OutfitSelection {
  jacket?: WardrobeItem;
  shirt?: WardrobeItem;
  undershirt?: WardrobeItem;
  pants?: WardrobeItem;
  shoes?: WardrobeItem;
  belt?: WardrobeItem;
  watch?: WardrobeItem;
  tuck?: TuckStyle;
  loved?: boolean;
}

export interface GeneratedOutfit extends OutfitSelection {
  id: string;
  score: number;
  source: 'curated' | 'generated';
  loved?: boolean;
}

// Layer adjustment tracking for scoring transparency
export interface LayerAdjustment {
  itemId: string;
  itemName: string;
  category: Category;
  originalScore: number;
  adjustedScore: number;
  weight: number;
  reason: 'covered' | 'visible' | 'accessory';
}

// Enhanced score breakdown with weight tracking
export interface ScoreBreakdown {
  formalityScore: number;
  formalityWeight: number; // Weight applied to formality component
  consistencyBonus: number;
  consistencyWeight: number; // Weight applied to consistency component
  layerAdjustments: LayerAdjustment[]; // Per-item scoring adjustments
  total: number;
  percentage: number;
}

// User settings interface for feature toggles
export interface UserSettings {
  showBrand: boolean; // Toggle for displaying brand information
  // Future settings can be added here
}

// Utility functions for category mapping
export const categoryToKey = (category: Category): CategoryKey => {
  switch (category) {
    case "Jacket/Overshirt": return "jacket";
    case "Shirt": return "shirt";
    case "Undershirt": return "undershirt";
    case "Pants": return "pants";
    case "Shoes": return "shoes";
    case "Belt": return "belt";
    case "Watch": return "watch";
  }
};

export const keyToCategory = (key: CategoryKey): Category => {
  switch (key) {
    case "jacket": return "Jacket/Overshirt";
    case "shirt": return "Shirt";
    case "undershirt": return "Undershirt";
    case "pants": return "Pants";
    case "shoes": return "Shoes";
    case "belt": return "Belt";
    case "watch": return "Watch";
  }
};

// Location and Weather related types
export interface LocationData {
  latitude: number;
  longitude: number;
  granted: boolean;
  error?: string;
}

export interface LocationError {
  code: number;
  message: string;
  type: 'permission_denied' | 'position_unavailable' | 'timeout' | 'not_supported';
}



// Weather API response types
export interface WeatherResponse {
  current: {
    temperature: number;
    condition: string;
    icon: string;
    humidity?: number;
    windSpeed?: number;
  };
  forecast: Array<{
    date: string;
    temperature: {
      high: number;
      low: number;
    };
    condition: string;
    icon: string;
    precipitationProbability?: number;
    windSpeed?: number;
    humidity?: number;
  }>;
  location: {
    name: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
}

// Weather data interface for component consumption
export interface WeatherData {
  date: string;
  dayOfWeek: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
  precipitationChance?: number;
}

export interface WeatherWidgetProps {
  location?: { lat: number; lon: number };
  forecast: WeatherData[];
  loading?: boolean;
  error?: string;
}

// Weather service error types
export interface WeatherError {
  code: 'API_ERROR' | 'NETWORK_ERROR' | 'LOCATION_ERROR' | 'RATE_LIMIT' | 'UNAUTHORIZED' | 'TIMEOUT' | 'SERVICE_UNAVAILABLE';
  message: string;
  details?: string;
  retryAfter?: number; // Seconds to wait before retrying
  canRetry?: boolean; // Whether this error type supports retry
}

// Combined weather and location state
export interface WeatherState {
  forecast: WeatherData[];
  loading: boolean;
  error: WeatherError | null;
  lastUpdated?: Date;
  retryCount?: number;
  isFallback?: boolean; // Whether data is fallback/generic data
}

// Weather service status
export interface WeatherServiceStatus {
  available: boolean;
  error?: WeatherError;
  lastChecked: Date;
  nextRetryAt?: Date;
}

// Test utility types to replace 'any' usage
export interface MockFunction<TArgs extends unknown[] = unknown[], TReturn = unknown> {
  (...args: TArgs): TReturn;
  mockReturnValue: (value: TReturn) => MockFunction<TArgs, TReturn>;
  mockResolvedValue: (value: TReturn) => MockFunction<TArgs, Promise<TReturn>>;
  mockRejectedValue: (error: unknown) => MockFunction<TArgs, Promise<TReturn>>;
  mockImplementation: (fn: (...args: TArgs) => TReturn) => MockFunction<TArgs, TReturn>;
  mockClear: () => void;
  mockReset: () => void;
}

export interface TestComponentProps {
  [key: string]: unknown;
}

export interface TestRenderResult {
  container: HTMLElement;
  getByText: (text: string) => HTMLElement;
  getByTestId: (testId: string) => HTMLElement;
  queryByText: (text: string) => HTMLElement | null;
  queryByTestId: (testId: string) => HTMLElement | null;
  rerender: (props: TestComponentProps) => void;
  unmount: () => void;
}

// Service error handling types
export interface ServiceResponse<T> {
  data?: T;
  error?: ServiceError;
  success: boolean;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
}