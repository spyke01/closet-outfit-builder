import { StaticPageNavigation } from "@/components/static-page-navigation";
import { StaticPageFooter } from "@/components/static-page-footer";
import { PricingSection } from "@/components/homepage/pricing-section";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-cream-50 to-navy-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <StaticPageNavigation />
      
      <main className="pt-16">
        <PricingSection />
      </main>
      
      <StaticPageFooter />
    </div>
  );
}