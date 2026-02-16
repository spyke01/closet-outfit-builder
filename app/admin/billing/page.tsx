import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TopBarWrapper } from '@/components/top-bar-wrapper';
import { AdminBillingPageClient } from './page-client';
import { hasBillingAdminRole } from '@/lib/services/billing/roles';

export const dynamic = 'force-dynamic';

export default async function AdminBillingPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  const isAdmin = await hasBillingAdminRole(supabase, user.id);
  if (!isAdmin) {
    redirect('/today');
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBarWrapper user={user} />
      <AdminBillingPageClient />
    </div>
  );
}
