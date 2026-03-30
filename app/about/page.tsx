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
        <div className="mx-auto max-w-[1240px] px-6 py-14 lg:py-16">
          <div className="mx-auto max-w-5xl space-y-10">
            <section className="glass-surface card-glow-blue rounded-[var(--radius-xl)] px-8 py-10 text-center lg:px-12 lg:py-14">
              <div className="mx-auto max-w-3xl">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                  About My AI Outfit
                </p>
                <h1 className="font-display mb-4 text-4xl font-normal text-foreground lg:text-5xl">
                  Outfit planning that starts with the wardrobe you already have.
                </h1>
                <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground lg:text-xl">
                  My AI Outfit helps you organize your closet, discover stronger combinations, and get out the door
                  with more confidence and less friction.
                </p>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="glass-surface rounded-[var(--radius-xl)] p-8">
                <h2 className="mb-4 text-2xl font-semibold text-foreground">Our Mission</h2>
                <p className="text-base leading-7 text-muted-foreground">
                  We built My AI Outfit to solve a practical problem: most people own enough clothing to dress well,
                  but they still waste time deciding what works together. The product turns your closet into a living,
                  searchable wardrobe and uses compatibility logic to surface combinations that fit your style, plans,
                  and forecast.
                </p>
              </section>

              <section className="glass-surface rounded-[var(--radius-xl)] p-8">
                <h2 className="mb-4 text-2xl font-semibold text-foreground">What Makes It Different</h2>
                <p className="text-base leading-7 text-muted-foreground">
                  Instead of recommending generic looks, the app works from your real items. That keeps suggestions
                  grounded, useful, and realistic enough to improve daily dressing habits rather than inspire
                  wish-list shopping.
                </p>
              </section>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <section className="glass-surface p-6">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-muted)]">
                  <Shield className="h-9 w-9 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">Personal & Secure</h3>
                <p className="text-muted-foreground">Multi-user authentication with complete data privacy and isolation.</p>
              </section>

              <section className="glass-surface p-6">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-muted)]">
                  <Shirt className="h-9 w-9 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">Custom Wardrobe</h3>
                <p className="text-muted-foreground">Upload your own clothing photos with automatic background removal.</p>
              </section>

              <section className="glass-surface p-6">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-muted)]">
                  <Sparkles className="h-9 w-9 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">Smart Recommendations</h3>
                <p className="text-muted-foreground">AI-powered outfit suggestions based on style, formality, and context.</p>
              </section>

              <section className="glass-surface p-6">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-muted)]">
                  <Cloud className="h-9 w-9 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">Weather Integration</h3>
                <p className="text-muted-foreground">Location-based recommendations that factor in real forecasts.</p>
              </section>
            </div>

            <section className="glass-surface rounded-[var(--radius-xl)] p-8">
              <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
                <div>
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-muted)]">
                    <MessageCircle className="h-9 w-9 text-primary" />
                  </div>
                  <h2 className="mb-3 text-2xl font-semibold text-foreground">Sebastian AI Stylist</h2>
                  <p className="text-muted-foreground">
                    Get instant styling advice, outfit feedback, and trip planning from your personal AI assistant.
                  </p>
                </div>
                <p className="text-base leading-7 text-muted-foreground">
                  Sebastian extends the core wardrobe experience with conversational help. Ask what to wear for a
                  client dinner, how to sharpen an outfit photo, or what to pack for a weekend trip. It keeps the
                  product useful after setup, not just during onboarding.
                </p>
              </div>
            </section>

            <div className="pt-2 text-center">
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
