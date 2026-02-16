import Link from "next/link";
import { Logo } from "@/components/logo";

export function StaticPageFooter() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Product</h3>
            <div className="space-y-2">
              <Link href="/how-it-works" className="block text-muted-foreground text-foreground/80 hover:text-foreground transition-colors">
                How it works
              </Link>
              <Link href="/sebastian" className="block text-muted-foreground text-foreground/80 hover:text-foreground transition-colors">
                Sebastian
              </Link>
              <Link href="/pricing" className="block text-muted-foreground text-foreground/80 hover:text-foreground transition-colors">
                Pricing
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Company</h3>
            <div className="space-y-2">
              <Link href="/about" className="block text-muted-foreground text-foreground/80 hover:text-foreground transition-colors">
                About
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Legal</h3>
            <div className="space-y-2">
              <Link href="/privacy" className="block text-muted-foreground text-foreground/80 hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="block text-muted-foreground text-foreground/80 hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Get Started</h3>
            <div className="space-y-2">
              <Link href="/auth/sign-up" className="block text-muted-foreground text-foreground/80 hover:text-foreground transition-colors">
                Create Account
              </Link>
              <Link href="/auth/login" className="block text-muted-foreground text-foreground/80 hover:text-foreground transition-colors">
                Sign In
              </Link>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center">
            <Logo className="h-10 w-auto" />
          </Link>
          <p className="text-muted-foreground text-foreground/75 text-sm">&copy; 2024 My AI Outfit. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
