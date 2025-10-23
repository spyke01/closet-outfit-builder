'use client';

import { Sparkles, Heart, Thermometer } from "lucide-react";

export function AppDemo() {
  return (
    <section className="py-20 lg:py-32 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Built for your closet. Designed for your life.
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            See how What to Wear transforms your daily outfit selection with intelligent recommendations.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Main app mockup */}
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-8 shadow-2xl">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">Today&apos;s Outfit</h3>
                  <p className="text-slate-600 dark:text-slate-400">Perfect for 72°F, partly cloudy</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  95% Match
                </div>
              </div>

              {/* Outfit grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="aspect-square bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl opacity-80"></div>
                    <span className="relative text-white text-xs font-medium">Blazer</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 text-center">Navy Blazer</p>
                </div>

                <div className="space-y-2">
                  <div className="aspect-square bg-gradient-to-br from-stone-100 to-stone-200 rounded-2xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-2 bg-gradient-to-br from-stone-600 to-stone-700 rounded-xl opacity-80"></div>
                    <span className="relative text-white text-xs font-medium">Shirt</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 text-center">White Oxford</p>
                </div>

                <div className="space-y-2">
                  <div className="aspect-square bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-2 bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl opacity-80"></div>
                    <span className="relative text-white text-xs font-medium">Pants</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 text-center">Khaki Chinos</p>
                </div>

                <div className="space-y-2">
                  <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl opacity-80"></div>
                    <span className="relative text-white text-xs font-medium">Shoes</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 text-center">Brown Loafers</p>
                </div>
              </div>

              {/* Score breakdown */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <h4 className="font-semibold text-slate-900">Compatibility Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Style Harmony</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="w-15 h-full bg-amber-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-slate-900">94%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Weather Appropriate</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="w-full h-full bg-amber-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-slate-900">98%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Formality Match</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="w-14 h-full bg-amber-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-slate-900">92%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button className="flex-1 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white py-3 rounded-xl font-medium transition-colors">
                  Wear This Outfit
                </button>
                <button className="px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <Heart className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button className="px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <Sparkles className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* Floating weather widget */}
            <div className="absolute -top-4 -right-4 bg-white rounded-2xl p-4 shadow-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center">
                  <Thermometer className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">72°F</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Partly Cloudy</p>
                </div>
              </div>
            </div>
          </div>

          {/* Floating elements */}
          <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-gradient-to-br from-stone-100 to-stone-200 rounded-3xl flex items-center justify-center shadow-lg">
            <div className="w-10 h-10 bg-stone-600 rounded-2xl"></div>
          </div>
          <div className="absolute -top-6 left-1/4 w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-8 h-8 text-amber-600" />
          </div>
        </div>
      </div>
    </section>
  );
}