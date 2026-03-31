import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { ThemeDomSync } from "@/components/theme-dom-sync";
import { getCanonicalSiteUrl } from "@/lib/seo/site-url";
import "./globals.css";

const defaultUrl = getCanonicalSiteUrl();

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "My AI Outfit – Your Personal AI Wardrobe Stylist",
  description: "Upload your wardrobe and let AI create perfect outfits for work, travel, or everyday life. Free and private.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/favicon.svg", color: "#1e293b" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "My AI Outfit",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "apple-mobile-web-app-title": "My AI Outfit",
  },
};

// eslint-disable-next-line react-refresh/only-export-components
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fefefe" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaMeasurementId =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
    process.env.GOOGLE_ANALYTICS_ID;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Suspense fallback={null}>
          <GoogleAnalytics measurementId={gaMeasurementId} />
        </Suspense>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-foreground focus:shadow-md"
        >
          Skip to main content
        </a>
        <ThemeProvider
          attribute="data-mode"
          defaultTheme="system"
          enableSystem
          storageKey="theme-v2"
        >
          <ThemeDomSync />
          <div className="ambient-background" aria-hidden="true" />
          <div className="page-shell">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
