import { LoginForm } from "@/components/login-form";
import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; next?: string }>;
}) {
  const params = await searchParams;
  
  // If there's an OAuth code, redirect to the callback route
  if (params.code) {
    const callbackUrl = `/auth/callback?code=${params.code}${
      params.next ? `&next=${encodeURIComponent(params.next)}` : ''
    }`;
    redirect(callbackUrl);
  }

  return (
    <main
      id="main-content"
      role="main"
      className="page-shell-content flex min-h-svh w-full items-center justify-center px-6 py-16 md:px-10"
    >
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
