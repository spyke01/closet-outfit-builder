import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { StaticPageNavigation } from "@/components/static-page-navigation";
import { StaticPageFooter } from "@/components/static-page-footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <StaticPageNavigation />
      
      <main className="pt-16">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-foreground mb-4">About My AI Outfit</h1>
              <p className="text-xl text-muted-foreground text-foreground/85 max-w-2xl mx-auto">
                Intelligent outfit composition for the modern wardrobe
              </p>
            </div>

            <div className="prose prose-lg max-w-none">
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Our Mission</h2>
                <p className="text-muted-foreground text-foreground/80 mb-6">
                  My AI Outfit helps fashion-conscious individuals organize their personal wardrobe digitally 
                  and discover new outfit combinations from their existing clothes. Our intelligent outfit engine 
                  uses compatibility algorithms to suggest combinations based on style, formality, and weather conditions.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Key Features</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                    <div className="w-16 h-16 mb-4 mx-auto">
                      <Image
                        src="/images/wardrobe/ocbd-blue.png"
                        alt="Blue Oxford shirt representing personal wardrobe"
                        width={64}
                        height={64}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        quality={85}
                      />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Personal & Secure</h3>
                    <p className="text-muted-foreground text-foreground/80">Multi-user authentication with complete data privacy and isolation</p>
                  </div>
                  <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                    <div className="w-16 h-16 mb-4 mx-auto">
                      <Image
                        src="/images/wardrobe/ocbd-white.png"
                        alt="White Oxford shirt for custom wardrobe upload"
                        width={64}
                        height={64}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        quality={85}
                      />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Custom Wardrobe</h3>
                    <p className="text-muted-foreground text-foreground/80">Upload your own clothing photos with automatic background removal</p>
                  </div>
                  <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                    <div className="w-16 h-16 mb-4 mx-auto">
                      <Image
                        src="/images/wardrobe/sportcoat-tweed-grey.png"
                        alt="Grey tweed sport coat for smart recommendations"
                        width={64}
                        height={64}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        quality={85}
                      />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Smart Recommendations</h3>
                    <p className="text-muted-foreground text-foreground/80">AI-powered outfit suggestions based on style compatibility</p>
                  </div>
                  <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                    <div className="w-16 h-16 mb-4 mx-auto">
                      <Image
                        src="/images/wardrobe/mac-coat-navy.png"
                        alt="Navy mac coat for weather integration"
                        width={64}
                        height={64}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        quality={85}
                      />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Weather Integration</h3>
                    <p className="text-muted-foreground text-foreground/80">Location-based outfit recommendations considering weather forecasts</p>
                  </div>
                </div>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Technology</h2>
                <p className="text-muted-foreground text-foreground/80 mb-4">
                  Built with modern web technologies including Next.js, React, TypeScript, and Supabase. 
                  Our Progressive Web App (PWA) works across all devices with offline capabilities.
                </p>
              </section>
            </div>

            <div className="text-center mt-12">
              <Button asChild size="lg" className="bg-[#D49E7C] text-[#1A2830] hover:bg-[#e1b08f] rounded-xl">
                <Link href="/auth/sign-up">
                  Get Started Today
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <StaticPageFooter />
    </div>
  );
}
