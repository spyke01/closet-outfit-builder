'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Upload, Sparkles, Heart } from 'lucide-react';
import { uploadStepItems, aiMatchingItems, finalOutfitItems } from '@/lib/data/landing-page-images';

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Your Wardrobe",
    description: "Snap or upload photos of your clothes — the app automatically removes backgrounds.",
    image: "upload",
  },
  {
    number: "02", 
    icon: Sparkles,
    title: "Let AI Do the Work",
    description: "It intelligently matches shirts, pants, shoes, and accessories for any occasion.",
    image: "ai",
  },
  {
    number: "03",
    icon: Heart,
    title: "Pick Your Outfit & Go",
    description: "Save your favorites or randomize new ones each day.",
    image: "outfit",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 lg:py-32">
      <div className="mx-auto max-w-[1240px] px-6">
        <div className="app-section section-delay-1 mb-16 text-center">
          <h2 className="font-display mb-6 text-4xl font-normal text-foreground lg:text-5xl">
            How it works
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Getting started is effortless. Three simple steps to transform your daily outfit selection.
          </p>
        </div>
        
        <div className="space-y-20 lg:space-y-28">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 0;
            
            return (
              <div 
                key={step.number}
                className={`grid items-center gap-12 lg:grid-cols-2 lg:gap-20 ${
                  isEven ? '' : 'lg:grid-flow-col-dense'
                }`}
              >
                {/* Content */}
                <div className="app-section">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="font-display text-6xl font-normal text-primary">
                      {step.number}
                    </span>
                    <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--accent-muted)]">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  
                  <h3 className="font-display mb-6 text-3xl font-normal text-foreground lg:text-4xl">
                    {step.title}
                  </h3>
                  
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                    {step.description}
                  </p>
                </div>
                
                {/* Visual */}
                <div className={`app-section ${isEven ? '' : 'lg:col-start-1'}`}>
                  <div className="glass-surface relative rounded-[var(--radius-xl)] p-8">
                    {/* Mock interface based on step */}
                    {step.image === 'upload' && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--accent-muted)]">
                            <Upload className="w-12 h-12 text-primary" />
                          </div>
                  <p className="text-muted-foreground">Drag & drop your photos</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {uploadStepItems.map((item, i) => (
                            <div key={i} className="aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]">
                              <Image
                                src={item.src}
                                alt={item.alt}
                                width={120}
                                height={120}
                                className="w-full h-full object-contain p-2"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {step.image === 'ai' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <span className="text-foreground font-semibold">Generating outfits...</span>
                          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                        </div>
                        <div className="space-y-3">
                          {aiMatchingItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="h-12 w-12 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]">
                                <Image
                                  src={item.src}
                                  alt={item.alt}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-contain p-1"
                                />
                              </div>
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-surface-active)]">
                                <div 
                                  className="h-full bg-primary rounded-full transition-all duration-1000"
                                  style={{ width: `${80 + i * 5}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {step.image === 'outfit' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <span className="text-foreground font-semibold">Perfect match!</span>
                          <Heart className="w-6 h-6 text-primary fill-current" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {finalOutfitItems.map((item, i) => (
                            <div key={i} className="aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]">
                              <Image
                                src={item.src}
                                alt={item.alt}
                                width={120}
                                height={120}
                                className="w-full h-full object-contain p-3"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="text-center">
                          <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[var(--accent-muted)] px-4 py-2 text-sm font-semibold text-primary">
                            <Sparkles className="w-4 h-4" />
                            95% compatibility
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="text-center mt-16">
          <Link href="/auth/sign-up">
            <Button size="lg" className="px-8 py-4 text-lg">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
