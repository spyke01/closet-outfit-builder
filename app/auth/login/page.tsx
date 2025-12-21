import { LoginForm } from "@/components/login-form";
import { redirect } from "next/navigation";

export default function Page({
  searchParams,
}: {
  searchParams: { code?: string; next?: string };
}) {
  // If there's an OAuth code, redirect to the callback route
  if (searchParams.code) {
    const callbackUrl = `/auth/callback?code=${searchParams.code}${
      searchParams.next ? `&next=${encodeURIComponent(searchParams.next)}` : ''
    }`;
    redirect(callbackUrl);
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}