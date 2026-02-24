import { Suspense } from 'react';
import { TopBarWrapper } from '@/components/top-bar-wrapper';
import { AuthBoundaryWithUser } from '@/components/auth-boundary';
import { TopBarSkeleton } from '@/components/loading-skeleton';

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col">
      <Suspense fallback={<TopBarSkeleton />}>
        <AuthBoundaryWithUser>
          {(user) => <TopBarWrapper user={user} />}
        </AuthBoundaryWithUser>
      </Suspense>
      <div className="flex-1 w-full">{children}</div>
    </main>
  );
}
