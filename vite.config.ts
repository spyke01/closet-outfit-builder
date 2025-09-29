import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable React 19 features and optimizations
      jsxRuntime: 'automatic',
      // Enable fast refresh for better development experience
      fastRefresh: true,
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
    // Include React 19 in pre-bundling for better performance
    include: ['react', 'react-dom'],
  },
  build: {
    // Enable source maps for better debugging in production
    sourcemap: true,
    // Set target to modern browsers for React 19 features
    target: 'esnext',
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react'],
        },
      },
    },
    // Set reasonable chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable minification with esbuild (default, faster than terser)
    minify: 'esbuild',
    // Optimize CSS code splitting
    cssCodeSplit: true,
  },
  // Optimize dev server
  server: {
    // Enable HMR for better development experience
    hmr: true,
    // Optimize dependency pre-bundling
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
    // Improve development server performance
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx'],
    },
  },
  // Performance optimizations
  esbuild: {
    // Remove unused imports
    treeShaking: true,
    // Target modern browsers for React 19
    target: 'esnext',
  },
  // CSS processing optimizations for Tailwind 4
  css: {
    devSourcemap: true,
    postcss: './postcss.config.js',
  },
});
