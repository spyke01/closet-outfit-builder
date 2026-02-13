'use client';

import { Button } from "@/components/ui/button";
import { ArrowRight, Github, Twitter, Instagram } from 'lucide-react';




import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        {/* Final CTA */}
        <div className="text-center mb-20">
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
        
        {/* Credibility & Community */}
        <div className="border-t border-border pt-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">W</span>
                </div>
                <span className="font-display text-xl font-bold text-foreground">My AI Outfit</span>
              </div>
              <p className="text-muted-foreground">Built by people who love great style.</p>
            </div>
            
            <div className="flex items-center gap-6">
              <Link 
                href="https://github.com/yourusername/my-ai-outfit" 
                className="text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-6 h-6" />
              </Link>
              <Link 
                href="https://twitter.com/myaioutfitapp" 
                className="text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-6 h-6" />
              </Link>
              <Link 
                href="https://instagram.com/myaioutfitapp" 
                className="text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-6 h-6" />
              </Link>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground dark:hover:text-muted-foreground transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-foreground dark:hover:text-muted-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground dark:hover:text-muted-foreground transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-foreground dark:hover:text-muted-foreground transition-colors">Contact</Link>
          </div>
          
          <div className="text-center mt-8 text-sm text-muted-foreground">
            <p>&copy; 2024 My AI Outfit. All rights reserved.</p>
          </div>
        </div>
      </div>
    </section>
  );
}