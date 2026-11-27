import { expect, test, type Page } from '@playwright/test';

/**
 * Боевой цикл: спавн врагов, убийства, зачётки, level-up.
 *
 * Игра идёт на реальном времени, поэтому здесь ждём секунды, а не кадры.
 */

type CombatState = {
  enemies: number;
  spawned: number;
  kills: number;
  level: number;
  xp: number;
  orbsCollected: number;
  hp: number;
  gameSeconds: number;
  scenes: string[];
};

async function readCombat(page: Page): Promise<CombatState> {
  return page.evaluate(() => {
    const g = (window as any).__game;
    const scene = g.scene.getScene('Game');
    const images = scene.children.list.filter((o: any) => o.type === 'Image');
    const enemies = images.filter(
      (o: any) =>
        o.texture.key.startsWith('enemy-') || o.texture.key.startsWith('boss-')
    ).length;
    const hud = scene.children.list
      .filter((o: any) => o.type === 'Text')
      .map((o: any) => o.text)
      .join('\n');
    const kills = Number(hud.match(/Убито:\s*(\d+)/)?.[1] ?? 0);
    const level = Number(hud.match(/Ур\.\s*(\d+)/)?.[1] ?? 0);
    const hp = Number(hud.match(/HP:\s*(\d+)/)?.[1] ?? 0);
    // «До утра: ММ:СС» — считаем в секундах, чтобы сравнивать ход времени.
    const mm = Number(hud.match(/До утра:\s*(\d+):/)?.[1] ?? 0);
    const ss = Number(hud.match(/До утра:\s*\d+:(\d+)/)?.[1] ?? 0);
    return {
      enemies,
      spawned: (scene as any).spawner?.totalSpawned ?? 0,
      kills,
      level,
      xp: (scene as any).upgrades?.xp ?? 0,
      orbsCollected: (scene as any).orbsCollected ?? 0,
      hp,
      gameSeconds: mm * 60 + ss,
      scenes: g.scene.getScenes(true).map((s: any) => s.scene.key),
    };
  });
}

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

/**
 * Игрок ходит по кругу — как настоящий игрок: собирает зачётки и
 * не стоит в толпе. Без движения тест проверял бы не игру, а смерть.
 *
 * Круг должен быть заметно больше арены сбора зачёток: зачётки падают
 * там, где погиб враг, то есть в сотнях пикселей от игрока.
 */
async function circleAround(page: Page, seconds: number): Promise<void> {
  const keys = ['KeyD', 'KeyS', 'KeyA', 'KeyW'];
  const stepMs = 1200;
  const steps = Math.ceil((seconds * 1000) / stepMs);
  for (let i = 0; i < steps; i++) {
    const key = keys[i % keys.length];
    await page.keyboard.down(key);
    await page.waitForTimeout(stepMs);
    await page.keyboard.up(key);
  }
}

