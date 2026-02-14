import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasActiveWardrobeItems } from "@/lib/server/wardrobe-readiness";
import { AnchorOutfitBuilderClient } from './anchor-outfit-builder-client';

interface AnchorItemPageProps {
  params: Promise<{ category: string; id: string }>;
}

export default async function AnchorItemPage({ params }: AnchorItemPageProps) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect("/auth/login");
  }

  const hasItems = await hasActiveWardrobeItems(supabase, user.id);
  if (!hasItems) {
    redirect('/onboarding');
  }

  const { category, id } = await params;

  return (
    <AnchorOutfitBuilderClient 
      categoryName={decodeURIComponent(category)} 
      anchorItemId={id} 
    />
  );
}
