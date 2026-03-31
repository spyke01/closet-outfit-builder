import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OutfitDetailPageClient } from './outfit-detail-client';

export const dynamic = 'force-dynamic';

interface OutfitDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OutfitDetailPage({ params }: OutfitDetailPageProps) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return <OutfitDetailPageClient outfitId={resolvedParams.id} />;
}