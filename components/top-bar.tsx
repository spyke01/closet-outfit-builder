'use client';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'components-top-bar' });
import React from 'react';
import { Settings, Shirt, Grid3X3, Ruler, Calendar, CalendarDays, LogOut, Menu, X, Monitor, Moon, Sun, CreditCard, Shield, LifeBuoy, BarChart2 } from 'lucide-react';
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
import { useAdminPortalAccess } from '@/lib/hooks/use-admin-portal-access';
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
  email: z.string().email().optional(),
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
  const navGlassStyle: React.CSSProperties = {
    backdropFilter: 'blur(32px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(32px) saturate(1.4)',
  };
  const pathname = usePathname();
  const router = useRouter();
  const { getNavigationProps } = useNavigationPreloading();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const userMenuTriggerId = 'user-menu-trigger';
  const { theme, setTheme } = useTheme();
  const { data: preferences } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const [mounted, setMounted] = React.useState(false);
  const [impersonationSession, setImpersonationSession] = React.useState<{
    target_user_id: string;
    ticket_id?: string | null;
    expires_at: string;
  } | null>(null);
  const [stoppingImpersonation, setStoppingImpersonation] = React.useState(false);

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

  const handleSupport = () => {
    router.push('/support');
  };

  const handleAdminBilling = () => {
    router.push('/admin');
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
    if (pathname?.startsWith('/analytics')) return 'analytics';
    if (pathname?.startsWith('/sizes')) return 'sizes';
    return null;
  };

  const currentView = getCurrentView();
  const { entitlements, loading: entitlementsLoading } = useBillingEntitlements(Boolean(validatedUser));
  const { isAdminPortalUser, loading: adminPortalLoading } = useAdminPortalAccess(validatedUser?.id);
  const canAccessSebastian = entitlements?.effectivePlanCode === 'plus' || entitlements?.effectivePlanCode === 'pro';
  const desktopNavLinkClass = (isActive: boolean) =>
    `inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] px-4 py-2 text-sm transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline-none ${
      isActive
        ? 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-foreground'
        : 'border border-transparent text-muted-foreground hover:bg-[var(--bg-surface)] hover:text-foreground'
    }`;
  const mobileNavLinkClass = (isActive: boolean) =>
    `flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[var(--radius-pill)] px-4 py-3 text-base transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline-none ${
      isActive
        ? 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-foreground'
        : 'border border-transparent text-muted-foreground hover:bg-[var(--bg-surface)] hover:text-foreground'
    }`;

  // Get user initials for avatar
  const getUserInitials = () => {
    const firstName = validatedUser?.user_metadata?.first_name;
    if (typeof firstName === 'string' && firstName.trim().length > 0) {
      return firstName.trim().charAt(0).toUpperCase();
    }

    if (validatedUser?.email) {
      return validatedUser.email.charAt(0).toUpperCase();
    }

    return 'U';
  };

  const getUserAvatarUrl = () => {
    const avatarUrl = validatedUser?.user_metadata?.avatar_url;
    const providerPicture = validatedUser?.user_metadata?.picture;
    if (typeof avatarUrl === 'string') {
      const trimmed = avatarUrl.trim();
      if (trimmed.length > 0) return trimmed;
    }
    if (typeof providerPicture === 'string') {
      const providerTrimmed = providerPicture.trim();
      return providerTrimmed.length > 0 ? providerTrimmed : null;
    }
    return null;
  };
  const avatarUrl = getUserAvatarUrl();

  React.useEffect(() => {
    let mountedRef = true;
    if (!validatedUser) {
      setImpersonationSession(null);
      return () => {
        mountedRef = false;
      };
    }

    const loadSession = async () => {
      const res = await fetch('/api/admin/impersonation/session', { cache: 'no-store' });
      const payload = await res.json();
      if (!mountedRef) return;
      setImpersonationSession(payload.session || null);
    };

    loadSession().catch(() => undefined);
    const interval = setInterval(() => loadSession().catch(() => undefined), 30_000);
    return () => {
      mountedRef = false;
      clearInterval(interval);
    };
  }, [validatedUser]);

  const stopImpersonation = async () => {
    setStoppingImpersonation(true);
    try {
      await fetch('/api/admin/impersonation/stop', { method: 'POST' });
      setImpersonationSession(null);
    } finally {
      setStoppingImpersonation(false);
    }
  };

  return (
    <div className="glass-nav sticky top-0 z-[100] w-full" style={navGlassStyle}>
      <div className="page-shell-inner py-2">
        <div className="flex min-h-16 items-center justify-between gap-3">
          {/* Left: Logo + Mobile Menu Button + Desktop Navigation */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Mobile menu button - traditional left position */}
            {validatedUser && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="icon-button glass-pill h-10 w-10 shrink-0 justify-center p-0 lg:hidden"
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
              className="shrink-0 rounded-[var(--radius-md)] transition-opacity hover:opacity-80 focus-visible:outline-none"
              aria-label="Navigate to home"
            >
              <Logo className="h-10 w-auto max-w-[84px] sm:h-11 sm:max-w-[96px] lg:h-12 lg:max-w-[120px]" />
            </button>

            {validatedUser && (
              <nav className="ml-2 hidden min-w-0 items-center gap-1 lg:ml-4 lg:gap-2 lg:flex">
                <Link
                  href="/today"
                  className={desktopNavLinkClass(currentView === 'today')}
                  aria-label="View today's outfit"
                  aria-current={currentView === 'today' ? 'page' : undefined}
                  data-walkthrough-id="nav-today"
                  {...getNavigationProps('/today')}
                >
                  <Calendar size={18} />
                  <span>Today</span>
                </Link>
                <Link
                  href="/wardrobe"
                  className={desktopNavLinkClass(currentView === 'wardrobe')}
                  aria-label="View wardrobe"
                  aria-current={currentView === 'wardrobe' ? 'page' : undefined}
                  {...getNavigationProps('/wardrobe')}
                >
                  <Shirt size={18} />
                  <span>Wardrobe</span>
                </Link>
                <Link
                  href="/calendar"
                  className={desktopNavLinkClass(currentView === 'calendar')}
                  aria-label="View outfit calendar"
                  aria-current={currentView === 'calendar' ? 'page' : undefined}
                  {...getNavigationProps('/calendar')}
                >
                  <CalendarDays size={18} />
                  <span>Calendar</span>
                </Link>
                <Link
                  href="/outfits"
                  className={desktopNavLinkClass(currentView === 'outfits')}
                  aria-label="View outfits"
                  aria-current={currentView === 'outfits' ? 'page' : undefined}
                  data-walkthrough-id="nav-outfits"
                  {...getNavigationProps('/outfits')}
                >
                  <Grid3X3 size={18} />
                  <span>Outfits</span>
                </Link>
                <Link
                  href="/analytics"
                  className={desktopNavLinkClass(currentView === 'analytics')}
                  aria-label="View analytics"
                  aria-current={currentView === 'analytics' ? 'page' : undefined}
                  data-walkthrough-id="nav-analytics"
                  {...getNavigationProps('/analytics')}
                >
                  <BarChart2 size={18} />
                  <span>Analytics</span>
                </Link>
                <Link
                  href="/sizes"
                  className={desktopNavLinkClass(currentView === 'sizes')}
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
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Weather widget - always visible when enabled */}
            <WeatherWidget className="max-[359px]:hidden text-sm" compact />

            {validatedUser ? (
              /* User dropdown menu */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    id={userMenuTriggerId}
                    className="icon-button glass-pill flex h-10 w-10 items-center justify-center rounded-full p-0"
                    aria-label="User menu"
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote avatar URLs from storage are dynamic user content.
                      <img
                        src={avatarUrl}
                        alt="Profile avatar"
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                        {getUserInitials()}
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
                  <DropdownMenuItem onClick={handleSupport} className="text-sm">
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    <span>Support</span>
                  </DropdownMenuItem>
                  {!adminPortalLoading && isAdminPortalUser && (
                    <DropdownMenuItem onClick={handleAdminBilling} className="text-sm">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin Portal</span>
                    </DropdownMenuItem>
                  )}
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

      {impersonationSession && (
        <div className="border-t border-amber-500/20 bg-amber-500/10 backdrop-blur-[18px]">
          <div className="page-shell-inner flex flex-wrap items-center justify-between gap-3 py-2 text-xs text-amber-200">
            <p className="truncate">
              Read-only impersonation active | target <span className="font-mono">{impersonationSession.target_user_id}</span>
              {impersonationSession.ticket_id ? <> | ticket <span className="font-mono">{impersonationSession.ticket_id}</span></> : null}
            </p>
            <Button size="sm" variant="outline" onClick={() => stopImpersonation().catch(() => undefined)} disabled={stoppingImpersonation}>
              {stoppingImpersonation ? 'Stopping...' : 'Exit impersonation'}
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Navigation Menu */}
      {validatedUser && mobileMenuOpen && (
        <div className="border-t border-[var(--nav-border)] bg-[color-mix(in_srgb,var(--nav-bg)_86%,transparent)] lg:hidden">
          <nav className="page-shell-inner flex flex-col gap-2 py-3">
            <Link
              href="/today"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass(currentView === 'today')}
              aria-label="View today's outfit"
              aria-current={currentView === 'today' ? 'page' : undefined}
            >
              <Calendar size={20} />
              <span>Today</span>
            </Link>
            <Link
              href="/wardrobe"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass(currentView === 'wardrobe')}
              aria-label="View wardrobe"
              aria-current={currentView === 'wardrobe' ? 'page' : undefined}
            >
              <Shirt size={20} />
              <span>Wardrobe</span>
            </Link>
            <Link
              href="/outfits"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass(currentView === 'outfits')}
              aria-label="View outfits"
              aria-current={currentView === 'outfits' ? 'page' : undefined}
            >
              <Grid3X3 size={20} />
              <span>Outfits</span>
            </Link>
            <Link
              href="/calendar"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass(currentView === 'calendar')}
              aria-label="View outfit calendar"
              aria-current={currentView === 'calendar' ? 'page' : undefined}
            >
              <CalendarDays size={20} />
              <span>Calendar</span>
            </Link>
            <Link
              href="/sizes"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass(currentView === 'sizes')}
              aria-label="View my sizes"
              aria-current={currentView === 'sizes' ? 'page' : undefined}
            >
              <Ruler size={20} />
              <span>My Sizes</span>
            </Link>
          </nav>
        </div>
      )}
      {validatedUser && (
        <SebastianChatLauncher
          variant="floating"
          requiresUpgrade={!entitlementsLoading && !canAccessSebastian}
        />
      )}
    </div>
  );
};
