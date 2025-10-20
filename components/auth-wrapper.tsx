import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAuthError } from "@/lib/utils/error-logging";
import { AuthErrorBoundary } from "./error-boundaries/auth-error-boundary";

interface AuthWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export async function AuthWrapper({ children, fallback, requireAuth = true }: AuthWrapperProps) {
  if (!requireAuth) {
    return <>{children}</>;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      // Log authentication error with context
      logAuthError(error, {
        component: 'AuthWrapper',
        action: 'getUser',
        metadata: { errorCode: error.message },
      });

      if (fallback) {
        return <>{fallback}</>;
      }
      redirect("/auth/login");
    }

    if (!data?.user) {
      // Log missing user
      logAuthError('No authenticated user found', {
        component: 'AuthWrapper',
        action: 'checkUser',
      });

      if (fallback) {
        return <>{fallback}</>;
      }
      redirect("/auth/login");
    }

    // Wrap children in auth error boundary for runtime errors
    return (
      <AuthErrorBoundary
        onAuthError={(error) => {
          logAuthError(error, {
            component: 'AuthWrapper',
            action: 'runtime_error',
            userId: data.user?.id,
          });
        }}
      >
        {children}
      </AuthErrorBoundary>
    );
  } catch (error) {
    // Log unexpected errors
    const errorMessage = error instanceof Error ? error : 'Unknown auth wrapper error';
    logAuthError(errorMessage, {
      component: 'AuthWrapper',
      action: 'unexpected_error',
    });

    if (fallback) {
      return <>{fallback}</>;
    }
    redirect("/auth/login");
  }
}