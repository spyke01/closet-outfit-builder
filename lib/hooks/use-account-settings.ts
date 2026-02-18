import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, UserIdentity } from '@supabase/supabase-js';
import { useAuth } from './use-auth';

type UserMetadata = Record<string, unknown>;

export interface AccountProfile {
  firstName: string;
  lastName: string;
  avatarUrl: string;
  email: string;
}

export function useAccountSettings() {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [identities, setIdentities] = useState<UserIdentity[]>([]);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setUser(null);
      setIdentities([]);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const [{ data: userData, error: userError }, { data: identityData, error: identityError }] =
        await Promise.all([supabase.auth.getUser(), supabase.auth.getUserIdentities()]);

      if (userError) throw userError;
      if (identityError) throw identityError;

      setUser(userData.user);
      setIdentities(identityData.identities ?? []);
    } catch {
      setError('Failed to load account settings');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const profile = useMemo<AccountProfile>(() => {
    const metadata = (user?.user_metadata ?? {}) as UserMetadata;
    const providerAvatar =
      typeof metadata.picture === 'string'
        ? metadata.picture
        : typeof metadata.avatar_url === 'string'
          ? metadata.avatar_url
          : '';
    return {
      firstName: typeof metadata.first_name === 'string' ? metadata.first_name : '',
      lastName: typeof metadata.last_name === 'string' ? metadata.last_name : '',
      avatarUrl: providerAvatar,
      email: user?.email ?? '',
    };
  }, [user]);

  const hasPasswordCredential = useMemo(() => {
    const providers = new Set<string>();
    for (const identity of identities) {
      if (typeof identity.provider === 'string') {
        providers.add(identity.provider);
      }
    }

    const appProviders = user?.app_metadata?.providers;
    if (Array.isArray(appProviders)) {
      for (const provider of appProviders) {
        if (typeof provider === 'string') {
          providers.add(provider);
        }
      }
    }

    return providers.has('email');
  }, [identities, user?.app_metadata?.providers]);

  const updateProfile = useCallback(
    async (updates: { firstName: string; lastName: string; avatarUrl?: string }) => {
      setSaving(true);
      setError(null);
      const supabase = createClient();

      try {
        const existingMetadata = (user?.user_metadata ?? {}) as UserMetadata;
        const profileUpdates: UserMetadata = {
          first_name: updates.firstName.trim(),
          last_name: updates.lastName.trim(),
        };

        if (typeof updates.avatarUrl === 'string') {
          profileUpdates.avatar_url = updates.avatarUrl.trim();
        }

        const { data, error: updateError } = await supabase.auth.updateUser({
          data: {
            ...existingMetadata,
            ...profileUpdates,
          },
        });

        if (updateError) throw updateError;
        setUser(data.user);
        return { success: true as const };
      } catch {
        setError('Failed to update profile');
        return { success: false as const, error: 'Failed to update profile' };
      } finally {
        setSaving(false);
      }
    },
    [user]
  );

  const updateEmail = useCallback(async (email: string) => {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        email: email.trim(),
      });
      if (updateError) throw updateError;
      setUser(data.user);
      return { success: true as const };
    } catch {
      setError('Failed to update email');
      return { success: false as const, error: 'Failed to update email' };
    } finally {
      setSaving(false);
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      return { success: true as const };
    } catch {
      setError('Failed to update password');
      return { success: false as const, error: 'Failed to update password' };
    } finally {
      setSaving(false);
    }
  }, []);

  const linkGoogleIdentity = useCallback(async () => {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    try {
      const { data, error: linkError } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/settings`,
        },
      });

      if (linkError) throw linkError;
      if (data?.url) {
        window.location.assign(data.url);
      }
      return { success: true as const };
    } catch {
      setError('Failed to connect Google account');
      return { success: false as const, error: 'Failed to connect Google account' };
    } finally {
      setSaving(false);
    }
  }, []);

  const unlinkIdentity = useCallback(async (identity: UserIdentity) => {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    try {
      const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity);
      if (unlinkError) throw unlinkError;
      await load();
      return { success: true as const };
    } catch {
      setError('Failed to disconnect account');
      return { success: false as const, error: 'Failed to disconnect account' };
    } finally {
      setSaving(false);
    }
  }, [load]);

  return {
    loading,
    saving,
    error,
    user,
    identities,
    profile,
    hasPasswordCredential,
    reload: load,
    updateProfile,
    updateEmail,
    updatePassword,
    linkGoogleIdentity,
    unlinkIdentity,
  };
}
