'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/use-auth';
import { useAccountSettings } from '@/lib/hooks/use-account-settings';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ImageUpload } from '@/components/image-upload';
import {
  Monitor,
  Moon,
  Sun,
  Eye,
  UserCircle,
  Lock,
  Link2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

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

const defaultPreferences: Pick<
  UserPreferences,
  'theme' | 'show_brands' | 'weather_enabled' | 'default_tuck_style'
> = {
  theme: 'system',
  show_brands: true,
  weather_enabled: true,
  default_tuck_style: 'Untucked',
};

type PreferenceKey = keyof typeof defaultPreferences;
type PreferenceValue<K extends PreferenceKey> = (typeof defaultPreferences)[K];
type InlineAlert = {
  variant: 'success' | 'destructive' | 'warning' | 'info';
  message: string;
};

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

function AnnotatedSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
      <div>
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Icon className="h-5 w-5" />
          <h2>{title}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

export function SettingsPageClient() {
  const { userId } = useAuth();
  const { setTheme } = useTheme();

  const {
    loading: accountLoading,
    saving: accountSaving,
    error: accountError,
    profile,
    identities,
    hasPasswordCredential,
    updateProfile,
    updateEmail,
    updatePassword,
    linkGoogleIdentity,
    unlinkIdentity,
  } = useAccountSettings();

  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileAlert, setProfileAlert] = useState<InlineAlert | null>(null);
  const [passwordAlert, setPasswordAlert] = useState<InlineAlert | null>(null);
  const [identityAlert, setIdentityAlert] = useState<InlineAlert | null>(null);

  useEffect(() => {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setEmail(profile.email);
    setAvatarUrl(profile.avatarUrl);
    setAvatarChanged(false);
  }, [profile.avatarUrl, profile.email, profile.firstName, profile.lastName]);

  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    const loadPreferences = async () => {
      try {
        const supabase = createClient();
        const { data, error: selectError } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!mounted) return;

        if (selectError) {
          if (selectError.code === 'PGRST116') {
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
      } catch {
        if (mounted) {
          setError('Failed to load preferences');
          setLoading(false);
        }
      }
    };

    loadPreferences().catch(() => {
      if (mounted) {
        setError('Failed to load preferences');
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [userId]);

  const updatePreference = async <K extends PreferenceKey>(
    key: K,
    value: PreferenceValue<K>
  ) => {
    if (!userId || !preferences) return;

    setUpdating(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from('user_preferences')
        .update({ [key]: value })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        setError('Failed to update preference');
      } else {
        setPreferences(data);
        if (key === 'theme') {
          setTheme(value as UserPreferences['theme']);
        }
      }
    } catch {
      setError('Failed to update preference');
    } finally {
      setUpdating(false);
    }
  };

  const googleIdentity = useMemo(
    () => identities.find((identity) => identity.provider === 'google'),
    [identities]
  );

  const canDisconnectGoogle = Boolean(
    googleIdentity && (hasPasswordCredential || identities.length > 1)
  );

  const handleProfileSave = async () => {
    setProfileAlert(null);
    const profileResult = await updateProfile({
      firstName,
      lastName,
      avatarUrl: avatarChanged ? avatarUrl : undefined,
    });
    if (!profileResult.success) {
      setProfileAlert({ variant: 'destructive', message: 'Failed to update profile.' });
      return;
    }

    if (email.trim() && email.trim() !== profile.email) {
      const emailResult = await updateEmail(email);
      if (!emailResult.success) {
        setProfileAlert({ variant: 'destructive', message: 'Failed to update email address.' });
        return;
      }
      setProfileAlert({
        variant: 'success',
        message: 'Profile updated. Check your email to confirm your new address.',
      });
      return;
    }

    setProfileAlert({ variant: 'success', message: 'Profile updated successfully.' });
  };

  const handlePasswordSave = async () => {
    setPasswordAlert(null);

    if (newPassword.length < 8) {
      setPasswordAlert({ variant: 'warning', message: 'Password must be at least 8 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordAlert({ variant: 'warning', message: 'Password confirmation does not match.' });
      return;
    }

    const result = await updatePassword(newPassword);
    if (!result.success) {
      setPasswordAlert({ variant: 'destructive', message: 'Failed to update password.' });
      return;
    }

    setPasswordAlert({ variant: 'success', message: 'Password updated successfully.' });
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleDisconnectGoogle = async () => {
    setIdentityAlert(null);
    if (!googleIdentity) return;

    if (!canDisconnectGoogle) {
      setIdentityAlert({
        variant: 'warning',
        message: 'Set a password before disconnecting Google so you do not lose access.',
      });
      return;
    }

    const result = await unlinkIdentity(googleIdentity);
    if (result.success) {
      setIdentityAlert({ variant: 'success', message: 'Google account disconnected.' });
    } else {
      setIdentityAlert({ variant: 'destructive', message: 'Failed to disconnect Google account.' });
    }
  };

  const handleConnectGoogle = async () => {
    setIdentityAlert(null);
    const result = await linkGoogleIdentity();
    if (!result.success) {
      setIdentityAlert({ variant: 'destructive', message: 'Failed to start Google connection flow.' });
    }
  };

  if (loading || accountLoading) {
    return (
      <div className="flex-1 w-full max-w-6xl mx-auto p-6">
        <div>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Loading your profile and preferences...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div className="flex-1 w-full max-w-6xl mx-auto p-6">
        <div>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!preferences) return null;

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto p-6">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your profile, security, connected accounts, and experience preferences.</p>
        </div>

        <AnnotatedSection
          title="Profile"
          description="Update your name, email, and avatar."
          icon={UserCircle}
        >
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Your avatar is automatically centered, cropped to square, and resized to 400 by 400.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Profile Image</Label>
                <ImageUpload
                  mode="avatar"
                  recommendedAspect="square"
                  removeBackground={false}
                  onUpload={(url) => {
                    setAvatarUrl(url);
                    setAvatarChanged(true);
                  }}
                  onError={(message) => setProfileAlert({ variant: 'destructive', message })}
                  className="w-full"
                />
                {avatarUrl && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Selected avatar URL ready to save.</span>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                <p className="mt-1 text-xs text-muted-foreground">Changing your email requires confirmation through your inbox.</p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">Save profile changes when you are ready.</div>
                <Button onClick={handleProfileSave} disabled={accountSaving}>Save Profile</Button>
              </div>

              {profileAlert && (
                <Alert variant={profileAlert.variant}>
                  {profileAlert.variant === 'success' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{profileAlert.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </AnnotatedSection>

        <AnnotatedSection
          title="Security"
          description="Change your account password."
          icon={Lock}
        >
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Use at least 8 characters for better account security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handlePasswordSave} disabled={accountSaving}>Update Password</Button>
              </div>
              {passwordAlert && (
                <Alert variant={passwordAlert.variant}>
                  {passwordAlert.variant === 'success' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{passwordAlert.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </AnnotatedSection>

        <AnnotatedSection
          title="Connected Accounts"
          description="Manage sign-in methods linked to your account."
          icon={Link2}
        >
          <Card>
            <CardHeader>
              <CardTitle>Google</CardTitle>
              <CardDescription>Connect Google for faster sign-in and disconnect it safely when another sign-in method exists.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Connection Status</p>
                  <p className="text-sm text-muted-foreground">
                    {googleIdentity ? 'Connected' : 'Not connected'}
                  </p>
                </div>
                {googleIdentity ? (
                  <Button
                    variant="outline"
                    onClick={handleDisconnectGoogle}
                    disabled={accountSaving || !canDisconnectGoogle}
                  >
                    Disconnect Google
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleConnectGoogle} disabled={accountSaving}>
                    Connect Google
                  </Button>
                )}
              </div>
              {!canDisconnectGoogle && googleIdentity && (
                <p className="text-sm text-muted-foreground">
                  Add a password before disconnecting Google so your account remains accessible.
                </p>
              )}
              {identityAlert && (
                <Alert variant={identityAlert.variant}>
                  {identityAlert.variant === 'success' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{identityAlert.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </AnnotatedSection>

        <AnnotatedSection
          title="Appearance"
          description="Choose your preferred color scheme."
          icon={Monitor}
        >
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Theme preference syncs across your devices.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {themeOptions.map((themeOption) => {
                  const Icon = themeOption.icon;
                  const isSelected = preferences.theme === themeOption.value;

                  return (
                    <Button
                      key={themeOption.value}
                      variant={isSelected ? 'default' : 'outline'}
                      className="flex h-auto flex-col items-center gap-2 p-4"
                      onClick={() => updatePreference('theme', themeOption.value)}
                      disabled={updating}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{themeOption.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </AnnotatedSection>

        <AnnotatedSection
          title="Display Preferences"
          description="Control visual details shown on wardrobe items and outfits."
          icon={Eye}
        >
          <Card>
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-center justify-between gap-6">
                <div className="min-w-0">
                  <p className="font-medium">Show Brand Names</p>
                  <p className="text-sm text-muted-foreground">Display brand information on wardrobe items.</p>
                </div>
                <div className="shrink-0">
                  <Switch
                    id="show-brands"
                    checked={preferences.show_brands}
                    onCheckedChange={(checked) => updatePreference('show_brands', checked)}
                    disabled={updating}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-5 flex items-center justify-between gap-6">
                <div className="min-w-0">
                  <p className="font-medium">Weather Integration</p>
                  <p className="text-sm text-muted-foreground">Show weather conditions and seasonal outfit suggestions.</p>
                </div>
                <div className="shrink-0">
                  <Switch
                    id="weather-enabled"
                    checked={preferences.weather_enabled}
                    onCheckedChange={(checked) => updatePreference('weather_enabled', checked)}
                    disabled={updating}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-5 flex items-center justify-between gap-6">
                <div className="min-w-0">
                  <p className="font-medium">Default Tuck Style</p>
                  <p className="text-sm text-muted-foreground">This style is preselected when creating outfits.</p>
                </div>
                <div className="shrink-0 flex gap-2">
                  {(['Tucked', 'Untucked'] as const).map((style) => (
                    <Button
                      key={style}
                      variant={preferences.default_tuck_style === style ? 'default' : 'outline'}
                      onClick={() => updatePreference('default_tuck_style', style)}
                      disabled={updating}
                    >
                      {style}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </AnnotatedSection>

        {(updating || accountSaving) && (
          <div className="text-center text-muted-foreground">Saving changes...</div>
        )}

        {(error || accountError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || accountError}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
