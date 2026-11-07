"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { NavigationLink } from "@/components/navigation-link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Shirt,
  LayoutGrid,
  Calendar,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  CreditCard,
  LifeBuoy,
  Shield,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Download,
  Ruler,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useBillingEntitlements } from "@/lib/hooks/use-billing-entitlements";
import { useAdminPortalAccess } from "@/lib/hooks/use-admin-portal-access";
import { useUpdateUserPreferences } from "@/lib/hooks/use-user-preferences";
import { SebastianChatLauncher } from "@/components/sebastian-chat-launcher";
import { AppWeatherProvider } from "@/components/app-weather-provider";
import { HeaderWeather } from "@/components/header-weather";
import { Logo } from "@/components/logo";
import { SebastianAvatar } from "@/components/sebastian-avatar";
import { openSebastian } from "@/lib/utils/sebastian-events";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ShellContext } from "@/lib/contexts/app-shell";
export type ShellUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};
const destinations = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/wardrobe", label: "Wardrobe", icon: Shirt },
  { href: "/outfits", label: "Outfits", icon: LayoutGrid },
  { href: "/calendar", label: "Planner", icon: Calendar },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
];

export function AppShell({
  user,
  children,
}: {
  user: ShellUser | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  // Administrative pages retain their dedicated navigation and safeguards.
  if (!user || pathname.startsWith("/admin")) return children;
  return (
    <ShellContext.Provider value={true}>
      <AppWeatherProvider>
        <SignedInShell user={user}>{children}</SignedInShell>
      </AppWeatherProvider>
    </ShellContext.Provider>
  );
}

function SignedInShell({
  user,
  children,
}: {
  user: ShellUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const updatePreferences = useUpdateUserPreferences();
  const { entitlements } = useBillingEntitlements(true);
  const { isAdminPortalUser } = useAdminPortalAccess(user.id);
  const [session, setSession] = useState<{
    target_user_id: string;
    expires_at: string;
  } | null>(null);
  const [endingSession, setEndingSession] = useState(false);
  const [notice, setNotice] = useState("");
  const active =
    destinations.find((d) => pathname.startsWith(d.href)) ||
    (pathname.startsWith("/calendar/trips")
      ? destinations[3]
      : pathname.startsWith("/sizes") || pathname.startsWith("/anchor")
        ? destinations[1]
        : null);
  const name = String(
    user.user_metadata?.first_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Your account",
  );
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/impersonation/session", {
          cache: "no-store",
        });
        if (res.ok) {
          const payload = await res.json();
          if (!canceled) setSession(payload.session || null);
        }
      } catch {
        /* Server still enforces impersonation restrictions. */
      }
    };
    void load();
    const interval = setInterval(load, 30_000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, []);
  const logout = async () => {
    const { error } = await createClient().auth.signOut();
    if (error) {
      setNotice("Could not sign out. Please try again.");
      return;
    }
    queryClient.clear();
    router.push("/");
    router.refresh();
  };
  const changeTheme = async (value: "light" | "dark" | "system") => {
    const previous = theme;
    setTheme(value);
    try {
      await updatePreferences.mutateAsync({ theme: value });
    } catch {
      if (previous) setTheme(previous);
      setNotice("Could not save your theme. Please try again.");
    }
  };
  const nav = (mobile = false) => (
    <nav
      aria-label={mobile ? "Mobile navigation" : "Main navigation"}
      className={mobile ? "app-mobile-nav" : "app-primary-nav"}
    >
      {destinations.map(({ href, label, icon: Icon }) => (
        <NavigationLink
          href={href}
          label={label}
          key={href}
          aria-current={active?.href === href ? "page" : undefined}
        >
          <Icon size={19} aria-hidden="true" />
          <span>{label}</span>
        </NavigationLink>
      ))}
    </nav>
  );
  const account = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="app-account-trigger" aria-label="Open account menu">
          <span className="app-account-initial">
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="app-account-name">
            <strong>{name}</strong>
            <small>
              {entitlements?.effectivePlanCode
                ? `${entitlements.effectivePlanCode.charAt(0).toUpperCase()}${entitlements.effectivePlanCode.slice(1)} membership`
                : "Your account"}
            </small>
          </span>
          <Settings size={17} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>{user.email || name}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings size={16} />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/billing">
            <CreditCard size={16} />
            Membership & billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/sizes">
            <Ruler size={16} />
            My sizes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/export">
            <Download size={16} />
            Export outfits
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/support">
            <LifeBuoy size={16} />
            Help & support
          </Link>
        </DropdownMenuItem>
        {isAdminPortalUser && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield size={16} />
              Administration
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {(
          [
            { value: "light", label: "Light theme", icon: Sun },
            { value: "dark", label: "Dark theme", icon: Moon },
            { value: "system", label: "System theme", icon: Monitor },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => void changeTheme(value)}
          >
            <Icon size={16} />
            {label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut size={16} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  return (
    <div className="signed-in-app">
      <a className="app-skip-link" href="#app-content">
        Skip to content
      </a>
      <aside className="app-sidebar">
        <Link href="/today" className="app-brand">
          <Logo className="h-10 w-10" />
          <span>
            My AI Outfit<small>Your personal wardrobe</small>
          </span>
        </Link>
        {nav()}
        <div className="app-sidebar-assistant">
          <button
            type="button"
            className="flex min-h-12 w-full items-center gap-3 text-left"
            onClick={() => openSebastian()}
            aria-label="Ask Sebastian"
            data-walkthrough-id="sebastian-button"
          >
            <SebastianAvatar className="h-9 w-9" />
            <span className="flex-1 text-sm font-medium">
              Sebastian
              <small className="mt-1 block text-[10px] text-muted-foreground">
                Your style assistant
              </small>
            </span>
            <Sparkles size={16} className="text-primary" />
          </button>
        </div>
        <div className="app-sidebar-note">
          <span className="text-xs uppercase tracking-widest">
            A little at a time
          </span>
          <p>A useful wardrobe starts with the pieces you actually wear.</p>
          <Link href="/wardrobe/items">Add a piece ↗</Link>
        </div>
        <div className="mt-auto">{account}</div>
      </aside>
      <div className="app-workspace">
        <header className="app-header">
          <span className="app-header-location">
            {active?.label ||
              (pathname.startsWith("/settings")
                ? "Settings"
                : pathname.startsWith("/onboarding")
                  ? "Set up your wardrobe"
                  : "My AI Outfit")}
          </span>
          <div className="flex min-w-0 items-center gap-3">
            <HeaderWeather />
            <button
              className="app-mobile-assistant icon-button"
              aria-label="Ask Sebastian"
              onClick={() => openSebastian()}
            >
              <Sparkles size={20} />
            </button>
            <div className="app-mobile-account">{account}</div>
          </div>
        </header>
        {session && (
          <div role="status" className="app-impersonation">
            Read-only support session · {session.target_user_id}
            <button
              disabled={endingSession}
              onClick={async () => {
                setEndingSession(true);
                try {
                  const res = await fetch("/api/admin/impersonation/stop", {
                    method: "POST",
                  });
                  if (!res.ok) throw new Error();
                  setSession(null);
                  router.refresh();
                } catch {
                  setNotice(
                    "Could not end the support session. Please try again.",
                  );
                } finally {
                  setEndingSession(false);
                }
              }}
            >
              End session
            </button>
          </div>
        )}
        {notice && (
          <div role="status" className="px-5 py-3 text-sm">
            {notice}
            <button className="ml-4 underline" onClick={() => setNotice("")}>
              Dismiss
            </button>
          </div>
        )}
        <div id="app-content" tabIndex={-1}>
          {children}
        </div>
      </div>
      {nav(true)}
      <SebastianChatLauncher
        userId={user.id}
        variant="headless"
        requiresUpgrade={!entitlements?.isPaid}
      />
    </div>
  );
}
