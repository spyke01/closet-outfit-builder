import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react({
    jsxRuntime: 'automatic'
  })],
  test: {
    environment: 'jsdom',
    setupFiles: ['./lib/test/setup.ts'],
    globals: true,
    testTimeout: 10000, // 10 seconds
    // Use worker threads instead of child-process forks to avoid IPC channel crashes
    // on large suites with heavy React/JSDOM tests.
    pool: 'threads',
    maxWorkers: '50%',
    minWorkers: 1,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
});
