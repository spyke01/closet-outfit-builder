import { redirect } from "next/navigation";
import { getPageSession } from "@/lib/server/page-session";
import { PlannerUpcoming } from "@/components/planner-upcoming";
export const dynamic = "force-dynamic";
export default async function UpcomingPage() {
  const { user } = await getPageSession();
  if (!user) redirect("/auth/login");
  return <PlannerUpcoming />;
}
