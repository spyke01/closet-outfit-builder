'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Eye, EyeOff, Cloud, CloudOff, Shirt, Monitor, Moon, Sun } from 'lucide-react';









import { useTheme } from 'next-themes';

interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  show_brands: boolean;
  weather_enabled: boolean;
  default_tuck_style: 'Tucked' | 'Untucked';
  created_at: string;
  updated_at: string;
}

const defaultPreferences = {
  theme: 'system' as const,
  show_brands: true,
  weather_enabled: true,
  default_tuck_style: 'Untucked' as const,
};

export function SettingsPageClient() {
  const { userId } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preferences once
  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    const loadPreferences = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!mounted) return;

        if (error) {
          if (error.code === 'PGRST116') {
            // No preferences found, create default ones
            const newPreferences = {
              user_id: userId,
              ...defaultPreferences,
            };

            const { data: created, error: createError } = await supabase
              .from('user_preferences')
              .insert(newPreferences)
              .select()
              .single();

            if (createError) {
              setError('Failed to create preferences');
              setLoading(false);
              return;
            }

            setPreferences(created);
          } else {
            setError('Failed to load preferences');
          }
        } else {
          setPreferences(data);
        }
        
        setLoading(false);
      } catch (err) {
        if (mounted) {
          setError('Failed to load preferences');
          setLoading(false);
        }
      }
    };

    loadPreferences();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const { setTheme } = useTheme();

  const updatePreference = async (key: keyof typeof defaultPreferences, value: any) => {
    if (!userId || !preferences) return;

    setUpdating(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_preferences')
        .update({ [key]: value })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        setError('Failed to update preference');
      } else {
        setPreferences(data);
        
        // If updating theme, also update next-themes immediately
        if (key === 'theme') {
          setTheme(value);
        }
      }
    } catch (err) {
      setError('Failed to update preference');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8" />
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Loading your preferences...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8" />
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return null;
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

        {/* Theme Selection */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Appearance</h2>
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>
                Choose your preferred color scheme. This setting will sync across all your devices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light', label: 'Light', icon: Sun, description: 'Light mode for bright environments' },
                  { value: 'dark', label: 'Dark', icon: Moon, description: 'Dark mode for low-light environments' },
                  { value: 'system', label: 'System', icon: Monitor, description: 'Follow your system preference' },
                ].map((themeOption) => {
                  const Icon = themeOption.icon;
                  const isSelected = preferences.theme === themeOption.value;

                  return (
                    <Button
                      key={themeOption.value}
                      variant={isSelected ? 'default' : 'outline'}
                      className="flex flex-col items-center gap-2 h-auto p-4"
                      onClick={() => updatePreference('theme', themeOption.value)}
                      disabled={updating}
                    >
                      <Icon className="w-6 h-6" />
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
            </CardContent>
          </Card>
        </section>

        {/* Brand Display Preference */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Display Preferences</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {preferences.show_brands ? (
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
                  checked={preferences.show_brands}
                  onCheckedChange={(checked) => updatePreference('show_brands', checked)}
                  disabled={updating}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Weather Widget Preference */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Weather Integration</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {preferences.weather_enabled ? (
                  <Cloud className="w-5 h-5" />
                ) : (
                  <CloudOff className="w-5 h-5" />
                )}
                Weather Widget
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
                  checked={preferences.weather_enabled}
                  onCheckedChange={(checked) => updatePreference('weather_enabled', checked)}
                  disabled={updating}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Default Tuck Style Preference */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Style Preferences</h2>
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
                      variant={preferences.default_tuck_style === style ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => updatePreference('default_tuck_style', style)}
                      disabled={updating}
                    >
                      {style}
                      {preferences.default_tuck_style === style && (
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
        </section>

        {updating && (
          <div className="text-center text-muted-foreground">
            Updating preferences...
          </div>
        )}
      </div>
    </div>
  );
}