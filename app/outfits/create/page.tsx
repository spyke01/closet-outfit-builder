import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateOutfitPageClient } from './create-outfit-client';

export default async function CreateOutfitPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return <CreateOutfitPageClient />;
}