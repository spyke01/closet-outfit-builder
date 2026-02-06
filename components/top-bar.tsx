'use client';

import React from 'react';
import { Settings, Shirt, Grid3X3 } from 'lucide-react';



import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { LogoutButton } from './logout-button';
import { WeatherWidget } from './weather-widget';
import { Logo } from './logo';
import { z } from 'zod';
import { safeValidate } from '@/lib/utils/validation';
import { useNavigationPreloading } from '@/lib/hooks/use-intelligent-preloading';

// Zod schema for user validation
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  user_metadata: z.record(z.string(), z.any()).optional(),
  app_metadata: z.record(z.string(), z.any()).optional(),
});

interface TopBarProps {
  user?: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  } | null;
  onTitleClick?: () => void;
  onSettingsClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  onTitleClick,
  onSettingsClick,
}) => {
  const pathname = usePathname();
  const { getNavigationProps } = useNavigationPreloading();

  // Validate user data with Zod
  const validatedUser = React.useMemo(() => {
    if (!user) return null;

    const validation = safeValidate(UserSchema, user);
    if (!validation.success) {
      console.warn('Invalid user data:', validation.error);
      return null;
    }

    return validation.data;
  }, [user]);

  const handleTitleClick = () => {
    if (onTitleClick) {
      onTitleClick();
    } else {
      // Default behavior - navigate to home
      window.location.href = validatedUser ? '/wardrobe' : '/';
    }
  };

  // Determine current view based on pathname
  const getCurrentView = () => {
    if (pathname?.startsWith('/wardrobe')) return 'wardrobe';
    if (pathname?.startsWith('/outfits')) return 'outfits';
    return null;
  };

  const currentView = getCurrentView();

  return (
    <div className="bg-white dark:bg-slate-800 border-b border-stone-200 dark:border-slate-700 px-4 sm:px-6 py-4">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <button
            onClick={handleTitleClick}
            className="hover:opacity-80 transition-opacity focus:outline-none focus:ring-0 focus:border-transparent active:outline-none"
            style={{ outline: 'none', border: 'none' }}
            aria-label="Navigate to home"
          >
            <Logo className="h-8 sm:h-10 w-auto" />
          </button>

          {/* Navigation Links - only show when user is authenticated */}
          {validatedUser && (
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/wardrobe"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${currentView === 'wardrobe'
                    ? 'bg-slate-800 dark:bg-slate-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700'
                  }`}
                aria-label="View wardrobe"
                {...getNavigationProps('/wardrobe')}
              >
                <Shirt size={16} />
                <span>Wardrobe</span>
              </Link>
              <Link
                href="/outfits"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${currentView === 'outfits'
                    ? 'bg-slate-800 dark:bg-slate-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700'
                  }`}
                aria-label="View outfits"
                {...getNavigationProps('/outfits')}
              >
                <Grid3X3 size={16} />
                <span>Outfits</span>
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Weather widget - automatically handles authentication and preferences */}
          <WeatherWidget className="text-sm" />

          {/* Authentication section */}
          {validatedUser ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-sm text-slate-600 dark:text-slate-400">
                {validatedUser.email}
              </span>

              {onSettingsClick && (
                <button
                  onClick={onSettingsClick}
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-stone-100 dark:bg-slate-700 hover:bg-stone-200 dark:hover:bg-slate-600 transition-colors"
                  aria-label="Open settings"
                >
                  <Settings size={18} className="text-slate-700 dark:text-slate-300" />
                </button>
              )}

              <LogoutButton />
            </div>
          ) : (
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" variant="default">
                <Link href="/auth/sign-up">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation - only show when user is authenticated */}
      {validatedUser && (
        <div className="sm:hidden border-t border-stone-200 dark:border-slate-700 px-4 py-2">
          <nav className="flex items-center justify-center gap-1">
            <Link
              href="/wardrobe"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${currentView === 'wardrobe'
                  ? 'bg-slate-800 dark:bg-slate-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700'
                }`}
              aria-label="View wardrobe"
              {...getNavigationProps('/wardrobe')}
            >
              <Shirt size={16} />
              <span>Wardrobe</span>
            </Link>
            <Link
              href="/outfits"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${currentView === 'outfits'
                  ? 'bg-slate-800 dark:bg-slate-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700'
                }`}
              aria-label="View outfits"
              {...getNavigationProps('/outfits')}
            >
              <Grid3X3 size={16} />
              <span>Outfits</span>
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
};