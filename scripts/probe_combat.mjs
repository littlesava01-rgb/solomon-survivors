import { chromium } from '@playwright/test';

/**
 * Диагностика боя: сколько врагов, сколько убийств, сколько попаданий
 * за фиксированное время. Запуск: node scripts/probe_combat.mjs
 */

const URL = process.env.URL ?? 'http://127.0.0.1:4173/';

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

const read = () =>
  page.evaluate(() => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    const imgs = s.children.list.filter((o) => o.type === 'Image');
    const player = s.children.list.find((o) => o.texture?.key === 'solomon-idle');
    const enemies = imgs
      .filter((o) => o.texture?.key?.startsWith('enemy-'))
      .map((o) => ({
        k: o.texture.key,
        d: Math.round(Math.hypot(o.x - player.x, o.y - player.y)),
      }));
    const proj = imgs.filter((o) => o.texture?.key?.startsWith('wpn-'));
    const orbs = imgs.filter((o) => o.texture?.key === 'xp-orb');
    const hud = s.children.list.filter((o) => o.type === 'Text').map((o) => o.text).join(' | ');
    return {
      spawned: s.spawner.totalSpawned,
      alive: enemies.length,
      nearest: enemies.length ? Math.min(...enemies.map((e) => e.d)) : null,
      farthest: enemies.length ? Math.max(...enemies.map((e) => e.d)) : null,
      projectiles: proj.length,
      orbs: orbs.length,
      hp: s.hp,
      hud,
    };
  });

for (let i = 0; i <= 6; i++) {
  console.log(`t=${i * 3}s`, JSON.stringify(await read()));
  await page.waitForTimeout(3000);
}

await browser.close();
