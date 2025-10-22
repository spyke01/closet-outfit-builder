import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBarWrapper } from "@/components/top-bar-wrapper";

export default async function WardrobeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  // Get user data for TopBar
  const { data: userData } = await supabase.auth.getUser();

  return (
    <>
      <main className="min-h-screen flex flex-col">
        <TopBarWrapper user={userData.user} />
        <div className="flex-1 w-full">
          {children}
        </div>
      </main>
    </>
  );
}