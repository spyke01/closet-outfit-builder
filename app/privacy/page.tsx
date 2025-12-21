import Link from "next/link";
import { StaticPageNavigation } from "@/components/static-page-navigation";
import { StaticPageFooter } from "@/components/static-page-footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-cream-50 to-navy-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <StaticPageNavigation />
      
      <main className="pt-16">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">Privacy Policy</h1>
              <p className="text-slate-600 dark:text-slate-400">Last updated: December 2024</p>
            </div>

            <div className="prose prose-lg max-w-none bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Information We Collect</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  We collect information you provide directly to us, such as when you create an account, 
                  upload wardrobe items, or contact us for support.
                </p>
                <ul className="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
                  <li>Account information (email address, profile data)</li>
                  <li>Wardrobe items and photos you upload</li>
                  <li>Usage data and preferences</li>
                  <li>Location data (for weather features, with your consent)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">How We Use Your Information</h2>
                <ul className="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
                  <li>Provide and maintain our services</li>
                  <li>Generate outfit recommendations</li>
                  <li>Provide weather-based suggestions</li>
                  <li>Improve our algorithms and user experience</li>
                  <li>Communicate with you about your account</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Data Security</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  We implement Row Level Security (RLS) to ensure complete data isolation between users. 
                  Your wardrobe data is private and only accessible to you.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Data Sharing</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  We do not sell, trade, or otherwise transfer your personal information to third parties. 
                  Your wardrobe data remains private and is never shared.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Contact Us</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  If you have any questions about this Privacy Policy, please contact us through our support channels.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
      
      <StaticPageFooter />
    </div>
  );
}