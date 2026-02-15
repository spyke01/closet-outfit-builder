'use client';

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from 'lucide-react';
import { heroOutfit } from '@/lib/data/landing-page-images';



export function HeroSection() {
  const scrollToDemo = () => {
    const demoSection = document.getElementById('how-it-works');
    demoSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-card to-background">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left side - Content */}
          <div className="text-center lg:text-left animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#294653] border border-[#3b6270] text-[#E8F0F2] rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Start your free trial
            </div>
            
            <h1 className="font-display text-5xl lg:text-7xl font-bold text-foreground leading-tight mb-6">
              Never wonder{' '}
              <span className="text-primary">My AI Outfit</span>{' '}
              again.
            </h1>
            
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-2xl">
              Your personal AI stylist that builds outfits from your real wardrobe — instantly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
              <Link href="/auth/sign-up">
                <Button 
                  size="lg" 
                  className="bg-[#D49E7C] text-[#1A2830] hover:bg-[#e1b08f] px-8 py-4 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={scrollToDemo}
                className="border-2 border-[#2f5664] bg-[#23414d] text-[#E8F0F2] hover:bg-[#2b4b57] px-8 py-4 text-lg font-semibold rounded-2xl transition-all duration-300"
              >
                See How It Works
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              No credit card required • Start free
            </p>
          </div>
          
          {/* Right side - Hero mockup */}
          <div className="relative animate-slide-in-right">
            <div className="relative bg-card rounded-3xl shadow-2xl p-8 border border-border">
              {/* Mock app interface */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">Today&apos;s Outfit</p>
                  <div className="w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-secondary-foreground" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-square bg-muted rounded-2xl overflow-hidden shadow-sm">
                    <Image
                      src={heroOutfit.shirt.src}
                      alt={heroOutfit.shirt.alt}
                      width={200}
                      height={200}
                      className="w-full h-full object-contain p-4"
                      priority
                      quality={85}
                    />
                  </div>
                  <div className="aspect-square bg-muted rounded-2xl overflow-hidden shadow-sm">
                    <Image
                      src={heroOutfit.pants.src}
                      alt={heroOutfit.pants.alt}
                      width={200}
                      height={200}
                      className="w-full h-full object-contain p-4"
                      priority
                      quality={85}
                    />
                  </div>
                  <div className="aspect-square bg-muted rounded-2xl overflow-hidden shadow-sm">
                    <Image
                      src={heroOutfit.shoes.src}
                      alt={heroOutfit.shoes.alt}
                      width={200}
                      height={200}
                      className="w-full h-full object-contain p-4"
                      priority
                      quality={85}
                    />
                  </div>
                  <div className="aspect-square bg-muted rounded-2xl overflow-hidden shadow-sm">
                    <Image
                      src={heroOutfit.accessory!.src}
                      alt={heroOutfit.accessory!.alt}
                      width={200}
                      height={200}
                      className="w-full h-full object-contain p-4"
                      priority
                      quality={85}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">Compatibility Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="w-14 h-full bg-primary rounded-full"></div>
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
