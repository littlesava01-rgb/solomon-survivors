/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// В конфиге нет @types/node, поэтому объявляем доступ к переменным окружения
declare const process: { env: Record<string, string | undefined> };

/**
 * Базовый путь приложения: "/" локально, "/<имя-репозитория>/" на GitHub Pages.
 */
const BASE_PATH = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base: BASE_PATH,
  build: {
    // Каталог сборки можно переопределить: деплой на Pages собирает
    // в отдельную папку, чтобы не портить локальный dist/ (в нём
    // BASE_PATH = "/", а для Pages нужен "/<имя-репозитория>/").
    outDir: process.env.OUT_DIR || 'dist',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  plugins: [
    VitePWA({
      base: BASE_PATH,
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ttf,woff,woff2,png,webp}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'Белка Соломон',
        short_name: 'Соломон',
        description:
          'Игра в жанре Vampire Survivors: Соломон отбивается от учебников, указок и мела.',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        display: 'standalone',
        orientation: 'landscape',
        lang: 'ru',
        background_color: '#1e293b',
        theme_color: '#f97316',
        icons: [
          {
            src: `${BASE_PATH}icons/icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${BASE_PATH}icons/icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${BASE_PATH}icons/icon-maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
