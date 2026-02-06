'use client';

import Link from "next/link";
import { Upload, Sparkles, Heart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { StaticPageNavigation } from "@/components/static-page-navigation";
import { StaticPageFooter } from "@/components/static-page-footer";

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

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-cream-50 to-navy-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <StaticPageNavigation />
      
      <main className="pt-16">
        <section className="py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h1 className="font-display text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                How it works
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
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
                    <div>
                      <div className="flex items-center gap-4 mb-6">
                        <span className="font-display text-6xl font-bold text-amber-600 dark:text-amber-500">
                          {step.number}
                        </span>
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-2xl flex items-center justify-center">
                          <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      
                      <h2 className="font-display text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                        {step.title}
                      </h2>
                      
                      <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                        {step.description}
                      </p>
                    </div>
                    
                    {/* Visual */}
                    <div className={isEven ? '' : 'lg:col-start-1'}>
                      <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
                        {/* Mock interface based on step */}
                        {step.image === 'upload' && (
                          <div className="space-y-6">
                            <div className="text-center">
                              <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <Upload className="w-12 h-12 text-amber-600 dark:text-amber-400" />
                              </div>
                              <p className="text-slate-600 dark:text-slate-400">Drag & drop your photos</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              {[1, 2, 3].map((i) => (
                                <div key={i} className="aspect-square bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl"></div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {step.image === 'ai' && (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-900 dark:text-slate-100 font-semibold">Generating outfits...</span>
                              <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-500 animate-pulse" />
                            </div>
                            <div className="space-y-3">
                              {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-700 rounded-lg"></div>
                                  <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-amber-500 dark:bg-amber-600 rounded-full transition-all duration-1000"
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
                              <span className="text-slate-900 dark:text-slate-100 font-semibold">Perfect match!</span>
                              <Heart className="w-6 h-6 text-red-500 fill-current" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="aspect-square bg-gradient-to-br from-blue-100 to-amber-100 dark:from-blue-900 dark:to-amber-900 rounded-2xl flex items-center justify-center">
                                  <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full"></div>
                                </div>
                              ))}
                            </div>
                            <div className="text-center">
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium">
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
                <Button 
                  size="lg"
                  className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white dark:text-white px-8 py-4 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Start Your Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <StaticPageFooter />
    </div>
  );
}
