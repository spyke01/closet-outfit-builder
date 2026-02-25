import { StaticPageNavigation } from "@/components/static-page-navigation";
import { StaticPageFooter } from "@/components/static-page-footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <StaticPageNavigation />
      
      <main className="pt-16">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
              <p className="text-muted-foreground">Last updated: February 25, 2026</p>
            </div>

            <div className="prose prose-lg max-w-none bg-card p-8 rounded-lg shadow-sm border border-border">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Scope and Overview</h2>
                <p className="text-muted-foreground mb-4">
                  This Privacy Policy explains how My AI Outfit (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
                  collects, uses, stores, shares, and protects personal information when you use our
                  application and related services (the &quot;Service&quot;). By using the Service, you
                  acknowledge the practices described in this Policy.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Information We Collect</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>
                    Account and identity data, such as email address, username, authentication identifiers,
                    and profile information you choose to provide.
                  </li>
                  <li>
                    Content you upload or create, including wardrobe item details, photos, style preferences,
                    saved looks, and other in-app data.
                  </li>
                  <li>
                    Transaction and billing data for paid features, processed through third-party payment
                    providers (we do not store full payment card numbers).
                  </li>
                  <li>
                    Device, log, and usage information, such as IP address, browser type, app events,
                    timestamps, pages/screens viewed, and feature interactions.
                  </li>
                  <li>
                    Approximate location information when needed for location-based features, such as weather
                    suggestions, and only as enabled by you.
                  </li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">How We Use Your Information</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Provide, maintain, and secure the Service.</li>
                  <li>Generate outfit recommendations and personalize your experience.</li>
                  <li>Provide optional weather- and context-based suggestions.</li>
                  <li>Process subscriptions, payments, refunds, and billing support requests.</li>
                  <li>Monitor performance, debug issues, and improve features and reliability.</li>
                  <li>Communicate with you about account activity, product updates, and service notices.</li>
                  <li>Prevent fraud, abuse, unauthorized access, and other harmful activity.</li>
                  <li>Comply with legal obligations and enforce our terms and policies.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Legal Bases for Processing (GDPR/UK GDPR)</h2>
                <p className="text-muted-foreground mb-4">
                  Where applicable, we process personal data under one or more of the following legal bases:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Performance of a contract (providing the Service you request).</li>
                  <li>Legitimate interests (service improvement, security, fraud prevention).</li>
                  <li>Consent (where required, including certain cookie categories).</li>
                  <li>Compliance with legal obligations.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Cookies and Similar Technologies</h2>
                <p className="text-muted-foreground mb-4">
                  We use cookies and similar technologies (such as local storage, SDKs, and session tokens) to
                  operate the Service and improve user experience.
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>
                    Strictly necessary cookies: used for authentication, security, and core app functionality.
                  </li>
                  <li>
                    Functional cookies: used to remember preferences and improve usability.
                  </li>
                  <li>
                    Analytics cookies: used to understand product usage and improve performance.
                  </li>
                  <li>
                    Advertising or cross-context tracking cookies: used only if implemented and where legally
                    permitted with required notices/choices.
                  </li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  You can usually control cookies through browser settings. If you disable certain cookies, some
                  features may not function properly. Where required by law, we request consent before setting
                  non-essential cookies.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">How We Share Information</h2>
                <p className="text-muted-foreground mb-4">
                  We do not sell your personal information for monetary compensation. We may share information:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>With service providers who process data on our behalf (hosting, auth, payments, support).</li>
                  <li>With analytics and infrastructure vendors under contractual safeguards.</li>
                  <li>When required by law, legal process, or to protect rights, safety, and security.</li>
                  <li>In connection with a merger, financing, acquisition, or sale of all or part of our business.</li>
                  <li>With your direction or consent.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Data Retention and Deletion</h2>
                <p className="text-muted-foreground mb-4">
                  We retain personal information for as long as necessary to provide the Service, meet legal,
                  accounting, tax, dispute-resolution, and enforcement requirements, and maintain security.
                  Retention periods depend on the data type and purpose.
                </p>
                <p className="text-muted-foreground">
                  When data is no longer required, we delete or de-identify it in accordance with applicable law
                  and operational backup cycles.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Data Security</h2>
                <p className="text-muted-foreground mb-4">
                  We implement technical and organizational safeguards designed to protect personal information,
                  including access controls, encryption in transit where appropriate, and logical isolation controls
                  (including Row Level Security for user data access boundaries).
                </p>
                <p className="text-muted-foreground">
                  No method of transmission or storage is completely secure. We cannot guarantee absolute security.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">International Data Transfers</h2>
                <p className="text-muted-foreground">
                  Your information may be processed in countries other than your own. Where required, we use
                  appropriate safeguards for cross-border transfers, such as contractual protections and other
                  lawful transfer mechanisms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Your Privacy Rights</h2>
                <p className="text-muted-foreground mb-4">
                  Depending on your location, you may have rights regarding your personal information, including
                  access, correction, deletion, portability, and objection or restriction of certain processing.
                </p>
                <p className="text-muted-foreground mb-4">
                  To exercise rights, contact us at{" "}
                  <a className="text-primary hover:underline" href="mailto:sales@myaioutfit.com">
                    sales@myaioutfit.com
                  </a>
                  . We may need to verify your identity before fulfilling a request.
                </p>
                <h3 className="text-xl font-semibold text-foreground mb-3">EEA/UK (GDPR/UK GDPR)</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Right to access, rectify, erase, or port personal data.</li>
                  <li>Right to restrict or object to certain processing.</li>
                  <li>Right to withdraw consent where processing is based on consent.</li>
                  <li>Right to lodge a complaint with a supervisory authority.</li>
                </ul>
                <h3 className="text-xl font-semibold text-foreground mb-3">California (CCPA/CPRA)</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Right to know the categories and specific pieces of personal information collected.</li>
                  <li>Right to request deletion or correction of personal information.</li>
                  <li>Right to opt out of &quot;sale&quot; or &quot;sharing&quot; for cross-context behavioral advertising.</li>
                  <li>Right to limit use and disclosure of sensitive personal information where applicable.</li>
                  <li>Right to non-discrimination for exercising privacy rights.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Children&apos;s Privacy</h2>
                <p className="text-muted-foreground">
                  The Service is not directed to children under 13 (or older age where required by local law).
                  We do not knowingly collect personal information from children in violation of applicable law.
                  If you believe a child provided personal information, contact us at{" "}
                  <a className="text-primary hover:underline" href="mailto:sales@myaioutfit.com">
                    sales@myaioutfit.com
                  </a>{" "}
                  so we can investigate and delete data as appropriate.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Changes to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this Privacy Policy periodically. Material changes will be communicated through
                  the Service or other reasonable channels. The &quot;Last updated&quot; date above reflects the latest
                  revision date.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have questions, requests, or complaints about this Privacy Policy, contact us at{" "}
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
