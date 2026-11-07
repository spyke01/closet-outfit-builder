import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// React's cache lasts for this server render only. Never persist authenticated
// clients or users in a process-wide cache or Next's shared data cache.
export const getPageSession = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user, error };
});
