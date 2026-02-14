import Link from "next/link";
import { Button } from "@/components/ui/button";
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
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-red-400 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
              Authentication Error
            </h3>
          </div>
        </div>
        
        <div className="text-red-700 dark:text-red-300 mb-6">
          {error ? (
            <div className="mb-4">
              <p className="font-medium mb-2">Error Details:</p>
              <p className="text-sm bg-red-100 dark:bg-red-900/30 p-3 rounded border">
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
        </div>

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
      </div>
      
      <div className="text-center mt-6">
        <p className="text-sm text-muted-foreground">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}
