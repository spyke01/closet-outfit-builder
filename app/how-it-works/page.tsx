'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * How It Works Page - Redirects to homepage section
 * 
 * This page redirects users to the "How It Works" section on the homepage
 * to avoid content duplication and maintain a single source of truth.
 */
export default function HowItWorksPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to homepage with hash anchor
    router.push('/#how-it-works');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-muted to-muted from-background via-card to-background">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to How It Works...</p>
      </div>
    </div>
  );
}
