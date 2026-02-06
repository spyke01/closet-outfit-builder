'use client';

import { useTheme } from 'next-themes';
import { useUpdateUserPreferences, useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, Moon, Sun } from 'lucide-react';



import { useCallback, useEffect, useState } from 'react';

const themes = [
  {
    value: 'light',
    label: 'Light',
    icon: Sun,
    description: 'Light mode for bright environments',
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: Moon,
    description: 'Dark mode for low-light environments',
  },
  {
    value: 'system',
    label: 'System',
    icon: Monitor,
    description: 'Follow your system preference',
  },
] as const;

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoize the theme change handler to prevent re-renders
  const handleThemeChange = useCallback(async (newTheme: 'light' | 'dark' | 'system') => {
    // Update next-themes immediately for instant UI feedback
    setTheme(newTheme);
    
    // Update database preference (fire and forget to prevent blocking)
    updatePreferences.mutate({ theme: newTheme }, {
      onError: (error) => {
        console.error('Failed to update theme preference:', error);
        // Revert theme on error
        if (preferences?.theme) {
          setTheme(preferences.theme);
        }
      }
    });
  }, [setTheme, updatePreferences, preferences?.theme]);

  if (!mounted || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Choose your preferred color scheme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((themeOption) => (
              <div
                key={themeOption.value}
                className="flex flex-col items-center gap-2 p-4 border rounded-lg animate-pulse"
              >
                <div className="w-6 h-6 bg-muted rounded" />
                <div className="w-12 h-4 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentTheme = preferences?.theme || theme || 'system';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>
          Choose your preferred color scheme. This setting will sync across all your devices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon;
            const isSelected = currentTheme === themeOption.value;
            const isUpdating = updatePreferences.isPending && theme === themeOption.value;

            return (
              <Button
                key={themeOption.value}
                variant={isSelected ? 'default' : 'outline'}
                className="flex flex-col items-center gap-2 h-auto p-4"
                onClick={() => handleThemeChange(themeOption.value)}
                disabled={updatePreferences.isPending}
              >
                <Icon className={`w-6 h-6 ${isUpdating ? 'animate-spin' : ''}`} />
                <div className="text-center">
                  <div className="font-medium">{themeOption.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {themeOption.description}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
        
        {updatePreferences.error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              Failed to save theme preference. Please try again.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}