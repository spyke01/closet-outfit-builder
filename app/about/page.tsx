import Link from "next/link";
import { Shield, Shirt, Sparkles, Cloud, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaticPageNavigation } from "@/components/static-page-navigation";
import { StaticPageFooter } from "@/components/static-page-footer";

export default function AboutPage() {
  return (
    <div className="page-shell min-h-screen">
      <StaticPageNavigation />
      
      <main className="pt-20">
        <div className="mx-auto max-w-[1240px] px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="font-display mb-4 text-4xl font-normal text-foreground">About My AI Outfit</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Intelligent outfit composition for the modern wardrobe
              </p>
            </div>

            <div className="prose prose-lg max-w-none">
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Our Mission</h2>
                <p className="text-muted-foreground mb-6">
                  My AI Outfit helps fashion-conscious individuals organize their personal wardrobe digitally
                  and discover new outfit combinations from their existing clothes. Our intelligent outfit engine
                  uses compatibility algorithms to suggest combinations based on style, formality, and weather conditions.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Key Features</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="glass-surface p-6">
                    <div className="w-16 h-16 mb-4 mx-auto flex items-center justify-center">
                      <Shield className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Personal & Secure</h3>
                    <p className="text-muted-foreground">Multi-user authentication with complete data privacy and isolation</p>
                  </div>
                  <div className="glass-surface p-6">
                    <div className="w-16 h-16 mb-4 mx-auto flex items-center justify-center">
                      <Shirt className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Custom Wardrobe</h3>
                    <p className="text-muted-foreground">Upload your own clothing photos with automatic background removal</p>
                  </div>
                  <div className="glass-surface p-6">
                    <div className="w-16 h-16 mb-4 mx-auto flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Smart Recommendations</h3>
                    <p className="text-muted-foreground">AI-powered outfit suggestions based on style compatibility</p>
                  </div>
                  <div className="glass-surface p-6">
                    <div className="w-16 h-16 mb-4 mx-auto flex items-center justify-center">
                      <Cloud className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Weather Integration</h3>
                    <p className="text-muted-foreground">Location-based outfit recommendations considering weather forecasts</p>
                  </div>
                  <div className="glass-surface p-6 md:col-span-2">
                    <div className="w-16 h-16 mb-4 mx-auto flex items-center justify-center">
                      <MessageCircle className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Sebastian AI Stylist</h3>
                    <p className="text-muted-foreground">
                      Get instant styling advice, outfit feedback, and trip planning from your personal AI assistant.
                      Available on all plans — upgrade for unlimited access.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-foreground mb-4">How It Works</h2>
                <p className="text-muted-foreground mb-4">
                  Our app installs to your home screen for quick, native-like access on any device.
                  Add your wardrobe items, and our AI engine learns your style preferences to suggest
                  outfits that match your daily needs, weather, and occasions.
                </p>
              </section>
            </div>

            <div className="text-center mt-12">
              <Button asChild size="lg">
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
