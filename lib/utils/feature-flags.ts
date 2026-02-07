/**
 * Feature flags for conditional module loading
 * Prevents heavy modules from being bundled when features are disabled
 */

export interface FeatureFlags {
  weather: boolean;
  imageProcessing: boolean;
  monitoring: boolean;
  analytics: boolean;
  devTools: boolean;
  sizeManagement: boolean;
}

/**
 * Get feature flags based on environment and user preferences
 */
export function getFeatureFlags(): FeatureFlags {
  // Check if we're in browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // Base flags from environment
  const flags: FeatureFlags = {
    weather: true, // Default enabled, will be overridden by user preference
    imageProcessing: true, // Always available for authenticated users
    monitoring: process.env.NODE_ENV === 'production',
    analytics: process.env.NODE_ENV === 'production',
    devTools: process.env.NODE_ENV === 'development',
    sizeManagement: true, // My Sizes feature enabled by default
  };

  // In browser, check for additional feature flags from localStorage or URL params
  if (isBrowser) {
    try {
      // Check URL params for feature overrides (useful for testing)
      const urlParams = new URLSearchParams(window.location.search);
      
      if (urlParams.has('disable-weather')) {
        flags.weather = false;
      }
      
      if (urlParams.has('disable-monitoring')) {
        flags.monitoring = false;
      }
      
      if (urlParams.has('enable-dev-tools')) {
        flags.devTools = true;
      }

      // Check localStorage for persistent feature flags
      const storedFlags = localStorage.getItem('feature-flags');
      if (storedFlags) {
        const parsed = JSON.parse(storedFlags);
        Object.assign(flags, parsed);
      }
    } catch (error) {
      // Silently fail if localStorage is not available (incognito mode)
      console.warn('Failed to read feature flags from localStorage:', error);
    }
  }

  return flags;
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature];
}

/**
 * Conditionally load a module only if the feature is enabled
 */
export async function conditionalImport<T>(
  feature: keyof FeatureFlags,
  importFn: () => Promise<T>
): Promise<T | null> {
  if (!isFeatureEnabled(feature)) {
    return null;
  }

  // Add typeof window check to prevent SSR bundling
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return await importFn();
  } catch (error) {
    console.warn(`Failed to load module for feature ${feature}:`, error);
    return null;
  }
}

/**
 * Set feature flags (useful for testing and user preferences)
 */
export function setFeatureFlags(flags: Partial<FeatureFlags>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const currentFlags = getFeatureFlags();
    const newFlags = { ...currentFlags, ...flags };
    localStorage.setItem('feature-flags', JSON.stringify(newFlags));
  } catch (error) {
    console.warn('Failed to save feature flags to localStorage:', error);
  }
}

/**
 * Reset feature flags to defaults
 */
export function resetFeatureFlags(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem('feature-flags');
  } catch (error) {
    console.warn('Failed to reset feature flags:', error);
  }
}