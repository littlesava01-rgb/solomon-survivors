import { defineConfig, devices } from '@playwright/test';

/**
 * E2E-тесты играбельной части.
 *
 * Тесты гоняют production-сборку через `vite preview`, потому что в dev-режиме
 * Phaser грузится модулями и тайминги отличаются.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    // Порт 4175 — отдельный от dev-превью на 4173, чтобы тесты
    // не падали из-за запущенного сервера разработки.
    baseURL: 'http://127.0.0.1:4175',
    trace: 'off',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 640 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    // Локальная сборка с BASE_PATH="/" — отдельная папка dist-pages
    // используется только для публикации на GitHub Pages.
    //
    // Сначала освобождаем порт: сервер от прошлого прогона иначе
    // ломает старт, а vite ещё и блокирует второй preview этого
    // проекта (обходится флагом --bypass-lock).
    command:
      'python scripts/free_port.py 4175 && npm run build && ' +
      'npx vite preview --port 4175 --host 127.0.0.1 --bypass-lock',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
