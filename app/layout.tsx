import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/lib/providers/query-provider";
import { MonitoringProvider } from "@/lib/providers/monitoring-provider";
import { SWRProvider } from "@/lib/providers/swr-config";
import { PreloadInitializer } from "@/components/preload-initializer";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

const defaultUrl = process.env.NETLIFY_URL
  ? `https://${process.env.NETLIFY_URL}`
  : process.env.NETLIFY_URL
    ? `https://${process.env.NETLIFY_URL}`
    : "http://localhost:3000";

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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-foreground focus:shadow-md"
        >
          Skip to main content
        </a>
        <MonitoringProvider>
          <QueryProvider>
            <SWRProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
              >
                <PreloadInitializer />
                <ServiceWorkerRegistration />
                {children}
              </ThemeProvider>
            </SWRProvider>
          </QueryProvider>
        </MonitoringProvider>
      </body>
    </html>
  );
}
