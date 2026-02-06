'use client';

import { Sparkles, Thermometer, Layers } from 'lucide-react';





const features = [
  {
    icon: Sparkles,
    title: "Smart Outfit Generator",
    description: "Mix and match your actual wardrobe to find the perfect look for any day.",
    gradient: "from-amber-100 to-amber-200",
    iconColor: "text-amber-600",
  },
  {
    icon: Thermometer,
    title: "Formality & Season Aware",
    description: "The app knows what's casual, office-ready, or evening-appropriate.",
    gradient: "from-blue-100 to-blue-200",
    iconColor: "text-blue-600",
  },
  {
    icon: Layers,
    title: "Curated Capsules",
    description: "Build refined capsule wardrobes that suit your lifestyle and simplify dressing.",
    gradient: "from-stone-100 to-stone-200",
    iconColor: "text-stone-700",
  },
];

export function FeatureHighlights() {
  return (
    <section className="py-20 lg:py-32 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Your wardrobe, reimagined
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Transform how you think about getting dressed with intelligent features designed for the modern wardrobe.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={feature.title}
                className="group text-center animate-slide-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className={`w-20 h-20 bg-gradient-to-br ${feature.gradient} rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <Icon className={`w-10 h-10 ${feature.iconColor}`} />
                </div>
                
                <h3 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  {feature.title}
                </h3>
                
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}