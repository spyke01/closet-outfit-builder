import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BillingFailedPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-xl border border-border bg-card p-6 space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Billing Issue</h1>
        <p className="text-muted-foreground">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          We couldn&apos;t renew your membership. Your account still has Free features, but paid features are temporarily disabled.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/settings/billing">Fix Billing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/today">Continue with Free Features</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
