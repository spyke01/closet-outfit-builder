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
      className="py-20 lg:py-28 bg-gradient-to-b from-background via-card/30 to-background"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[#D49E7C]/25 blur-3xl" />

          <div className="relative grid lg:grid-cols-[1.2fr_0.8fr] gap-10 lg:gap-12 p-8 md:p-12 lg:p-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 text-primary text-sm font-semibold mb-5">
                <Sparkles className="w-4 h-4" />
                Meet Sebastian
              </div>

              <div className="relative mx-auto w-full max-w-xs sm:max-w-sm mb-6 lg:hidden">
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-t from-primary/20 to-transparent blur-2xl" />
                <div className="relative rounded-[2rem] border border-border/70 bg-background/70 px-4 pt-4 pb-0 shadow-xl overflow-hidden flex items-end">
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

              <h2 className="font-display text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-5">
                Your own personal stylist, on demand.
              </h2>

              <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed mb-7 max-w-2xl">
                Get confident outfit decisions in seconds. Sebastian helps you solve real styling problems with advice
                tailored to your wardrobe, your plans, and your life.
              </p>

              <div className="space-y-3 mb-8">
                {sebastianSellingPoints.map((point) => (
                  <p key={point} className="flex items-start gap-3 text-foreground/90">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span>{point}</span>
                  </p>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/sebastian">
                  <Button
                    size="lg"
                    className="bg-[#D49E7C] text-[#1A2830] hover:bg-[#e1b08f] px-8 py-4 text-base font-semibold rounded-2xl group"
                  >
                    Meet Sebastian
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" size="lg" className="rounded-2xl px-8 py-4 text-base">
                    View plans with Sebastian
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md hidden lg:block">
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-t from-primary/20 to-transparent blur-2xl" />
              <div className="relative rounded-[2rem] border border-border/70 bg-background/70 px-4 pt-4 pb-0 shadow-xl overflow-hidden flex items-end">
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
