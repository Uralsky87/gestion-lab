import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/gestion-lab/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Gestión Lab',
        short_name: 'Gestión Lab',
        description: 'Control personal de producción',
        theme_color: '#3b6ef6',
        background_color: '#f6f7fb',
        display: 'standalone',
        start_url: '/gestion-lab/',
        scope: '/gestion-lab/',
        icons: [
          {
            src: '/gestion-lab/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
