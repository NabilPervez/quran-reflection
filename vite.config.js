import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Quran Reflect",
        short_name: "Quran Reflect",
        description: "A privacy-first Tadabbur journal — select verses, read Arabic & Clear Quran translation, and save your reflections locally.",
        theme_color: "#1A4D2E",
        background_color: "#FAF9F6",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "gstatic-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            // Quran.com by-page API — cache read pages aggressively
            urlPattern: /^https:\/\/api\.quran\.com\/api\/v4\/verses\/by_page\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "quran-pages-cache",
              expiration: { maxEntries: 620, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // AlQuran.cloud surah API (used by Reflect tab)
            urlPattern: /^https:\/\/api\.alquran\.cloud\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "alquran-cloud-cache",
              expiration: { maxEntries: 240, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
