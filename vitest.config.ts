import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/*/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@llmops/core': new URL('./packages/core/src/index.ts', import.meta.url).pathname,
      '@llmops/state': new URL('./packages/state/src/index.ts', import.meta.url).pathname,
      '@llmops/orchestrator': new URL('./packages/orchestrator/src/index.ts', import.meta.url).pathname,
      '@llmops/cli': new URL('./packages/cli/src/index.ts', import.meta.url).pathname,
    },
  },
});
