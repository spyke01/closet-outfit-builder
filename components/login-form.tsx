"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl, logUrlConfig } from "@/lib/utils/url-config";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthHeader } from "./auth-header";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger({ component: "login-form" });

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // Early return on error - don't navigate
      if (error) throw error;
      
      // Only navigate on success
      router.push("/today");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    // Log URL configuration for debugging
    logUrlConfig();

    const redirectUrl = getAuthCallbackUrl('/today');
    logger.debug('OAuth redirect URL prepared', { redirectUrl });

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          // Add PKCE flow configuration for better security
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          // Ensure we skip session refresh during OAuth flow
          skipBrowserRedirect: false,
        },
      });

      logger.debug('OAuth response received', { data, error });

      // Early return on error
      if (error) throw error;
      
      // Don't set loading to false here - let the redirect happen
    } catch (error: unknown) {
      logger.error('OAuth error:', error);
      setError(error instanceof Error ? error.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <AuthHeader />
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? "email-error" : undefined}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  spellCheck={false}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? "password-error" : undefined}
                />
              </div>
              {error && (
                <div id="email-error" role="alert" aria-live="polite" className="text-sm text-red-500">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in…" : "Login"}
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                {isLoading ? "Signing in…" : "Continue with Google"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
