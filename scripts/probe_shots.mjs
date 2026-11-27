import { chromium } from '@playwright/test';

/**
 * Диагностика стрельбы врагов: сколько выстрелов сделано, что с таймером.
 * Запуск: node scripts/probe_shots.mjs
 */

const URL = process.env.URL ?? 'http://127.0.0.1:4176/';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 640 } });
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));

await page.goto(URL);
await page.waitForFunction(() => Boolean(window.__game), null, { timeout: 30000 });
await page.waitForFunction(
  () => window.__game.scene.getScenes(true).some((s) => s.scene.key === 'Menu'),
  null,
  { timeout: 30000 }
);
const size = page.viewportSize();
await page.mouse.click(size.width / 2, size.height * 0.82);
await page.waitForFunction(
  () => window.__game.scene.getScenes(true).some((s) => s.scene.key === 'Game'),
  null,
  { timeout: 15000 }
);

for (const id of ['diary', 'ruler', 'textbook']) {
  await page.evaluate((enemyId) => {
    const s = window.__game.scene.getScene('Game');
    s.enemies.length = 0;
    s.spawner.intervalFor = () => 1e9;
    s.enemyShotsFired = 0;
    s.spawnEnemy(enemyId, s.player.x + 280, s.player.y);
  }, id);

  for (let t = 0; t < 4; t++) {
    await page.waitForTimeout(1000);
    const st = await page.evaluate(() => {
      const s = window.__game.scene.getScene('Game');
      const e = s.enemies[0];
      return {
        shots: s.enemyShotsFired,
        proj: s.enemyProjectiles.length,
        alive: s.enemies.length,
        kind: e ? e.state.def.kind : null,
        shootTimer: e ? Math.round(e.state.shootTimer) : null,
        dist: e ? Math.round(Math.hypot(e.x - s.player.x, e.y - s.player.y)) : null,
      };
    });
    console.log(`${id} t=${t + 1}s`, JSON.stringify(st));
  }
}

await browser.close();
