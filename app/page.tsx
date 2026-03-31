import { redirect } from "next/navigation";
import { Navigation } from "@/components/homepage/navigation";
import { HashScrollHandler } from "@/components/homepage/hash-scroll-handler";
import { HeroSection } from "@/components/homepage/hero-section";
import { FeatureHighlights } from "@/components/homepage/feature-highlights";
import { SebastianSection } from "@/components/homepage/sebastian-section";
import { HowItWorks } from "@/components/homepage/how-it-works";
import { AppDemo } from "@/components/homepage/app-demo";
import { Testimonials } from "@/components/homepage/testimonials";
import { FinalCTA } from "@/components/homepage/final-cta";
import { StaticPageFooter } from "@/components/static-page-footer";
import { createClient } from "@/lib/supabase/server";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    next?: string;
    error?: string;
    error_description?: string;
  }>;
}) {
  const params = await searchParams;

  if (params.code) {
    const callbackUrl = `/auth/callback?code=${params.code}${
      params.next ? `&next=${encodeURIComponent(params.next)}` : ""
    }`;
    redirect(callbackUrl);
  }

  if (params.error) {
    const errorUrl = `/auth/auth-code-error?error=${encodeURIComponent(
      params.error_description || "Authentication failed",
    )}`;
    redirect(errorUrl);
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (data?.user) {
      redirect("/today");
    }
  } catch {
    // Continue rendering the public home experience if auth bootstrap fails.
  }

  return (
    <main id="main-content" className="page-shell min-h-screen">
      <HashScrollHandler />
      <Navigation />
      <HeroSection />
      <FeatureHighlights />
      <SebastianSection />
      <HowItWorks />
      <AppDemo />
      <Testimonials />
      <FinalCTA />
      <StaticPageFooter />
    </main>
  );
}
