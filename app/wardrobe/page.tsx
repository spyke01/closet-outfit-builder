import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WardrobePageClient } from './wardrobe-page-client';

export const dynamic = 'force-dynamic';

export default async function WardrobePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return <WardrobePageClient />;
}