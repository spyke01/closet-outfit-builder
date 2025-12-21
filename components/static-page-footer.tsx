import Link from "next/link";

export function StaticPageFooter() {
  return (
    <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Product</h3>
            <div className="space-y-2">
              <Link href="/how-it-works" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                How it works
              </Link>
              <Link href="/pricing" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                Pricing
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Company</h3>
            <div className="space-y-2">
              <Link href="/about" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                About
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Legal</h3>
            <div className="space-y-2">
              <Link href="/privacy" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Get Started</h3>
            <div className="space-y-2">
              <Link href="/auth/sign-up" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                Create Account
              </Link>
              <Link href="/auth/login" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                Sign In
              </Link>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700 text-center text-slate-600 dark:text-slate-400">
          <p>&copy; 2024 What to Wear. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}