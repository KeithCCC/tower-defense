import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    modulePreload: false,
    // A classic, self-contained script can also run in an isolated HTML preview.
    rolldownOptions: { output: { format: 'iife' } },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
