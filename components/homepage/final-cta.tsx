'use client';

import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="relative py-20 lg:py-32">
      <div className="mx-auto max-w-[1240px] px-6">
        <div className="glass-surface card-glow-blue app-section section-delay-1 rounded-[var(--radius-xl)] px-8 py-14 text-center">
          <h2 className="font-display mb-6 text-4xl font-normal text-foreground lg:text-5xl">
            Ready to transform your wardrobe?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Join thousands who&apos;ve already simplified their daily outfit selection with AI-powered styling.
          </p>
          
          <Link href="/auth/sign-up">
            <Button size="lg" className="group min-h-12 px-7 text-base">
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • Start your free trial
          </p>
        </div>
      </div>
    </section>
  );
}
