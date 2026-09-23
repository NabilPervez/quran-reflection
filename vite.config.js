import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "favicon.ico", "apple-touch-icon-180x180.png"],
      manifest: {
        id: "/",
        name: "Quran Reflections",
        short_name: "Reflections",
        description:
          "Read the Quran ayah by ayah with Arabic, transliteration, translation, tafsir and recitation, and keep a private reflection journal that never leaves your device.",
        lang: "en",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        // Any orientation: the reader has dedicated phone and tablet landscape
        // layouts, and a TWA locks to whatever this says.
        orientation: "any",
        // Match the light reading surface so the Android splash screen and
        // status bar blend into the first frame instead of flashing green.
        theme_color: "#FAFAF8",
        background_color: "#FAFAF8",
        categories: ["books", "education", "lifestyle"],
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Every navigation gets the app shell, so /privacy and /data resolve in
        // React and the journal still opens offline (it reads IndexedDB).
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/\.well-known\//],
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
