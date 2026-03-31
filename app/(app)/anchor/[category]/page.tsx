import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasActiveWardrobeItems } from "@/lib/server/wardrobe-readiness";
import { AnchorCategoryPageClient } from './anchor-category-client';

interface AnchorCategoryPageProps {
  params: Promise<{ category: string }>;
}

export default async function AnchorCategoryPage({ params }: AnchorCategoryPageProps) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect("/auth/login");
  }

  const hasItems = await hasActiveWardrobeItems(supabase, user.id);
  if (!hasItems) {
    redirect('/onboarding');
  }

  const { category } = await params;

  return <AnchorCategoryPageClient categoryName={decodeURIComponent(category)} />;
}
