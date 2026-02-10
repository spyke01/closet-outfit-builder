import Link from "next/link";
import { StaticPageNavigation } from "@/components/static-page-navigation";
import { StaticPageFooter } from "@/components/static-page-footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-cream-50 to-navy-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <StaticPageNavigation />
      
      <main className="pt-16">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">Terms of Service</h1>
              <p className="text-slate-600 dark:text-slate-400">Last updated: December 2024</p>
            </div>

            <div className="prose prose-lg max-w-none bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Acceptance of Terms</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  By accessing and using My AI Outfit, you accept and agree to be bound by the terms 
                  and provision of this agreement.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Use License</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  Permission is granted to temporarily use My AI Outfit for personal, non-commercial 
                  transitory viewing only. This is the grant of a license, not a transfer of title.
                </p>
                <p className="text-slate-700 dark:text-slate-300 mb-4">Under this license you may not:</p>
                <ul className="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for commercial purposes</li>
                  <li>Attempt to reverse engineer any software</li>
                  <li>Remove any copyright or proprietary notations</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">User Content</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  You retain ownership of all content you upload to My AI Outfit. By uploading content, 
                  you grant us a license to use, store, and process your content solely for the purpose 
                  of providing our services.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Privacy</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  Your privacy is important to us. Please review our Privacy Policy, which also governs 
                  your use of the service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Disclaimer</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  The materials on My AI Outfit are provided on an 'as is' basis. My AI Outfit makes 
                  no warranties, expressed or implied, and hereby disclaims and negates all other warranties 
                  including without limitation, implied warranties or conditions of merchantability, 
                  fitness for a particular purpose, or non-infringement of intellectual property or 
                  other violation of rights.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Limitations</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  In no event shall My AI Outfit or its suppliers be liable for any damages (including, 
                  without limitation, damages for loss of data or profit, or due to business interruption) 
                  arising out of the use or inability to use My AI Outfit, even if My AI Outfit or a 
                  My AI Outfit authorized representative has been notified orally or in writing of the 
                  possibility of such damage.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Contact Information</h2>
                <p className="text-slate-700 dark:text-slate-300">
                  If you have any questions about these Terms of Service, please contact us through 
                  our support channels.
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