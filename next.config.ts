import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration (required for Next.js 16+)
  turbopack: {},

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },

  // Remove static export to enable API routes for Netlify Functions
  // output: 'export',

  // Server external packages (moved from experimental.serverComponentsExternalPackages)
  serverExternalPackages: ['@supabase/supabase-js'],

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

  // Optimize bundle
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            supabase: {
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              name: 'supabase',
              chunks: 'all',
            },
            tanstack: {
              test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
              name: 'tanstack',
              chunks: 'all',
            },
          },
        },
      };
    }

    return config;
  },

  // Headers for caching (commented out for development)
  // async headers() {
  //   return [
  //     {
  //       source: '/_next/static/:path*',
  //       headers: [
  //         {
  //           key: 'Cache-Control',
  //           value: 'public, max-age=31536000, immutable',
  //         },
  //       ],
  //     },
  //     {
  //       source: '/images/:path*',
  //       headers: [
  //         {
  //           key: 'Cache-Control',
  //           value: 'public, max-age=86400',
  //         },
  //       ],
  //     },
  //   ];
  // },
};

export default nextConfig;
