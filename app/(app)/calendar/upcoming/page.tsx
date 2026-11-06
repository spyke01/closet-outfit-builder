import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlannerUpcoming } from "@/components/planner-upcoming";
export const dynamic = "force-dynamic";
export default async function UpcomingPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/auth/login");
  return <PlannerUpcoming />;
}
