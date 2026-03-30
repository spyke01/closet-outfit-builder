import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Shirt, CalendarDays, Camera } from "lucide-react";
import { StaticPageNavigation } from "@/components/static-page-navigation";
import { StaticPageFooter } from "@/components/static-page-footer";
import { Button } from "@/components/ui/button";

export default function SebastianPage() {
  return (
    <div className="page-shell min-h-screen">
      <StaticPageNavigation />

      <main className="pt-20">
        <section className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:py-16">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-muted-foreground backdrop-blur-[var(--blur-glass)]">
              <MessageCircle className="h-4 w-4 text-primary" />
              Meet your personal style assistant
            </div>

            <div className="glass-surface rounded-[var(--radius-xl)] p-3 lg:hidden">
              <div className="relative overflow-hidden rounded-xl border border-border bg-muted/20">
                <Image
                  src="/images/sebastian/sebastian-full.png"
                  alt="Sebastian, your personal style assistant"
                  width={704}
                  height={1536}
                  className="h-auto w-full object-cover object-top"
                  priority
                />
              </div>
            </div>

            <div className="space-y-5">
              <h1 className="font-display text-4xl font-normal leading-tight text-foreground md:text-5xl lg:text-6xl">
                I’m Sebastian.
                <span className="block text-primary">Let’s make your wardrobe work harder.</span>
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                I help you get dressed with clarity. Ask me styling questions, build outfits from what you already own, and get
                thoughtful feedback when you upload a look.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <article className="glass-surface p-4">
                <Shirt className="mb-3 h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Wardrobe Pairing</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tell me one item, and I’ll suggest combinations from your closet that balance color, texture, and formality.
                </p>
              </article>
              <article className="glass-surface p-4">
                <Camera className="mb-3 h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Outfit Feedback</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Upload a photo and I’ll give clear, respectful feedback with specific improvements you can make quickly.
                </p>
              </article>
              <article className="glass-surface p-4">
                <CalendarDays className="mb-3 h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Trip & Calendar Planning</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  I can plan looks around your upcoming events and trips so you stay prepared without overpacking.
                </p>
              </article>
            </div>

            <div className="glass-surface p-6 lg:p-7">
              <h2 className="text-xl font-semibold text-foreground">How to ask me</h2>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>“What should I wear with my navy blazer for a client dinner?”</li>
                <li>“I’m packing for three days in Chicago. Build me five looks.”</li>
                <li>“Here’s my outfit photo. What would make this sharper?”</li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/auth/sign-up">Start with Sebastian</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/pricing">View plan features</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="glass-surface hidden rounded-[var(--radius-xl)] p-3 lg:block">
            <div className="relative overflow-hidden rounded-xl border border-border bg-muted/20">
              <Image
                src="/images/sebastian/sebastian-full.png"
                alt="Sebastian, your personal style assistant"
                width={704}
                height={1536}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          </div>
        </section>
      </main>

      <StaticPageFooter />
    </div>
  );
}
