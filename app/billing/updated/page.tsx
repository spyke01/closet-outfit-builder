import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BillingUpdatedPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-xl border border-border bg-card p-6 space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Membership Updated</h1>
        <p className="text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 inline mr-1" />
          Your billing update was successful. Your plan benefits are now active.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/settings/billing">View Billing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/today">Back to App</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
