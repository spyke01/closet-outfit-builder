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
    <section className="relative py-16 lg:py-24">
      <div className="mx-auto max-w-[1240px] px-6">
        <div className="app-section section-delay-1 mb-12 text-center lg:mb-14">
          <h2 className="font-display mb-6 text-4xl font-normal text-foreground lg:text-5xl">
            Your wardrobe, reimagined
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform how you think about getting dressed with intelligent features designed for the modern wardrobe.
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={feature.title}
                className="glass-surface app-section group p-6 text-center lg:p-8"
                style={{ animationDelay: `${0.08 + index * 0.08}s` }}
              >
                <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[var(--radius-xl)] border border-[var(--border-subtle)] ${feature.tileClass} shadow-[var(--shadow-card)] transition-transform duration-300 group-hover:scale-105`}>
                  <Icon className={`w-10 h-10 ${feature.iconColor}`} />
                </div>
                
                {/* Product image */}
                <div className="relative mx-auto mb-5 h-32 w-32 rounded-[var(--radius-lg)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)] p-3">
                  <Image
                    src={feature.image.src}
                    alt={feature.image.alt}
                    width={128}
                    height={128}
                    className="h-full w-full object-contain opacity-85 transition-opacity group-hover:opacity-100"
                    loading="lazy"
                    quality={85}
                  />
                </div>
                
                <h3 className="font-display mb-4 text-2xl font-normal text-foreground">
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
