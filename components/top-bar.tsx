'use client';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'components-top-bar' });
import React from 'react';
import { Settings, Shirt, Grid3X3, Ruler, Calendar, CalendarDays, LogOut, Menu, X, Monitor, Moon, Sun, CreditCard } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useUpdateUserPreferences, useUserPreferences } from '@/lib/hooks/use-user-preferences';



import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { WeatherWidget } from './weather-widget';
import { Logo } from './logo';
import { z } from 'zod';
import { safeValidate } from '@/lib/utils/validation';
import { useNavigationPreloading } from '@/lib/hooks/use-intelligent-preloading';
import { SebastianChatLauncher } from './sebastian-chat-launcher';
import { useBillingEntitlements } from '@/lib/hooks/use-billing-entitlements';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';

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
  const router = useRouter();
  const { getNavigationProps } = useNavigationPreloading();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const userMenuTriggerId = 'user-menu-trigger';
  const { theme, setTheme } = useTheme();
  const { data: preferences } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Validate user data with Zod
  const validatedUser = React.useMemo(() => {
    if (!user) return null;

    const validation = safeValidate(UserSchema, user);
    if (!validation.success) {
      logger.warn('Invalid user data:', validation.error);
      return null;
    }

    return validation.data;
  }, [user]);

  const handleTitleClick = () => {
    if (onTitleClick) {
      onTitleClick();
    } else {
      // Default behavior - navigate to home
      window.location.href = validatedUser ? '/today' : '/';
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleSettings = () => {
    if (onSettingsClick) {
      onSettingsClick();
    } else {
      router.push('/settings');
    }
  };

  const handleBilling = () => {
    router.push('/settings/billing');
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    // Update next-themes immediately for instant UI feedback
    setTheme(newTheme);
    
    // Update database preference
    try {
      await updatePreferences.mutateAsync({ theme: newTheme });
    } catch (error) {
      logger.error('Failed to update theme preference:', error);
      // Revert theme on error
      if (preferences?.theme) {
        setTheme(preferences.theme);
      }
    }
  };

  // Determine current view based on pathname
  const getCurrentView = () => {
    if (pathname?.startsWith('/today')) return 'today';
    if (pathname?.startsWith('/calendar')) return 'calendar';
    if (pathname?.startsWith('/wardrobe')) return 'wardrobe';
    if (pathname?.startsWith('/outfits')) return 'outfits';
    if (pathname?.startsWith('/sizes')) return 'sizes';
    return null;
  };

  const currentView = getCurrentView();
  const { entitlements, loading: entitlementsLoading } = useBillingEntitlements(Boolean(validatedUser));
  const canAccessSebastian = entitlements?.effectivePlanCode === 'plus' || entitlements?.effectivePlanCode === 'pro';
  const showSebastianUpsell = Boolean(validatedUser) && !entitlementsLoading && !canAccessSebastian;

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!validatedUser?.email) return 'U';
    return validatedUser.email.charAt(0).toUpperCase();
  };

  return (
    <div className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Mobile Menu Button + Desktop Navigation */}
          <div className="flex items-center gap-3">
            {/* Mobile menu button - traditional left position */}
            {validatedUser && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Toggle mobile menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X size={20} className="text-muted-foreground" />
                ) : (
                  <Menu size={20} className="text-muted-foreground" />
                )}
              </button>
            )}

            <button
              onClick={handleTitleClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTitleClick();
                }
              }}
              className="hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
              aria-label="Navigate to home"
            >
              <Logo className="h-12 w-auto" />
            </button>

            {validatedUser && (
              <nav className="hidden md:flex items-center gap-1 ml-2">
                <Link
                  href="/today"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    currentView === 'today'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  aria-label="View today's outfit"
                  aria-current={currentView === 'today' ? 'page' : undefined}
                  {...getNavigationProps('/today')}
                >
                  <Calendar size={18} />
                  <span>Today</span>
                </Link>
                <Link
                  href="/wardrobe"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    currentView === 'wardrobe'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  aria-label="View wardrobe"
                  aria-current={currentView === 'wardrobe' ? 'page' : undefined}
                  {...getNavigationProps('/wardrobe')}
                >
                  <Shirt size={18} />
                  <span>Wardrobe</span>
                </Link>
                <Link
                  href="/calendar"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    currentView === 'calendar'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  aria-label="View outfit calendar"
                  aria-current={currentView === 'calendar' ? 'page' : undefined}
                  {...getNavigationProps('/calendar')}
                >
                  <CalendarDays size={18} />
                  <span>Calendar</span>
                </Link>
                <Link
                  href="/outfits"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    currentView === 'outfits'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  aria-label="View outfits"
                  aria-current={currentView === 'outfits' ? 'page' : undefined}
                  {...getNavigationProps('/outfits')}
                >
                  <Grid3X3 size={18} />
                  <span>Outfits</span>
                </Link>
                <Link
                  href="/sizes"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    currentView === 'sizes'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  aria-label="View my sizes"
                  aria-current={currentView === 'sizes' ? 'page' : undefined}
                  {...getNavigationProps('/sizes')}
                >
                  <Ruler size={18} />
                  <span>My Sizes</span>
                </Link>
              </nav>
            )}
          </div>

          {/* Right: Weather + User Menu or Auth Buttons */}
          <div className="flex items-center gap-3">
            {validatedUser && canAccessSebastian && (
              <SebastianChatLauncher className="min-h-[40px] bg-secondary text-secondary-foreground hover:bg-secondary/90" />
            )}
            {showSebastianUpsell && (
              <Button asChild variant="outline" size="sm" className="min-h-[40px]">
                <Link href="/settings/billing">Unlock Sebastian</Link>
              </Button>
            )}

            {/* Weather widget - always visible when enabled */}
            <WeatherWidget className="text-sm" />

            {validatedUser ? (
              /* User dropdown menu */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    id={userMenuTriggerId}
                    className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="User menu"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                      {getUserInitials()}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                  <DropdownMenuLabel className="pb-2">
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {validatedUser.email}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem onClick={handleSettings} className="text-sm">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBilling} className="text-sm">
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-muted" />
                  {mounted && (
                    <>
                      <div className="px-2 py-1.5">
                        <p className="text-xs text-muted-foreground mb-2">Theme</p>
                        <div className="space-y-1">
                          <DropdownMenuItem 
                            onClick={() => handleThemeChange('dark')}
                            className="text-sm"
                          >
                            <Moon className="mr-2 h-4 w-4" />
                            <span>Dark</span>
                            {(preferences?.theme || theme) === 'dark' && (
                              <span className="ml-auto">•</span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleThemeChange('light')}
                            className="text-sm"
                          >
                            <Sun className="mr-2 h-4 w-4" />
                            <span>Light</span>
                            {(preferences?.theme || theme) === 'light' && (
                              <span className="ml-auto">•</span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleThemeChange('system')}
                            className="text-sm"
                          >
                            <Monitor className="mr-2 h-4 w-4" />
                            <span>System</span>
                            {(preferences?.theme || theme) === 'system' && (
                              <span className="ml-auto">•</span>
                            )}
                          </DropdownMenuItem>
                        </div>
                      </div>
                      <DropdownMenuSeparator className="bg-border" />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className="text-sm">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
      </div>

      {/* Mobile Navigation Menu */}
      {validatedUser && mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <nav className="px-4 py-3 space-y-1">
            <Link
              href="/today"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                currentView === 'today'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              aria-label="View today's outfit"
              aria-current={currentView === 'today' ? 'page' : undefined}
            >
              <Calendar size={20} />
              <span>Today</span>
            </Link>
            <Link
              href="/wardrobe"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                currentView === 'wardrobe'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              aria-label="View wardrobe"
              aria-current={currentView === 'wardrobe' ? 'page' : undefined}
            >
              <Shirt size={20} />
              <span>Wardrobe</span>
            </Link>
            <Link
              href="/outfits"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                currentView === 'outfits'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              aria-label="View outfits"
              aria-current={currentView === 'outfits' ? 'page' : undefined}
            >
              <Grid3X3 size={20} />
              <span>Outfits</span>
            </Link>
            <Link
              href="/calendar"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                currentView === 'calendar'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              aria-label="View outfit calendar"
              aria-current={currentView === 'calendar' ? 'page' : undefined}
            >
              <CalendarDays size={20} />
              <span>Calendar</span>
            </Link>
            <Link
              href="/sizes"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                currentView === 'sizes'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              aria-label="View my sizes"
              aria-current={currentView === 'sizes' ? 'page' : undefined}
            >
              <Ruler size={20} />
              <span>My Sizes</span>
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
};
