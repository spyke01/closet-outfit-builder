"use server";

import { createClient } from "@/lib/supabase/server";
import { loadAnalyticsDashboard } from "@/lib/services/analytics/dashboard";
import type { AnalyticsDashboardResponse } from "@/lib/types/analytics";

export async function getAnalyticsDashboard(): Promise<AnalyticsDashboardResponse> {
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new Error("Authentication required");
  return loadAnalyticsDashboard(db, user.id);
}
