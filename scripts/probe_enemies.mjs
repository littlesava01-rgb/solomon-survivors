import { chromium } from '@playwright/test';

/**
 * Проверка поведений врагов: стрельба, деление, лужи краски.
 * Запуск: node scripts/probe_enemies.mjs
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

// Ставим рядом с игроком по одному врагу каждого «умного» типа.
const setup = await page.evaluate(() => {
  const g = window.__game;
  const s = g.scene.getScene('Game');
  s.enemies.length = 0;
  s.spawner.reset();
  s.spawner.intervalFor = () => 1e9; // новых врагов не спавнить

  const defs = [
    ['ruler', 260],
    ['diary', 300],
    ['textbook', 340],
    ['eraser', 200],
    ['ink', 240],
  ];
  const made = [];
  for (const [id, dist] of defs) {
    const def = s.__enemyDefs?.find((d) => d.id === id);
    made.push(id);
  }
  return { made, hasDefs: !!s.__enemyDefs };
});
console.log('SETUP:', JSON.stringify(setup));

// Спавним врагов через штатный механизм: временно сдвинем таймер.
const spawned = await page.evaluate(() => {
  const g = window.__game;
  const s = g.scene.getScene('Game');
  const out = [];
  for (const [id, dist] of [['ruler', 260], ['diary', 300], ['textbook', 340], ['ink', 240]]) {
    // Форсируем спавн: сдвигаем игрока рядом с точкой спавна.
    const before = s.enemies.length;
    s.spawner.timer = 0;
    s.spawner.next(s.elapsedMs, s.player.x, s.player.y, 0, 1000);
    out.push(before);
  }
  return { enemies: s.enemies.length, kinds: s.enemies.map((e) => e.state.def.id) };
});
console.log('SPAWNED:', JSON.stringify(spawned));

// Ждём и смотрим, появились ли снаряды врага и лужи.
for (const t of [3, 6, 9]) {
  await page.waitForTimeout(3000);
  const st = await page.evaluate(() => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    return {
      enemies: s.enemies.length,
      enemyProjectiles: s.enemyProjectiles.length,
      zones: s.effects.zones.length,
      hp: Math.round(s.hp),
      kills: s.kills,
    };
  });
  console.log(`t=${t}s`, JSON.stringify(st));
}

await browser.close();
