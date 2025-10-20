import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AnchorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return <>{children}</>;
}