'use client';

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navigation } from "@/components/homepage/navigation";
import { HeroSection } from "@/components/homepage/hero-section";
import { FeatureHighlights } from "@/components/homepage/feature-highlights";
import { SebastianSection } from "@/components/homepage/sebastian-section";
import { HowItWorks } from "@/components/homepage/how-it-works";
import { AppDemo } from "@/components/homepage/app-demo";
import { Testimonials } from "@/components/homepage/testimonials";
import { FinalCTA } from "@/components/homepage/final-cta";
import { StaticPageFooter } from "@/components/static-page-footer";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        
        // Redirect authenticated users to today page
        if (data?.user) {
          router.push("/today");
          return;
        }
      } catch {
        // Continue rendering the public home experience if auth bootstrap fails.
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, [router]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary"></div>
      </div>
    );
  }

  return (
    <main id="main-content" className="min-h-screen">
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
