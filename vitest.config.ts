import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/__tests__/**',
        'src/app/**/*.tsx', // Exclude Next.js pages for now
        'next.config.mjs',
        'tailwind.config.ts',
        'postcss.config.mjs',
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/lib/utils/': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        'src/lib/services/': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'src/hooks/': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})