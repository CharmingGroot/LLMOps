import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/*/tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.{ts,tsx}'],
    },
  },
  resolve: {
    alias: {
      '@llmops/core': new URL('./packages/core/src/index.ts', import.meta.url).pathname,
      '@llmops/state': new URL('./packages/state/src/index.ts', import.meta.url).pathname,
      '@llmops/orchestrator': new URL('./packages/orchestrator/src/index.ts', import.meta.url).pathname,
      '@llmops/cli': new URL('./packages/cli/src/index.ts', import.meta.url).pathname,
      '@llmops/dashboard-api': new URL('./packages/dashboard-api/src/index.ts', import.meta.url).pathname,
      '@llmops/dashboard-ui': new URL('./packages/dashboard-ui/src/index.ts', import.meta.url).pathname,
    },
  },
});
