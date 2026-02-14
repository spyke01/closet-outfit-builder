import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { getPostAuthRoute, hasActiveWardrobeItems } from "@/lib/server/wardrobe-readiness";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

const DEFAULT_REDIRECT_PATH = "/today";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const requestedNext = searchParams.get("next");

  if (token_hash && type) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error && data.session) {
      const userId = data.user?.id;
      const hasItems = userId
        ? await hasActiveWardrobeItems(supabase, userId)
        : true;
      const safeRedirectPath = getPostAuthRoute({
        hasItems,
        requestedNext,
        fallback: DEFAULT_REDIRECT_PATH,
      });
      redirect(safeRedirectPath);
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${error?.message}`);
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=No token hash or type`);
}
