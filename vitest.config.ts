import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // La capa que se testea es lógica pura (física, balance, i18n): no necesita DOM.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
