/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

import { fileURLToPath } from 'node:url';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000, // 5MB limit
        globPatterns: [
          'index.html',
          'assets/index-*.js',
          'assets/index-*.css',
          'assets/SalesView-*.js',
          'favicon.svg',
          'icons.svg'
        ],
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === 'script' ||
              request.destination === 'style' ||
              request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'runtime-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Dijital Stok',
        short_name: 'D-Stok',
        description:
          "KOBİ'ler için çevrimdışı öncelikli, hızlı ve pratik bulut tabanlı barkodlu POS ve stok yönetim sistemi.",
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'minimal-ui'],
        run_on_os_login: 'windowed',
        prefer_related_applications: true,
        related_applications: [
          {
            platform: 'play',
            url: 'https://play.google.com/store/apps/details?id=com.dijitalstok.app',
            id: 'com.dijitalstok.app'
          }
        ],
        shortcuts: [
          {
            name: 'Yeni Satış (Hızlı Kasa)',
            short_name: 'Kasa',
            description: 'Doğrudan POS satış ekranını aç',
            url: '/sales',
            icons: [
              { src: 'icon-192.png', sizes: '192x192', type: 'image/png' }
            ]
          },
          {
            name: 'Yeni Ürün Ekle',
            short_name: 'Ürün Ekle',
            description: 'Envantere hızlı yeni ürün ekle',
            url: '/inventory/new',
            icons: [
              { src: 'icon-192.png', sizes: '192x192', type: 'image/png' }
            ]
          }
        ],
        screenshots: [
          {
            src: 'screenshot-mobile.jpg',
            sizes: '1080x1920',
            type: 'image/jpeg',
            form_factor: 'narrow',
            label: 'Hızlı Satış ve Barkodlu Kasa Arayüzü'
          },
          {
            src: 'screenshot-desktop.jpg',
            sizes: '1920x1080',
            type: 'image/jpeg',
            form_factor: 'wide',
            label: 'Gelişmiş Dashboard Raporları'
          }
        ],
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ]
      } as any
    }),
    ...(mode === 'analyze'
      ? [
          visualizer({
            filename: 'dist/stats.html',
            gzipSize: true,
            brotliSize: true
          })
        ]
      : [])
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
}));
