import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'Awaken',
        short_name: 'Awaken',
        description: 'Gamified life-quest progression system',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#07090E',
        background_color: '#07090E',
        start_url: '/awaken/',
        scope: '/awaken/',
        icons: [
          { src: 'icon-192.png',          sizes: '192x192',  type: 'image/png' },
          { src: 'icon-512.png',          sizes: '512x512',  type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512',  type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,woff2}'],
        runtimeCaching: [
          {
            // Network-first for GitHub Gist API calls
            urlPattern: /^https:\/\/api\.github\.com\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'gist-api', networkTimeoutSeconds: 5 },
          },
          {
            // Cache-first for web fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  base: '/awaken/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts':  ['recharts'],
          'vendor-motion':  ['framer-motion'],
          'vendor-db':      ['dexie', 'zustand', 'zod', 'nanoid'],
          'vendor-sync':    ['@octokit/rest'],
          'vendor-auth':    ['@supabase/supabase-js'],
        },
      },
    },
  },
});
