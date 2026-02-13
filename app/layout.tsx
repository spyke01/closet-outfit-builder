import type { Metadata, Viewport } from "next";
import { Geist, Playfair_Display, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/lib/providers/query-provider";
import { MonitoringProvider } from "@/lib/providers/monitoring-provider";
import { SWRProvider } from "@/lib/providers/swr-config";
import { PreloadInitializer } from "@/components/preload-initializer";
import "./globals.css";

const defaultUrl = process.env.NETLIFY_URL
  ? `https://${process.env.NETLIFY_URL}`
  : process.env.NETLIFY_URL
    ? `https://${process.env.NETLIFY_URL}`
    : "http://localhost:3000";

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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fefefe" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" },
  ],
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  display: "swap",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfairDisplay.variable} ${geistSans.variable} font-sans antialiased`}>
        <MonitoringProvider>
          <QueryProvider>
            <SWRProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
              >
                <PreloadInitializer />
                {children}
              </ThemeProvider>
            </SWRProvider>
          </QueryProvider>
        </MonitoringProvider>
      </body>
    </html>
  );
}
