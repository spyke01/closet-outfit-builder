import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StaticPageNavigation } from "@/components/static-page-navigation";
import { StaticPageFooter } from "@/components/static-page-footer";
import { PricingSection } from "@/components/homepage/pricing-section";

export default async function PricingPage() {
  // Authenticated users should manage their plan from the billing settings page
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect('/settings/billing');
  } catch {
    // If auth check fails, render the public pricing page
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <StaticPageNavigation />

      <main className="pt-16">
        <PricingSection />
      </main>

      <StaticPageFooter />
    </div>
  );
}
