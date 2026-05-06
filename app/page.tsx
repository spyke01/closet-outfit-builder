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

export default function Home() {
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
