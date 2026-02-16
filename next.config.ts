import type { NextConfig } from "next";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

const baselineCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: *.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://api.openweathermap.org https://maps.googleapis.com https://*.supabase.co wss://*.supabase.co https://ahjwzpyammiqelloazvn.supabase.co",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Enable Turbopack with empty config to silence warning
  turbopack: {},

  // Performance optimizations
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@tanstack/react-query',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-switch',
      '@radix-ui/react-dialog',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@radix-ui/react-progress',
    ],
  },

  // Bundle analysis configuration
  webpack: (config, { isServer, dev }) => {
    if (process.env.ANALYZE === 'true' && !isServer && !dev) {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: '../bundle-analysis.html',
          generateStatsFile: true,
          statsFilename: '../bundle-stats.json',
          logLevel: 'info',
        })
      );
    }
    return config;
  },

  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Enable source maps for debugging in production
  productionBrowserSourceMaps: process.env.DEBUG_BUILD === 'true',

  // Enable trailing slash for better compatibility
  trailingSlash: true,

  // Configure images for Netlify deployment
  images: {
    // Disable Next.js image optimization for Netlify
    // Netlify doesn't support Next.js Image Optimization API in production
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Define device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Define image sizes for different layouts
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 80, 85],
  },

  // Enable compression
  compress: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=()' },
          { key: 'Content-Security-Policy', value: baselineCsp },
        ],
      },
    ];
  },
};

export default nextConfig;
