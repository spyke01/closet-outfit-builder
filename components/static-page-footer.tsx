import Link from "next/link";
import { Logo } from "@/components/logo";

export function StaticPageFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-[1] border-t border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_72%,transparent)] backdrop-blur-[18px]">
      <div className="mx-auto max-w-[1240px] px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Product</h3>
            <div className="space-y-2">
              <Link href="/#how-it-works" className="block text-muted-foreground transition-colors hover:text-foreground">
                How it works
              </Link>
              <Link href="/sebastian" className="block text-muted-foreground transition-colors hover:text-foreground">
                Sebastian
              </Link>
              <Link href="/pricing" className="block text-muted-foreground transition-colors hover:text-foreground">
                Pricing
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Company</h3>
            <div className="space-y-2">
              <Link href="/about" className="block text-muted-foreground transition-colors hover:text-foreground">
                About
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Legal</h3>
            <div className="space-y-2">
              <Link href="/privacy" className="block text-muted-foreground transition-colors hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="/terms" className="block text-muted-foreground transition-colors hover:text-foreground">
                Terms of Service
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Get Started</h3>
            <div className="space-y-2">
              <Link href="/auth/sign-up" className="block text-muted-foreground transition-colors hover:text-foreground">
                Create Account
              </Link>
              <Link href="/auth/login" className="block text-muted-foreground transition-colors hover:text-foreground">
                Sign In
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-8 md:flex-row">
          <Link href="/" className="flex items-center">
            <Logo className="h-10 w-auto" />
          </Link>
          <p className="text-sm text-muted-foreground">&copy; {currentYear} My AI Outfit. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
