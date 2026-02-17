'use client';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'components-preferences-form' });
import React from 'react';
import { useUserPreferences, useUpdateUserPreferences } from '@/lib/hooks/use-user-preferences';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, Cloud, CloudOff, Shirt } from 'lucide-react';






export function PreferencesForm() {
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  
  // Use stable values to prevent re-renders
  const showBrands = preferences?.show_brands ?? true;
  const weatherEnabled = preferences?.weather_enabled ?? true;
  const defaultTuckStyle = preferences?.default_tuck_style ?? 'Untucked';

  const handleToggle = React.useCallback(async (key: string, value: boolean | string) => {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
    } catch (error) {
      logger.error(`Failed to update ${key}:`, error);
    }
  }, [updatePreferences]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="w-32 h-5 bg-muted rounded animate-pulse" />
              <div className="w-48 h-4 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="w-12 h-6 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brand Display Preference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {showBrands ? (
              <Eye className="w-5 h-5" />
            ) : (
              <EyeOff className="w-5 h-5" />
            )}
            Brand Display
          </CardTitle>
          <CardDescription>
            Show or hide brand names on wardrobe items and outfits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-brands" className="flex flex-col gap-1">
              <span>Show brand names</span>
              <span className="text-sm text-muted-foreground">
                Display brand information on clothing items
              </span>
            </Label>
            <Switch
              id="show-brands"
              checked={showBrands}
              onCheckedChange={(checked) => handleToggle('show_brands', checked)}
              disabled={updatePreferences.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Weather Widget Preference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {weatherEnabled ? (
              <Cloud className="w-5 h-5" />
            ) : (
              <CloudOff className="w-5 h-5" />
            )}
            Weather Integration
          </CardTitle>
          <CardDescription>
            Enable weather-based outfit recommendations and forecasts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="weather-enabled" className="flex flex-col gap-1">
              <span>Enable weather widget</span>
              <span className="text-sm text-muted-foreground">
                Show weather information and seasonal outfit suggestions
              </span>
            </Label>
            <Switch
              id="weather-enabled"
              checked={weatherEnabled}
              onCheckedChange={(checked) => handleToggle('weather_enabled', checked)}
              disabled={updatePreferences.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Default Tuck Style Preference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shirt className="w-5 h-5" />
            Default Tuck Style
          </CardTitle>
          <CardDescription>
            Choose your preferred default tuck style for new outfits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label className="text-sm font-medium">Tuck Style Preference</Label>
            <div className="flex gap-3">
              {(['Tucked', 'Untucked'] as const).map((style) => (
                <Button
                  key={style}
                  variant={defaultTuckStyle === style ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => handleToggle('default_tuck_style', style)}
                  disabled={updatePreferences.isPending}
                >
                  {style}
                  {defaultTuckStyle === style && (
                    <span className="ml-2 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      Default
                    </span>
                  )}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              This will be the default tuck style when creating new outfits
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {updatePreferences.error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <div className="w-2 h-2 bg-destructive rounded-full" />
              <p className="text-sm">
                Failed to save preferences. Please try again.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}