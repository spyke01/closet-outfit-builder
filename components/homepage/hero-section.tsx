'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function HeroSection() {
  const scrollToDemo = () => {
    const demoSection = document.getElementById('how-it-works');
    demoSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-stone-50 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f1f5f9' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left side - Content */}
          <div className="text-center lg:text-left animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-slate-700 text-blue-700 dark:text-slate-300 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Start your free trial
            </div>
            
            <h1 className="font-display text-5xl lg:text-7xl font-bold text-slate-900 dark:text-slate-100 leading-tight mb-6">
              Never wonder{' '}
              <span className="text-amber-600 dark:text-amber-400">what to wear</span>{' '}
              again.
            </h1>
            
            <p className="text-xl lg:text-2xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-2xl">
              Your personal AI stylist that builds outfits from your real wardrobe — instantly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
              <Link href="/auth/sign-up">
                <Button 
                  size="lg" 
                  className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white dark:text-white px-8 py-4 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={scrollToDemo}
                className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-8 py-4 text-lg font-semibold rounded-2xl transition-all duration-300"
              >
                See How It Works
              </Button>
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-500">
              No credit card required • Start free
            </p>
          </div>
          
          {/* Right side - Hero mockup */}
          <div className="relative animate-slide-in-right">
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
              {/* Mock app interface */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">Today's Outfit</h3>
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-square bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center">
                    <div className="text-slate-600 dark:text-slate-400 text-sm font-medium">Shirt</div>
                  </div>
                  <div className="aspect-square bg-gradient-to-br from-stone-100 to-stone-200 rounded-2xl flex items-center justify-center">
                    <div className="text-slate-600 dark:text-slate-400 text-sm font-medium">Pants</div>
                  </div>
                  <div className="aspect-square bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center">
                    <div className="text-slate-600 dark:text-slate-400 text-sm font-medium">Shoes</div>
                  </div>
                  <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl flex items-center justify-center">
                    <div className="text-slate-600 dark:text-slate-400 text-sm font-medium">Watch</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Compatibility Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="w-14 h-full bg-amber-500 dark:bg-amber-400 rounded-full"></div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">92%</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-amber-600" />
            </div>
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shadow-lg">
              <div className="w-6 h-6 bg-blue-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}