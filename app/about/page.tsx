import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StaticPageNavigation } from "@/components/static-page-navigation";
import { StaticPageFooter } from "@/components/static-page-footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-cream-50 to-navy-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <StaticPageNavigation />
      
      <main className="pt-16">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">About My AI Outfit</h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Intelligent outfit composition for the modern wardrobe
              </p>
            </div>

            <div className="prose prose-lg max-w-none">
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Our Mission</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-6">
                  My AI Outfit helps fashion-conscious individuals organize their personal wardrobe digitally 
                  and discover new outfit combinations from their existing clothes. Our intelligent outfit engine 
                  uses compatibility algorithms to suggest combinations based on style, formality, and weather conditions.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Key Features</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Personal & Secure</h3>
                    <p className="text-slate-700 dark:text-slate-300">Multi-user authentication with complete data privacy and isolation</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Custom Wardrobe</h3>
                    <p className="text-slate-700 dark:text-slate-300">Upload your own clothing photos with automatic background removal</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Smart Recommendations</h3>
                    <p className="text-slate-700 dark:text-slate-300">AI-powered outfit suggestions based on style compatibility</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Weather Integration</h3>
                    <p className="text-slate-700 dark:text-slate-300">Location-based outfit recommendations considering weather forecasts</p>
                  </div>
                </div>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Technology</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  Built with modern web technologies including Next.js, React, TypeScript, and Supabase. 
                  Our Progressive Web App (PWA) works across all devices with offline capabilities.
                </p>
              </section>
            </div>

            <div className="text-center mt-12">
              <Button asChild size="lg" className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white dark:text-white rounded-xl">
                <Link href="/auth/sign-up">
                  Get Started Today
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <StaticPageFooter />
    </div>
  );
}