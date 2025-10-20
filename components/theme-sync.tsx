'use client';

import React, { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';

/**
 * Component that synchronizes the user's theme preference from the database
 * with the next-themes provider. This ensures theme consistency across devices.
 */
export const ThemeSync = React.memo(function ThemeSync() {
  const { setTheme } = useTheme();
  const { data: preferences, isLoading } = useUserPreferences();

  useEffect(() => {
    // Only sync if preferences are loaded and theme is available
    if (!isLoading && preferences?.theme) {
      setTheme(preferences.theme);
    }
  }, [preferences?.theme, isLoading, setTheme]);

  // This component doesn't render anything
  return null;
});