/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000 // 5MB limit
      },
      manifest: {
        name: 'Dijital Stok',
        short_name: 'D-Stok',
        description: 'Offline-First Satış ve Envanter Yönetimi',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone'
      }
    })
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    exclude: ['node_modules', 'e2e/**/*']
  }
});
