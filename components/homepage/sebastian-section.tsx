'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const sebastianSellingPoints = [
  'Get instant outfit recommendations for your exact occasion.',
  'Ask what works with a specific item from your wardrobe.',
  'Upload your look and get polished, constructive feedback.',
];

export function SebastianSection() {
  return (
    <section
      id="sebastian"
      className="relative py-20 lg:py-28"
    >
      <div className="mx-auto max-w-[1240px] px-6">
        <div className="glass-surface card-glow-blue relative overflow-hidden rounded-[var(--radius-xl)]">
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[var(--accent-2-muted)] blur-3xl" />

          <div className="relative grid lg:grid-cols-[1.2fr_0.8fr] gap-10 lg:gap-12 p-8 md:p-12 lg:p-14 items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--tag-border)] bg-[var(--tag-bg)] px-4 py-2 text-sm font-semibold text-[var(--tag-text)]">
                <Sparkles className="w-4 h-4" />
                Meet Sebastian
              </div>

              <div className="relative mx-auto w-full max-w-xs sm:max-w-sm mb-6 lg:hidden">
                <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent)_10%,transparent)_0%,transparent_72%)] blur-2xl" />
                <div className="relative flex items-end overflow-hidden rounded-[2rem] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_88%,transparent)] px-4 pt-4 pb-0 shadow-[var(--shadow-card)]">
                  <Image
                    src="/images/sebastian/sebastian-half.png"
                    alt="Sebastian, your personal AI fashion assistant"
                    width={720}
                    height={960}
                    className="block h-auto w-full rounded-t-2xl object-cover object-bottom"
                    priority={false}
                    quality={90}
                  />
                </div>
              </div>

              <h2 className="font-display mb-5 text-4xl font-normal leading-tight text-foreground lg:text-5xl">
                Your own personal stylist, on demand.
              </h2>

              <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed mb-7 max-w-2xl">
                Get confident outfit decisions in seconds. Sebastian helps you solve real styling problems with advice
                tailored to your wardrobe, your plans, and your life.
              </p>

              <div className="space-y-3 mb-8">
                {sebastianSellingPoints.map((point) => (
                  <p key={point} className="flex items-start gap-3 text-muted-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span>{point}</span>
                  </p>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/sebastian">
                  <Button size="lg" className="group px-8 py-4 text-base">
                    Meet Sebastian
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" size="lg" className="px-8 py-4 text-base">
                    View plans with Sebastian
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md hidden lg:block">
              <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent)_10%,transparent)_0%,transparent_72%)] blur-2xl" />
              <div className="relative flex items-end overflow-hidden rounded-[2rem] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_88%,transparent)] px-4 pt-4 pb-0 shadow-[var(--shadow-card)]">
                <Image
                  src="/images/sebastian/sebastian-half.png"
                  alt="Sebastian, your personal AI fashion assistant"
                  width={720}
                  height={960}
                  className="block h-auto w-full rounded-t-2xl object-cover object-bottom"
                  priority={false}
                  quality={90}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
