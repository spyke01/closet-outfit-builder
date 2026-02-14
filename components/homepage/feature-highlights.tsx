'use client';

import Image from 'next/image';
import { Sparkles, Thermometer, Layers } from 'lucide-react';
import { featureImages } from '@/lib/data/landing-page-images';

const features = [
  {
    icon: Sparkles,
    title: "Smart Outfit Generator",
    description: "Mix and match your actual wardrobe to find the perfect look for any day.",
    tileClass: "bg-secondary/20",
    iconColor: "text-secondary-foreground",
    image: featureImages.smartGenerator,
  },
  {
    icon: Thermometer,
    title: "Formality & Season Aware",
    description: "The app knows what's casual, office-ready, or evening-appropriate.",
    tileClass: "bg-primary/15",
    iconColor: "text-primary",
    image: featureImages.weatherAware,
  },
  {
    icon: Layers,
    title: "Curated Capsules",
    description: "Build refined capsule wardrobes that suit your lifestyle and simplify dressing.",
    tileClass: "bg-muted",
    iconColor: "text-muted-foreground",
    image: featureImages.capsuleWardrobe,
  },
];

export function FeatureHighlights() {
  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Your wardrobe, reimagined
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
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
                <div className={`w-20 h-20 ${feature.tileClass} rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <Icon className={`w-10 h-10 ${feature.iconColor}`} />
                </div>
                
                {/* Product image */}
                <div className="w-32 h-32 mx-auto mb-4 relative">
                  <Image
                    src={feature.image.src}
                    alt={feature.image.alt}
                    width={128}
                    height={128}
                    className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                    loading="lazy"
                    quality={85}
                  />
                </div>
                
                <h3 className="font-display text-2xl font-semibold text-foreground mb-4">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
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
