import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AuthHeader } from "@/components/auth-header";

export default async function AuthCodeError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;
  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto">
      <AuthHeader />
      <Alert variant="destructive" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 flex-shrink-0" />
          <div>
            <AlertTitle className="text-lg font-medium">Authentication Error</AlertTitle>
          </div>
        </div>
        
        <AlertDescription className="mb-6">
          {error ? (
            <div className="mb-4">
              <p className="font-medium mb-2">Error Details:</p>
              <p className="text-sm rounded border border-danger/40 bg-danger-light/60 p-3 dark:border-danger/60 dark:bg-danger-dark/30">
                {error}
              </p>
            </div>
          ) : null}
          
          <p className="mb-2">
            Sorry, we couldn&apos;t complete your sign-in process. This could be due to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>An expired or invalid authentication link</li>
            <li>The authentication session timed out</li>
            <li>A temporary issue with the authentication service</li>
            <li>OAuth redirect URL not configured in Supabase dashboard</li>
          </ul>
        </AlertDescription>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="flex-1">
            <Link href="/auth/login">
              Try Again
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/">
              Go Home
            </Link>
          </Button>
        </div>
      </Alert>
      
      <div className="text-center mt-6">
        <p className="text-sm text-muted-foreground">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}
