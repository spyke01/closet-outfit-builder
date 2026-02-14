'use client';

import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center">
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Ready to transform your wardrobe?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Join thousands who've already simplified their daily outfit selection with AI-powered styling.
          </p>
          
          <Link href="/auth/sign-up">
            <Button 
              size="lg"
              className="bg-primary text-primary-foreground hover:opacity-90 px-8 py-4 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
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
