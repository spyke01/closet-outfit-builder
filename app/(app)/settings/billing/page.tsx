import { Suspense } from 'react';
import { AuthBoundary } from '@/components/auth-boundary';
import { BillingPageClient } from './billing-page-client';

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto p-6 text-muted-foreground">Loading billing...</div>}>
      <AuthBoundary>
        <BillingPageClient />
      </AuthBoundary>
    </Suspense>
  );
}
