'use client';

import { useTheme } from 'next-themes';
import { useUpdateUserPreferences, useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { Button } from '@/components/ui/button';
import { Monitor, Moon, Sun } from 'lucide-react';
import { SpinningIcon } from '@/components/ui/animated-icon';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { data: preferences } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = async () => {
    const currentTheme = preferences?.theme || theme || 'system';
    let newTheme: 'light' | 'dark' | 'system';
    
    // Cycle through themes: light -> dark -> system -> light
    switch (currentTheme) {
      case 'light':
        newTheme = 'dark';
        break;
      case 'dark':
        newTheme = 'system';
        break;
      default:
        newTheme = 'light';
        break;
    }

    // Update next-themes immediately for instant UI feedback
    setTheme(newTheme);
    
    // Update database preference
    try {
      await updatePreferences.mutateAsync({ theme: newTheme });
    } catch (error) {
      console.error('Failed to update theme preference:', error);
      // Revert theme on error
      if (preferences?.theme) {
        setTheme(preferences.theme);
      }
    }
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Sun className="w-4 h-4" />
      </Button>
    );
  }

  const currentTheme = preferences?.theme || theme || 'system';
  const isUpdating = updatePreferences.isPending;

  const getIcon = () => {
    const iconSize = 'w-4 h-4';
    
    switch (currentTheme) {
      case 'light':
        return (
          <SpinningIcon isSpinning={isUpdating}>
            <Sun className={iconSize} />
          </SpinningIcon>
        );
      case 'dark':
        return (
          <SpinningIcon isSpinning={isUpdating}>
            <Moon className={iconSize} />
          </SpinningIcon>
        );
      default:
        return (
          <SpinningIcon isSpinning={isUpdating}>
            <Monitor className={iconSize} />
          </SpinningIcon>
        );
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleThemeChange}
      disabled={isUpdating}
      title={`Current theme: ${currentTheme}. Click to cycle themes.`}
    >
      {getIcon()}
    </Button>
  );
}