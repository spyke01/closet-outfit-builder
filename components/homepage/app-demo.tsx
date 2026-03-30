'use client';

import Image from 'next/image';
import { Sparkles, Heart, Thermometer } from 'lucide-react';
import { appDemoOutfit } from '@/lib/data/landing-page-images';





export function AppDemo() {
  return (
    <section className="relative py-20 lg:py-32">
      <div className="mx-auto max-w-[1240px] px-6">
        <div className="app-section section-delay-1 mb-16 text-center">
          <h2 className="font-display mb-6 text-4xl font-normal text-foreground lg:text-5xl">
            Built for your closet. Designed for your life.
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See how My AI Outfit transforms your daily outfit selection with intelligent recommendations.
          </p>
        </div>

        <div className="relative mx-auto max-w-4xl">
          {/* Main app mockup */}
          <div className="glass-surface card-glow-blue relative rounded-[var(--radius-xl)] p-8">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_82%,transparent)] p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-2xl font-normal text-foreground">Today&apos;s Outfit</h3>
                  <p className="text-muted-foreground">Perfect for 72°F, partly cloudy</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[var(--accent-muted)] px-4 py-2 text-sm font-medium text-primary">
                  <Sparkles className="w-4 h-4" />
                  95% Match
                </div>
              </div>

              {/* Outfit grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]">
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
                  <p className="text-xs text-muted-foreground text-center">Brown Tweed Blazer</p>
                </div>

                <div className="space-y-2">
                  <div className="aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]">
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
                  <p className="text-xs text-muted-foreground text-center">Blue Oxford Shirt</p>
                </div>

                <div className="space-y-2">
                  <div className="aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]">
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
                  <p className="text-xs text-muted-foreground text-center">Khaki Chinos</p>
                </div>

                <div className="space-y-2">
                  <div className="aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]">
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
                  <p className="text-xs text-muted-foreground text-center">Tan Suede Loafers</p>
                </div>
              </div>

              {/* Score breakdown */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_72%,transparent)] p-4 space-y-3">
                <h4 className="font-semibold text-foreground">Compatibility Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Style Harmony</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-[var(--bg-surface-active)]">
                        <div className="w-15 h-full bg-primary rounded-full"></div>
                      </div>
                      <span className="text-sm font-semibold text-foreground">94%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Weather Appropriate</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-[var(--bg-surface-active)]">
                        <div className="w-full h-full bg-primary rounded-full"></div>
                      </div>
                      <span className="text-sm font-semibold text-foreground">98%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Formality Match</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-[var(--bg-surface-active)]">
                        <div className="w-14 h-full bg-primary rounded-full"></div>
                      </div>
                      <span className="text-sm font-semibold text-foreground">92%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-pill)] bg-[linear-gradient(135deg,var(--accent),#7eb8ff)] px-5 py-3 font-semibold text-primary-foreground shadow-[var(--shadow-accent)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:-translate-y-px hover:shadow-[var(--shadow-accent-hover)]">
                  Wear This Outfit
                </button>
                <button
                  type="button"
                  aria-label="Save outfit to favorites"
                  className="glass-pill px-4 py-3"
                >
                  <Heart className="w-5 h-5 text-foreground" />
                </button>
                <button
                  type="button"
                  aria-label="Regenerate outfit suggestion"
                  className="glass-pill px-4 py-3"
                >
                  <Sparkles className="w-5 h-5 text-foreground" />
                </button>
              </div>
            </div>

            {/* Floating weather widget */}
            <div className="glass-surface absolute -top-4 -right-4 rounded-[var(--radius-lg)] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[var(--accent-muted)]">
                  <Thermometer className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">72°F</p>
                  <p className="text-xs text-muted-foreground">Partly Cloudy</p>
                </div>
              </div>
            </div>
          </div>

          {/* Floating elements */}
          <div className="absolute -top-6 left-1/4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[var(--accent-muted)] shadow-[var(--shadow-card)]">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>
    </section>
  );
}
