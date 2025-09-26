import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Enable source maps for better debugging in production
    sourcemap: true,
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
  },
  // Performance optimizations
  esbuild: {
    // Remove unused imports
    treeShaking: true,
  },
});
