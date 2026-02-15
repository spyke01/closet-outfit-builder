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
    <section id="how-it-works" className="py-20 lg:py-32 bg-gradient-to-br from-card to-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-foreground mb-6">
            How it works
          </h2>
          <p className="text-xl text-muted-foreground text-foreground/85 max-w-3xl mx-auto">
            Getting started is effortless. Three simple steps to transform your daily outfit selection.
          </p>
        </div>
        
        <div className="space-y-20 lg:space-y-32">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 0;
            
            return (
              <div 
                key={step.number}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
                  isEven ? '' : 'lg:grid-flow-col-dense'
                }`}
              >
                {/* Content */}
                <div className={`animate-slide-in-${isEven ? 'left' : 'right'}`}>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="font-display text-6xl font-bold text-primary">
                      {step.number}
                    </span>
                    <div className="w-16 h-16 rounded-2xl bg-secondary/20 border border-[#3b6270] bg-[#294653] flex items-center justify-center">
                      <Icon className="w-8 h-8 text-[#E8F0F2]" />
                    </div>
                  </div>
                  
                  <h3 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-6">
                    {step.title}
                  </h3>
                  
                  <p className="text-xl text-muted-foreground text-foreground/80 leading-relaxed mb-8">
                    {step.description}
                  </p>
                </div>
                
                {/* Visual */}
                <div className={`animate-slide-in-${isEven ? 'right' : 'left'} ${isEven ? '' : 'lg:col-start-1'}`}>
                  <div className="relative bg-card rounded-3xl shadow-2xl p-8 border border-border">
                    {/* Mock interface based on step */}
                    {step.image === 'upload' && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <div className="w-24 h-24 rounded-3xl border border-[#3b6270] bg-[#294653] flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-12 h-12 text-[#E8F0F2]" />
                          </div>
                          <p className="text-muted-foreground text-foreground/80">Drag & drop your photos</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {uploadStepItems.map((item, i) => (
                            <div key={i} className="aspect-square bg-muted rounded-xl overflow-hidden shadow-sm">
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
                              <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden shadow-sm">
                                <Image
                                  src={item.src}
                                  alt={item.alt}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-contain p-1"
                                />
                              </div>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
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
                            <div key={i} className="aspect-square rounded-2xl overflow-hidden shadow-sm border border-[#2b4f5d] bg-[#1e3641]">
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
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-[#4f8092] bg-[#2d5563] text-[#EAF4F7]">
                            <Sparkles className="w-4 h-4 text-[#EAF4F7]" />
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
            <Button 
              size="lg"
              className="bg-primary text-primary-foreground hover:opacity-90 px-8 py-4 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
