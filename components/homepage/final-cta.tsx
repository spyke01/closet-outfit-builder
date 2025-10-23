'use client';

import { Button } from "@/components/ui/button";
import { ArrowRight, Github, Twitter, Instagram } from "lucide-react";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="py-20 lg:py-32 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        {/* Final CTA */}
        <div className="text-center mb-20">
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Ready to transform your wardrobe?
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-8">
            Join thousands who've already simplified their daily outfit selection with AI-powered styling.
          </p>
          
          <Link href="/auth/sign-up">
            <Button 
              size="lg"
              className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white dark:text-white px-8 py-4 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-4">
            No credit card required • Start your free trial
          </p>
        </div>
        
        {/* Credibility & Community */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">W</span>
                </div>
                <span className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">What to Wear</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">Built by people who love great style.</p>
            </div>
            
            <div className="flex items-center gap-6">
              <Link 
                href="https://github.com/yourusername/what-to-wear" 
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-6 h-6" />
              </Link>
              <Link 
                href="https://twitter.com/whattowearapp" 
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-6 h-6" />
              </Link>
              <Link 
                href="https://instagram.com/whattowearapp" 
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-6 h-6" />
              </Link>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-slate-600 dark:text-slate-400">
            <Link href="/about" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">Contact</Link>
          </div>
          
          <div className="text-center mt-8 text-sm text-slate-500 dark:text-slate-500">
            <p>&copy; 2024 What to Wear. All rights reserved.</p>
          </div>
        </div>
      </div>
    </section>
  );
}