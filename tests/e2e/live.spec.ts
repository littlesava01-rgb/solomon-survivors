import { expect, test } from '@playwright/test';

/**
 * Smoke-тест опубликованной версии.
 *
 * Гоняет настоящий сайт на GitHub Pages, а не локальную сборку:
 * проверяем, что после деплоя всё работает у пользователя.
 */
const LIVE_URL = 'https://littlesava01-rgb.github.io/solomon-survivors/';

test.describe('Опубликованная версия', () => {
  test('сайт открывается и игра загружается', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean((window as any).__game), null, {
      timeout: 30_000,
    });
    await page.waitForFunction(
      () => (window as any).__game.scene.getScenes(true).length > 0,
      null,
      { timeout: 30_000 }
    );

    const active = await page.evaluate(() =>
      (window as any).__game.scene.getScenes(true).map((s: any) => s.scene.key)
    );
    expect(active).toContain('Menu');
    expect(errors).toEqual([]);
  });

  test('можно начать игру и пройти в игровую сцену', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean((window as any).__game), null, {
      timeout: 30_000,
    });
    // Ждём именно меню: пока грузятся 110 иконок и позы, кнопки ещё нет.
    await page.waitForFunction(
      () =>
        (window as any).__game.scene
          .getScenes(true)
          .some((s: any) => s.scene.key === 'Menu'),
      null,
      { timeout: 30_000 }
    );

    const size = page.viewportSize()!;
    await page.mouse.click(size.width / 2, size.height * 0.82);

    await page.waitForFunction(
      () =>
        (window as any).__game.scene
          .getScenes(true)
          .some((s: any) => s.scene.key === 'Game'),
      null,
      { timeout: 15_000 }
    );

    // Точка старта берём из самой игры, а не константой в тесте:
    // она менялась (центр мира попадал на стык биомов).
    const spawn = await page.evaluate(() => {
      const g = (window as any).__game;
      const scene = g.scene.getScene('Game');
      const p = scene.children.list.find(
        (o: any) => o.texture && o.texture.key === 'solomon-idle'
      );
      const hud = scene.children.list.find((o: any) => o.type === 'Text');
      return {
        x: p ? Math.round(p.x) : null,
        y: p ? Math.round(p.y) : null,
        hud: hud ? hud.text : '',
      };
    });

    // Игрок стартует в «уличной» зоне — не в центре мира и не на шве.
    expect(spawn.x).toBe(667);
    expect(spawn.y).toBe(1000);
    expect(spawn.hud).toContain('До утра');
  });

  test('манифест PWA отдаётся и регистрируется service worker', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded' });

    const manifestHref = await page.getAttribute('link[rel=manifest]', 'href');
    expect(manifestHref).toBeTruthy();

    const res = await page.request.get(new URL(manifestHref!, LIVE_URL).toString());
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/manifest+json');

    const manifest = await res.json();
    expect(manifest.name).toBe('Белка Соломон');
    expect(manifest.start_url).toContain('/solomon-survivors/');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });
});
