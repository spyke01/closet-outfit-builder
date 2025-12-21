import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable Turbopack with empty config to silence warning
  turbopack: {},

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
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
