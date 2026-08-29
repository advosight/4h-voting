import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['lambda/__tests__/**/*.test.ts'],
    exclude: ['node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lambda/**/*.ts'],
      exclude: [
        'lambda/**/*.d.ts',
        'lambda/**/__tests__/**'
      ]
    }
  }
});
