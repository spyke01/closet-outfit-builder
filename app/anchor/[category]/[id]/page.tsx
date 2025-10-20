import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnchorOutfitBuilderClient } from './anchor-outfit-builder-client';

interface AnchorItemPageProps {
  params: Promise<{ category: string; id: string }>;
}

export default async function AnchorItemPage({ params }: AnchorItemPageProps) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { category, id } = await params;

  return (
    <AnchorOutfitBuilderClient 
      categoryName={decodeURIComponent(category)} 
      anchorItemId={id} 
    />
  );
}