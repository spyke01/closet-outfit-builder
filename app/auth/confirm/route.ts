import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

async function seedNewUser(accessToken: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.functions.invoke('seed-user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    
    if (error) {
      console.error('Failed to seed user data:', error)
    } else {
      console.log('User seeded successfully:', data)
    }
  } catch (error) {
    console.error('Error seeding user:', error)
  }
}

export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error && data.session) {
      // Seed the new user with default data
      await seedNewUser(data.session.access_token);
      
      // redirect user to specified redirect URL or root of app
      redirect(next);
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${error?.message}`);
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=No token hash or type`);
}
