import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OutfitsPageClient } from './outfits-page-client';

export const dynamic = 'force-dynamic';

export default async function OutfitsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return <OutfitsPageClient />;
}