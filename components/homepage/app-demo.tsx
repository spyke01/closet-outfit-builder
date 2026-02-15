'use client';

import Image from 'next/image';
import { Sparkles, Heart, Thermometer } from 'lucide-react';
import { appDemoOutfit } from '@/lib/data/landing-page-images';





export function AppDemo() {
  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Built for your closet. Designed for your life.
          </h2>
          <p className="text-xl text-muted-foreground text-foreground/85 max-w-3xl mx-auto">
            See how My AI Outfit transforms your daily outfit selection with intelligent recommendations.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Main app mockup */}
          <div className="relative bg-gradient-to-br from-card to-background rounded-3xl p-8 shadow-2xl border border-border">
            <div className="bg-card rounded-2xl p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-2xl font-bold text-foreground">Today&apos;s Outfit</h3>
                  <p className="text-muted-foreground text-foreground/80">Perfect for 72°F, partly cloudy</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-[#294653] border border-[#3b6270] text-[#E8F0F2] rounded-full text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  95% Match
                </div>
              </div>

              {/* Outfit grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="aspect-square bg-muted rounded-2xl overflow-hidden shadow-sm">
                    <Image
                      src={appDemoOutfit.jacket!.src}
                      alt={appDemoOutfit.jacket!.alt}
                      width={150}
                      height={150}
                      className="w-full h-full object-contain p-3"
                      loading="lazy"
                      quality={85}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-foreground/80 text-center">Brown Tweed Blazer</p>
                </div>

                <div className="space-y-2">
                  <div className="aspect-square bg-muted rounded-2xl overflow-hidden shadow-sm">
                    <Image
                      src={appDemoOutfit.shirt.src}
                      alt={appDemoOutfit.shirt.alt}
                      width={150}
                      height={150}
                      className="w-full h-full object-contain p-3"
                      loading="lazy"
                      quality={85}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-foreground/80 text-center">Blue Oxford Shirt</p>
                </div>

                <div className="space-y-2">
                  <div className="aspect-square bg-muted rounded-2xl overflow-hidden shadow-sm">
                    <Image
                      src={appDemoOutfit.pants.src}
                      alt={appDemoOutfit.pants.alt}
                      width={150}
                      height={150}
                      className="w-full h-full object-contain p-3"
                      loading="lazy"
                      quality={85}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-foreground/80 text-center">Khaki Chinos</p>
                </div>

                <div className="space-y-2">
                  <div className="aspect-square bg-muted rounded-2xl overflow-hidden shadow-sm">
                    <Image
                      src={appDemoOutfit.shoes.src}
                      alt={appDemoOutfit.shoes.alt}
                      width={150}
                      height={150}
                      className="w-full h-full object-contain p-3"
                      loading="lazy"
                      quality={85}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-foreground/80 text-center">Tan Suede Loafers</p>
                </div>
              </div>

              {/* Score breakdown */}
              <div className="bg-muted rounded-2xl p-4 space-y-3">
                <h4 className="font-semibold text-foreground">Compatibility Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground text-foreground/85">Style Harmony</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="w-15 h-full bg-primary rounded-full"></div>
                      </div>
                      <span className="text-sm font-semibold text-foreground">94%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground text-foreground/85">Weather Appropriate</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="w-full h-full bg-primary rounded-full"></div>
                      </div>
                      <span className="text-sm font-semibold text-foreground">98%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground text-foreground/85">Formality Match</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="w-14 h-full bg-primary rounded-full"></div>
                      </div>
                      <span className="text-sm font-semibold text-foreground">92%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button className="flex-1 bg-[#D49E7C] hover:bg-[#e1b08f] text-[#1A2830] py-3 rounded-xl font-semibold transition-colors">
                  Wear This Outfit
                </button>
                <button
                  type="button"
                  aria-label="Save outfit to favorites"
                  className="px-4 py-3 border-2 border-[#2f5664] bg-[#23414d] rounded-xl hover:bg-[#2b4b57] transition-colors"
                >
                  <Heart className="w-5 h-5 text-[#E8F0F2]" />
                </button>
                <button
                  type="button"
                  aria-label="Regenerate outfit suggestion"
                  className="px-4 py-3 border-2 border-[#2f5664] bg-[#23414d] rounded-xl hover:bg-[#2b4b57] transition-colors"
                >
                  <Sparkles className="w-5 h-5 text-[#E8F0F2]" />
                </button>
              </div>
            </div>

            {/* Floating weather widget */}
            <div className="absolute -top-4 -right-4 bg-card rounded-2xl p-4 shadow-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#294653] border border-[#3b6270] flex items-center justify-center">
                  <Thermometer className="w-5 h-5 text-[#E8F0F2]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">72°F</p>
                  <p className="text-xs text-muted-foreground text-foreground/80">Partly Cloudy</p>
                </div>
              </div>
            </div>
          </div>

          {/* Floating elements */}
          <div className="absolute -top-6 left-1/4 w-16 h-16 rounded-2xl bg-[#294653] border border-[#3b6270] flex items-center justify-center shadow-lg">
            <Sparkles className="w-8 h-8 text-[#E8F0F2]" />
          </div>
        </div>
      </div>
    </section>
  );
}
