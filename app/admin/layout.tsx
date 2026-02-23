import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasAnyAdminRole } from '@/lib/services/admin/permissions';
import { TopBarWrapper } from '@/components/top-bar-wrapper';
import { AdminNav } from '@/components/admin/admin-nav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  const isAnyAdmin = await hasAnyAdminRole(supabase, user.id);
  if (!isAnyAdmin) {
    redirect('/today');
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBarWrapper user={user} />
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
