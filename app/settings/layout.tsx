import { Suspense } from "react";
import { TopBarWrapper } from "@/components/top-bar-wrapper";
import { AuthBoundaryWithUser } from "@/components/auth-boundary";
import { TopBarSkeleton } from "@/components/loading-skeleton";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col">
      {/* TopBar with Suspense - shows skeleton while auth loads */}
      <Suspense fallback={<TopBarSkeleton />}>
        <AuthBoundaryWithUser>
          {(user) => <TopBarWrapper user={user} />}
        </AuthBoundaryWithUser>
      </Suspense>
      
      {/* Page content can start rendering independently */}
      <div className="flex-1 w-full">
        {children}
      </div>
    </main>
  );
}