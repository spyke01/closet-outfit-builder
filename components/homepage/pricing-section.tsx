'use client';




import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check, Sparkles, Crown } from 'lucide-react';

const plans = [
  {
    name: "Starter",
    description: "Perfect for getting started",
    price: "Free",
    period: "trial",
    features: [
      "Up to 50 wardrobe items",
      "Smart outfit generation",
      "Weather integration",
      "Compatibility scoring",
      "Mobile & desktop access",
      "Private & secure",
    ],
    cta: "Start Free Trial",
    href: "/auth/sign-up",
    popular: true,
    icon: Sparkles,
  },
  {
    name: "Pro",
    description: "For style enthusiasts & creators",
    price: "Coming Soon",
    period: "",
    features: [
      "Unlimited wardrobe items",
      "Advanced analytics",
      "Brand collaboration tools",
      "Export & sharing features",
      "Priority support",
      "Early access to new features",
    ],
    cta: "Join Waitlist",
    href: "#waitlist",
    popular: false,
    icon: Crown,
  },
];

export function PricingSection() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-muted to-muted from-card to-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Start with a free trial and upgrade when you're ready. No hidden fees, no surprises.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative bg-card rounded-3xl shadow-xl p-8 lg:p-10 border-2 transition-all duration-300 hover:shadow-2xl animate-slide-up ${plan.popular
                  ? 'border-amber-300 dark:border-amber-400 ring-4 ring-amber-100 dark:ring-amber-400/20'
                  : 'border-border hover:border-border'
                  }`}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${plan.popular
                    ? 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30'
                    : 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30'
                    }`}>
                    <Icon className={`w-8 h-8 ${plan.popular ? 'text-amber-600 dark:text-amber-400' : 'text-primary'
                      }`} />
                  </div>

                  <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                    {plan.name}
                  </h3>

                  <p className="text-muted-foreground mb-6">
                    {plan.description}
                  </p>

                  <div className="mb-6">
                    <span className="font-display text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground ml-2">
                        {plan.period}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span className="text-muted-foreground text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.href} className="block">
                  <Button
                    className={`w-full py-4 text-lg font-semibold rounded-2xl transition-all duration-300 ${plan.popular
                      ? 'bg-primary hover:opacity-90 dark:bg-primary dark:hover:opacity-90 text-white  shadow-lg hover:shadow-xl'
                      : 'bg-muted hover:bg-muted dark:hover:bg-muted text-foreground'
                      }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Questions? <a href="mailto:hello@myaioutfit.app" className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium">Get in touch</a>
          </p>
        </div>
      </div>
    </section>
  );
}