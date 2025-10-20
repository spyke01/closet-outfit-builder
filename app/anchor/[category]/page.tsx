import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnchorCategoryPageClient } from './anchor-category-client';

interface AnchorCategoryPageProps {
  params: Promise<{ category: string }>;
}

export default async function AnchorCategoryPage({ params }: AnchorCategoryPageProps) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { category } = await params;

  return <AnchorCategoryPageClient categoryName={decodeURIComponent(category)} />;
}