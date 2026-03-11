import legacy from '@vitejs/plugin-legacy';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'ios >= 12', 'safari >= 12'],
      renderLegacyChunks: true,
    }),
  ],
  base: './',
  build: {
    cssTarget: 'safari13',
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three-vendor';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
