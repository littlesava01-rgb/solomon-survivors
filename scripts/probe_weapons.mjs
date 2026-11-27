import { chromium } from '@playwright/test';

/**
 * Проверка оружия: орбита ластика и зона-клякса.
 * Запуск: node scripts/probe_weapons.mjs
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

// Выдаём всё оружие и смотрим, что появляется на арене.
const result = await page.evaluate(async () => {
  const g = window.__game;
  const s = g.scene.getScene('Game');
  for (const id of ['eraser', 'notebook', 'ink', 'ruler', 'pointer', 'formula']) {
    s.upgrades.apply({
      kind: 'weapon', id, title: '', description: '',
      icon: 'wpn-pencil', weaponId: id,
    });
  }
  await new Promise((r) => setTimeout(r, 1500));

  const imgs = s.children.list.filter((o) => o.type === 'Image');
  const byTex = {};
  for (const o of imgs) byTex[o.texture.key] = (byTex[o.texture.key] ?? 0) + 1;
  return {
    effects: {
      orbits: s.effects.orbits.length,
      zones: s.effects.zones.length,
    },
    textures: byTex,
    weapons: s.weapons.all.map((w) => `${w.def.id}:${w.level}`),
  };
});
console.log('WEAPONS:', JSON.stringify(result, null, 2));

await browser.close();
