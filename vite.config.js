import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

// A camera do celular so liga em https (ou localhost). `npm run dev:https`
// liga um certificado autoassinado para poder testar pelo IP da rede.
const comHttps = process.env.HTTPS === '1';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    ...(comHttps ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icone-192.png', 'icone-512.png', 'icone-maskable-512.png'],
      manifest: {
        name: 'NutriTracker',
        short_name: 'Nutri',
        description: 'Conte. Equilibre. Transforme. Contador de calorias e macros com base TACO.',
        lang: 'pt-BR',
        theme_color: '#ebf5e9',
        background_color: '#ebf5e9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icone-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // a base TACO tem ~150 KB, cabe tranquilo no precache
        globPatterns: ['**/*.{js,css,html,png,svg,json,woff2}'],
        // a base de alimentos passa de 4 MB; sem levantar este teto o
        // workbox a deixa DE FORA do precache e o app perde a busca offline,
        // que e a razao de ele existir
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        runtimeCaching: [
          {
            // consultas de codigo de barras: usa cache quando ja consultou antes
            urlPattern: /^https:\/\/world\.openfoodfacts\.org\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'openfoodfacts',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5180 },
});
