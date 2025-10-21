'use client';

import { ThemeSettings } from '@/components/theme-switcher';
import { PreferencesForm } from '@/components/preferences-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useResetUserPreferences, useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { RotateCcw, Settings } from 'lucide-react';
import { useCallback, useState } from 'react';

export function SettingsPageClient() {
  const resetPreferences = useResetUserPreferences();
  const { isLoading: preferencesLoading } = useUserPreferences();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Memoize handlers to prevent re-renders
  const handleResetPreferences = useCallback(async () => {
    try {
      await resetPreferences.mutateAsync();
      setShowResetConfirm(false);
    } catch (error) {
      console.error('Failed to reset preferences:', error);
    }
  }, [resetPreferences]);

  const handleShowResetConfirm = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  const handleCancelReset = useCallback(() => {
    setShowResetConfirm(false);
  }, []);

  // Show loading state while preferences are being fetched
  if (preferencesLoading) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto p-6">
        <div className="flex flex-col gap-8">
          {/* Header skeleton */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded animate-pulse" />
            <div>
              <div className="w-32 h-8 bg-muted rounded animate-pulse mb-2" />
              <div className="w-64 h-5 bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* Content skeletons */}
          {[1, 2, 3].map((i) => (
            <section key={i}>
              <div className="w-24 h-6 bg-muted rounded animate-pulse mb-4" />
              <div className="w-full h-32 bg-muted rounded animate-pulse" />
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-6">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground">
                Customize your wardrobe experience and preferences
              </p>
            </div>
          </div>

          {/* Theme Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Appearance</h2>
            <ThemeSettings />
          </section>

          {/* User Preferences */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Preferences</h2>
            <PreferencesForm />
          </section>

          {/* Reset Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Reset</h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <RotateCcw className="w-5 h-5" />
                  Reset All Preferences
                </CardTitle>
                <CardDescription>
                  Reset all your preferences to their default values. This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showResetConfirm ? (
                  <Button
                    variant="destructive"
                    onClick={handleShowResetConfirm}
                    disabled={resetPreferences.isPending}
                  >
                    Reset to Defaults
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        Are you sure you want to reset all preferences?
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        This will restore theme, display, weather, and tuck style settings to their defaults.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="destructive"
                        onClick={handleResetPreferences}
                        disabled={resetPreferences.isPending}
                      >
                        {resetPreferences.isPending ? 'Resetting...' : 'Yes, Reset All'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelReset}
                        disabled={resetPreferences.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                {resetPreferences.error && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">
                      Failed to reset preferences. Please try again.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    );
}