import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Auth boundary component that handles authentication checks
 * Can be used with Suspense to show loading states while auth is verified
 */
export async function AuthBoundary({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return <>{children}</>;
}

/**
 * Auth boundary that also fetches user data for components that need it
 * Returns both auth check and user data
 */
export async function AuthBoundaryWithUser({ 
  children 
}: { 
  children: (user: User | null) => React.ReactNode 
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  // Get user data for components that need it
  const { data: userData } = await supabase.auth.getUser();

  return <>{children(userData.user)}</>;
}
