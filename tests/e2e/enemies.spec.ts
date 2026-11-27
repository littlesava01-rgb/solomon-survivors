import { expect, test, type Page } from '@playwright/test';

/**
 * Поведения врагов: стрельба, деление, лужи краски, боссы.
 *
 * Врагов ставим рядом с игроком вручную через scene.spawnEnemy(),
 * чтобы проверять конкретное поведение, а не ждать случайного спавна.
 */

async function startGame(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).__game), null, {
    timeout: 30_000,
  });
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
}

/** Ставит врага на расстоянии dist от игрока и отключает обычный спавн. */
async function placeEnemy(page: Page, id: string, dist = 300): Promise<void> {
  await page.evaluate(
    ([enemyId, distance]) => {
      const s = (window as any).__game.scene.getScene('Game');
      // Отключаем обычный спавн, чтобы враг был один и нужного типа.
      s.spawner.intervalFor = () => 1e9;
      s.spawnEnemy(enemyId, s.player.x + distance, s.player.y);
    },
    [id, dist]
  );
}

const readCounts = (page: Page) =>
  page.evaluate(() => {
    const s = (window as any).__game.scene.getScene('Game');
    return {
      enemies: s.enemies.length,
      enemyProjectiles: s.enemyProjectiles.length,
      enemyShotsFired: s.enemyShotsFired,
      zones: s.effects.zones.length,
      kills: s.kills,
      hp: Math.round(s.hp),
      maxHp: Math.round(s.stats.maxHp),
    };
  });

test.describe('Поведения врагов', () => {
  test('дневник стреляет страницами по игроку', async ({ page }) => {
    await startGame(page);
    await placeEnemy(page, 'diary', 280);

    // Ждём первый выстрел (кулдаун 2.2 с + случайная задержка).
    await page.waitForTimeout(4000);
    const state = await readCounts(page);

    expect(state.enemyShotsFired).toBeGreaterThan(0);
  });

  test('учебник стреляет веером страниц', async ({ page }) => {
    await startGame(page);
    await placeEnemy(page, 'textbook', 320);

    await page.waitForTimeout(4500);
    const state = await readCounts(page);

    // Веер — за один выстрел появляется несколько снарядов.
    expect(state.enemyShotsFired).toBeGreaterThanOrEqual(3);
  });

  test('снаряды врага наносят урон игроку', async ({ page }) => {
    await startGame(page);
    await placeEnemy(page, 'diary', 200);

    // Игрок стоит на месте — страница должна попасть.
    await page.waitForTimeout(6000);
    const state = await readCounts(page);

    // Сравниваем с текущим максимумом здоровья, а не с константой:
    // максимум менялся по ходу настройки баланса.
    expect(state.hp).toBeLessThan(state.maxHp);
  });

  test('ластик при смерти делится на два', async ({ page }) => {
    await startGame(page);
    await placeEnemy(page, 'eraser', 120);

    // Убиваем ластик напрямую.
    await page.evaluate(() => {
      const s = (window as any).__game.scene.getScene('Game');
      const eraser = s.enemies.find((e: any) => e.state.def.id === 'eraser');
      if (eraser) eraser.takeDamage(9999);
    });

    await page.waitForTimeout(600);
    const state = await readCounts(page);

    // Один ластик превратился в двух (плюс прочие враги, если успели спавниться).
    expect(state.enemies).toBeGreaterThanOrEqual(2);
  });

  test('краска оставляет лужу, которая замедляет', async ({ page }) => {
    await startGame(page);
    // Ставим чернила прямо под ноги игрока, чтобы лужа накрыла его.
    await placeEnemy(page, 'ink', 20);

    await page.evaluate(() => {
      const s = (window as any).__game.scene.getScene('Game');
      const ink = s.enemies.find((e: any) => e.state.def.id === 'ink');
      if (ink) ink.takeDamage(9999);
    });

    await page.waitForTimeout(600);
    const state = await readCounts(page);

    // Лужа появилась и не наносит урон, только тормозит.
    expect(state.zones).toBeGreaterThan(0);
    const slow = await page.evaluate(() => {
      const s = (window as any).__game.scene.getScene('Game');
      return s.effects.slowAt(s.player.x, s.player.y);
    });
    expect(slow).toBeLessThan(1);
  });

  test('линейка бьёт чертой по линии', async ({ page }) => {
    await startGame(page);
    await placeEnemy(page, 'ruler', 260);

    // Ставим тетрадь между линейкой и игроком — её должна задеть черта.
    await page.evaluate(() => {
      const s = (window as any).__game.scene.getScene('Game');
      s.spawnEnemy('notebook', s.player.x + 130, s.player.y);
    });

    await page.waitForTimeout(4500);

    // Проверяем счётчик попаданий, а не выживание цели: тетрадь
    // движется к игроку и за 4.5 с успевает уйти с линии. Попадания
    // считает сама механика черты, поэтому результат детерминирован.
    const result = await page.evaluate(() => {
      const s = (window as any).__game.scene.getScene('Game');
      return { shots: s.enemyShotsFired, beamHits: s.beamHits };
    });

    // Линейка выстрелила и задела кого-то чертой.
    expect(result.shots).toBeGreaterThan(0);
    expect(result.beamHits).toBeGreaterThan(0);
  });

  test('босс спавнится и большой', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      const s = (window as any).__game.scene.getScene('Game');
      s.spawnEnemy('textbook', s.player.x + 300, s.player.y);
    });

    const boss = await page.evaluate(() => {
      const s = (window as any).__game.scene.getScene('Game');
      // Ищем именно учебник — обычные враги тоже могут быть на экране.
      const e = s.enemies.find((x: any) => x.state.def.id === 'textbook');
      return e
        ? { id: e.state.def.id, hp: e.state.maxHp, radius: e.state.def.radius }
        : null;
    });

    // Учебник — тяжёлый танк: много HP и большой радиус.
    expect(boss).not.toBeNull();
    expect(boss!.hp).toBeGreaterThan(50);
    expect(boss!.radius).toBeGreaterThan(20);
  });
});
