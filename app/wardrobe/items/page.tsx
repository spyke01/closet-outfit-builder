import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddItemPageClient } from './add-item-client';

export default async function WardrobeItemsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return <AddItemPageClient />;
}