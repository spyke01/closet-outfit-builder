import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopBarWrapper } from '@/components/top-bar-wrapper';
import { createClient } from '@/lib/supabase/server';

export default async function BillingFailedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="page-shell min-h-screen text-foreground">
      <TopBarWrapper user={user} />
      <div className="page-shell-content flex items-center justify-center px-6 py-16">
        <div className="glass-surface w-full max-w-xl space-y-4 p-8">
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
    </div>
  );
}
