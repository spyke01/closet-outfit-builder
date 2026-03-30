import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from 'lucide-react';
import { heroOutfit } from '@/lib/data/landing-page-images';

export function HeroSection() {
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden pt-16">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}></div>
      </div>
      
      <div className="relative mx-auto max-w-[1240px] px-6 py-16 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left side - Content */}
          <div className="app-section section-delay-1 text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[var(--accent-muted)] px-4 py-2 text-sm font-medium text-[var(--accent)]">
              <Sparkles className="w-4 h-4" />
              Start your free trial
            </div>
            
            <h1 className="font-display mb-6 text-5xl font-normal leading-tight text-foreground lg:text-7xl">
              Never wonder{' '}
              <span className="text-primary">what to wear</span>{' '}
              again.
            </h1>
            
            <p className="text-balance mb-8 max-w-2xl text-xl leading-relaxed text-muted-foreground lg:text-2xl">
              Your personal AI stylist builds polished outfits from the clothes you already own.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
              <Link href="/auth/sign-up">
                <Button 
                  size="lg" 
                  className="group min-h-12 px-7 text-base"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <Button 
                asChild
                variant="outline" 
                size="lg"
                className="min-h-12 px-7 text-base font-medium"
              >
                <Link href="#how-it-works">See How It Works</Link>
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              No credit card required. Start free.
            </p>
          </div>
          
          {/* Right side - Hero mockup */}
          <div className="app-section section-delay-2 relative">
            <div className="glass-surface relative rounded-[var(--radius-xl)] p-8">
              {/* Mock app interface */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">Today&apos;s Outfit</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_18%,transparent)] bg-[var(--accent-muted)]">
                    <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]">
                    <Image
                      src={heroOutfit.shirt.src}
                      alt={heroOutfit.shirt.alt}
                      width={200}
                      height={200}
                      className="w-full h-full object-contain p-4"
                      priority
                      sizes="(max-width: 1024px) 40vw, 18vw"
                      quality={85}
                    />
                  </div>
                  <div className="aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]">
                    <Image
                      src={heroOutfit.pants.src}
                      alt={heroOutfit.pants.alt}
                      width={200}
                      height={200}
                      className="w-full h-full object-contain p-4"
                      sizes="(max-width: 1024px) 40vw, 18vw"
                      quality={85}
                    />
                  </div>
                  <div className="aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]">
                    <Image
                      src={heroOutfit.shoes.src}
                      alt={heroOutfit.shoes.alt}
                      width={200}
                      height={200}
                      className="w-full h-full object-contain p-4"
                      sizes="(max-width: 1024px) 40vw, 18vw"
                      quality={85}
                    />
                  </div>
                  <div className="aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]">
                    <Image
                      src={heroOutfit.accessory!.src}
                      alt={heroOutfit.accessory!.alt}
                      width={200}
                      height={200}
                      className="w-full h-full object-contain p-4"
                      sizes="(max-width: 1024px) 40vw, 18vw"
                      quality={85}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
                  <span className="text-sm text-muted-foreground">Compatibility Score</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-[var(--bg-surface-active)]">
                      <div className="h-full w-14 rounded-full bg-primary"></div>
                    </div>
                    <span className="text-sm font-semibold text-foreground">92%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
