import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        advertising: resolve(__dirname, 'advertising.html'),
        strategy: resolve(__dirname, 'strategy.html'),
        'content-marketing': resolve(__dirname, 'content-marketing.html'),
        outreach: resolve(__dirname, 'outreach.html'),
        creative: resolve(__dirname, 'creative.html'),
        'thought-leadership': resolve(__dirname, 'thought-leadership.html'),
        industries: resolve(__dirname, 'industries.html'),
        contact: resolve(__dirname, 'contact.html'),
      },
    },
  },
});
