import { StaticPageNavigation } from "@/components/static-page-navigation";
import { StaticPageFooter } from "@/components/static-page-footer";
import { PricingSection } from "@/components/homepage/pricing-section";

export default function PricingPage() {
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
