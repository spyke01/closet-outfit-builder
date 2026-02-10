'use client';

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navigation } from "@/components/homepage/navigation";
import { HeroSection } from "@/components/homepage/hero-section";
import { FeatureHighlights } from "@/components/homepage/feature-highlights";
import { HowItWorks } from "@/components/homepage/how-it-works";
import { AppDemo } from "@/components/homepage/app-demo";
import { Testimonials } from "@/components/homepage/testimonials";
import { FinalCTA } from "@/components/homepage/final-cta";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      
      // Redirect authenticated users to today page
      if (data?.user) {
        router.push("/today");
        return;
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, [router]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-cream-50 to-navy-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-navy-200 border-t-navy-600"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <Navigation />
      <HeroSection />
      <FeatureHighlights />
      <HowItWorks />
      <AppDemo />
      <Testimonials />
      <FinalCTA />
    </main>
  );
}
