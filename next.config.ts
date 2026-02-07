import type { NextConfig } from "next";

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
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
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

  // Enable trailing slash for better compatibility
  trailingSlash: true,

  // Configure images for Netlify deployment
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Enable compression
  compress: true,
};

export default nextConfig;
