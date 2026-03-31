import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ItemDetailPageClient } from './item-detail-client';

interface ItemDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return <ItemDetailPageClient itemId={resolvedParams.id} />;
}