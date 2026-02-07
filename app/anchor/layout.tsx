import { Suspense } from "react";
import { AuthBoundary } from "@/components/auth-boundary";

export default function AnchorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 dark:border-slate-200" />
      </div>
    }>
      <AuthBoundary>
        {children}
      </AuthBoundary>
    </Suspense>
  );
}