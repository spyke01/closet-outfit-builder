import { StaticPageNavigation } from "@/components/static-page-navigation";
import { StaticPageFooter } from "@/components/static-page-footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <StaticPageNavigation />
      
      <main className="pt-16">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
              <p className="text-muted-foreground">Last updated: February 25, 2026</p>
            </div>

            <div className="prose prose-lg max-w-none bg-card p-8 rounded-lg shadow-sm border border-border">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Acceptance of Terms</h2>
                <p className="text-muted-foreground mb-4">
                  By accessing or using My AI Outfit (&quot;Service&quot;), you agree to be bound by these Terms
                  of Service (&quot;Terms&quot;). If you do not agree, do not use the Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Eligibility and Account Registration</h2>
                <p className="text-muted-foreground mb-4">
                  You must provide accurate account information and keep your login credentials secure. You are
                  responsible for activity under your account and for promptly notifying us of unauthorized use.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">License to Use the Service</h2>
                <p className="text-muted-foreground mb-4">
                  Subject to these Terms, we grant you a limited, non-exclusive, non-transferable,
                  revocable license to use the Service for your personal or internal business use.
                </p>
                <p className="text-muted-foreground mb-4">You agree not to:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Use the Service for unlawful, fraudulent, abusive, or deceptive purposes.</li>
                  <li>Reverse engineer, decompile, scrape, or interfere with the Service.</li>
                  <li>Bypass security controls, rate limits, or access restrictions.</li>
                  <li>Upload malicious code, infringing content, or content violating others&apos; rights.</li>
                  <li>Use automated means to extract data except as explicitly authorized.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">User Content</h2>
                <p className="text-muted-foreground mb-4">
                  You retain ownership of content you upload, including wardrobe images and related metadata.
                  You grant us a limited license to host, store, process, reproduce, and display that content
                  solely as needed to operate, improve, and provide the Service.
                </p>
                <p className="text-muted-foreground">
                  You represent that you have all rights necessary to upload content and that it does not violate
                  law or third-party rights.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Subscriptions, Billing, and Payments</h2>
                <p className="text-muted-foreground mb-4">
                  Certain features may require a paid subscription. By purchasing a subscription, you authorize
                  charges according to the pricing and billing terms shown at purchase.
                </p>
                <p className="text-muted-foreground">
                  Payments may be processed by third-party providers. You agree to their applicable terms.
                  Unless otherwise stated, fees are non-refundable except where required by law.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Privacy and Cookies</h2>
                <p className="text-muted-foreground">
                  Your use of the Service is also governed by our Privacy Policy, including our use of cookies and
                  similar technologies. Please review the Privacy Policy for details about data processing,
                  retention, and privacy choices.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Third-Party Services</h2>
                <p className="text-muted-foreground">
                  The Service may integrate with or link to third-party tools, payment processors, hosting, or
                  analytics providers. We do not control third-party services and are not responsible for their
                  content, privacy practices, or availability.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Intellectual Property</h2>
                <p className="text-muted-foreground">
                  The Service, including software, branding, designs, text, graphics, and underlying technology
                  (excluding your content), is owned by us or our licensors and protected by intellectual property
                  laws. These Terms do not grant ownership rights in the Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">AI-Generated Content Notice</h2>
                <p className="text-muted-foreground">
                  Outfit suggestions and other generated outputs are informational and may be incomplete,
                  inaccurate, or unsuitable for your specific preferences or circumstances. You remain responsible
                  for your decisions and use of any recommendations.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Termination</h2>
                <p className="text-muted-foreground">
                  You may stop using the Service at any time. We may suspend or terminate access if you violate
                  these Terms, create risk for users or the Service, or where required by law. Sections that by
                  nature should survive termination will remain in effect.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Disclaimer of Warranties</h2>
                <p className="text-muted-foreground mb-4">
                  The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the maximum extent permitted
                  by law, we disclaim all warranties, express or implied, including merchantability, fitness for
                  a particular purpose, non-infringement, and uninterrupted or error-free operation.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Limitation of Liability</h2>
                <p className="text-muted-foreground mb-4">
                  To the maximum extent permitted by law, we and our affiliates, licensors, and service providers
                  are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages,
                  or for loss of profits, revenue, data, or goodwill, arising from or related to your use of
                  the Service.
                </p>
                <p className="text-muted-foreground">
                  To the extent liability cannot be excluded, our aggregate liability for all claims related to
                  the Service will not exceed the amount you paid us (if any) for the Service in the 12 months
                  preceding the event giving rise to the claim.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Indemnification</h2>
                <p className="text-muted-foreground">
                  You agree to defend, indemnify, and hold harmless My AI Outfit and its affiliates from claims,
                  liabilities, damages, losses, and expenses arising out of your content, your use of the Service,
                  or your violation of these Terms or applicable law.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Governing Law</h2>
                <p className="text-muted-foreground">
                  These Terms are governed by applicable laws of the jurisdiction in which the Service operator is
                  established, without regard to conflict-of-law principles, unless otherwise required by consumer
                  protection law.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Changes to the Terms</h2>
                <p className="text-muted-foreground">
                  We may update these Terms from time to time. If we make material changes, we will provide notice
                  through the Service or by other reasonable means. Continued use after changes become effective
                  constitutes acceptance of the updated Terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Information</h2>
                <p className="text-muted-foreground">
                  If you have questions about these Terms of Service, contact us at{" "}
                  <a className="text-primary hover:underline" href="mailto:sales@myaioutfit.com">
                    sales@myaioutfit.com
                  </a>
                  .
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