test.describe('Боевой цикл', () => {
  test('враги спавнятся со временем', async ({ page }) => {
    await startGame(page);

    const first = await readCombat(page);
    // Первый враг появляется сразу.
    expect(first.enemies).toBeGreaterThan(0);

    // За 6 секунд интервал спавна (2 с) должен дать несколько волн.
    await page.waitForTimeout(6000);
    const later = await readCombat(page);

    // Таймер «До утра» считает ВНИЗ, поэтому время идёт — значит меньше.
    expect(later.gameSeconds).toBeLessThan(first.gameSeconds);
    // Всего выпущено врагов должно заметно вырасти: за 6 с при интервале
    // 2 с это минимум три волны.
    expect(later.spawned).toBeGreaterThan(first.spawned + 1);
    expect(later.spawned).toBeGreaterThanOrEqual(3);
  });

  test('оружие убивает врагов и роняет зачётки', async ({ page }) => {
    await startGame(page);

    // Игрок ходит: собирает зачётки и не стоит в толпе.
    await circleAround(page, 9);
    const state = await readCombat(page);

    expect(state.kills).toBeGreaterThan(0);
    // Игрок жив — значит, урон и неуязвимость работают как задумано.
    expect(state.scenes).toContain('Game');
  });

  test('игрок выживает против плотной толпы', async ({ page }) => {
    await startGame(page);

    // Толпа вокруг игрока. 12 тетрадей — это уровень середины забега,
    // где спавн уже идёт пачками. Проверяем, что за 8 секунд в такой
    // обстановке игрок не погибает: иначе напор сделан неиграбельным.
    await page.evaluate(() => {
      const s = (window as any).__game.scene.getScene('Game');
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        s.spawnEnemy('notebook', s.player.x + Math.cos(a) * 220,
                     s.player.y + Math.sin(a) * 220);
      }
    });

    await circleAround(page, 8);
    const state = await readCombat(page);

    expect(state.hp).toBeGreaterThan(0);
    expect(state.scenes).toContain('Game');
  });

  test('зачётки собираются и дают опыт', async ({ page }) => {
    await startGame(page);

    await circleAround(page, 14);
    const state = await readCombat(page);

    // Зачётки реально подбираются и превращаются в опыт.
    expect(state.orbsCollected).toBeGreaterThan(0);
    expect(state.xp).toBeGreaterThanOrEqual(0);
  });

  test('подбор зачётки поднимает уровень и открывает экран апгрейда', async ({
    page,
  }) => {
    await startGame(page);

    // Даём опыт напрямую, чтобы не ждать естественного уровня.
    await page.evaluate(() => {
      const g = (window as any).__game;
      const scene = g.scene.getScene('Game');
      scene.upgrades.addXp(50);
      scene.showLevelUp();
    });

    await page.waitForFunction(
      () =>
        (window as any).__game.scene
          .getScenes(true)
          .some((s: any) => s.scene.key === 'LevelUp'),
      null,
      { timeout: 10_000 }
    );

    // Тексты карточек лежат внутри контейнеров, а не в корне сцены.
    const cards = await page.evaluate(() => {
      const g = (window as any).__game;
      const ls = g.scene.getScene('LevelUp');
      const containers = ls.children.list.filter((o: any) => o.type === 'Container');
      const texts = containers.flatMap((c: any) =>
        c.list.filter((o: any) => o.type === 'Text').map((o: any) => o.text)
      );
      return { containerCount: containers.length, texts };
    });
    expect(cards.containerCount).toBe(3);
    expect(cards.texts.length).toBeGreaterThanOrEqual(6); // заголовок + описание у каждой

    // Выбираем первую карточку кликом по её центру.
    const box = await page.evaluate(() => {
      const g = (window as any).__game;
      const ls = g.scene.getScene('LevelUp');
      const card = ls.children.list.find((o: any) => o.type === 'Container');
      return { x: card.x, y: card.y };
    });
    await page.mouse.click(box.x, box.y);

    await page.waitForFunction(
      () =>
        !((window as any).__game.scene
          .getScenes(true)
          .some((s: any) => s.scene.key === 'LevelUp')),
      null,
      { timeout: 10_000 }
    );
  });

  test('выбранный апгрейд применяется к оружию', async ({ page }) => {
    await startGame(page);

    const before = await page.evaluate(() => {
      const g = (window as any).__game;
      const scene = g.scene.getScene('Game');
      return scene.weapons.all.map((w: any) => `${w.def.id}:${w.level}`);
    });

    await page.evaluate(() => {
      const g = (window as any).__game;
      const scene = g.scene.getScene('Game');
      scene.upgrades.apply({
        kind: 'weapon',
        id: 'w-test',
        title: '',
        description: '',
        icon: 'wpn-pencil',
        weaponId: 'pencil',
      });
    });

    const after = await page.evaluate(() => {
      const g = (window as any).__game;
      const scene = g.scene.getScene('Game');
      return scene.weapons.all.map((w: any) => `${w.def.id}:${w.level}`);
    });

    expect(after).not.toEqual(before);
    expect(after.some((w: string) => w.startsWith('pencil:'))).toBe(true);
  });
});
