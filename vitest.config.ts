import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use the src directory for TypeScript source tests
    include: ['tests/**/*.test.ts'],

    // Global test timeout
    testTimeout: 10000,

    // Enable globals (describe, it, expect without imports)
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/validation/**/*.ts'],
      exclude: [
        'src/validation/types.ts', // Type-only file
        '**/*.d.ts',
      ],
    },

    // Reporter configuration
    reporters: ['verbose'],

    // Pool configuration for parallel tests
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },

  // Resolve TypeScript paths
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
