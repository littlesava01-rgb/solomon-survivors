import { expect, test, type Page } from '@playwright/test';

/**
 * Помощники для e2e-тестов: получаем состояние игры из окна страницы.
 * Экземпляр Phaser доступен как window.__game (см. src/main.ts).
 */

type SceneState = {
  active: string[];
  player?: { x: number; y: number };
  joystickVisible?: boolean;
};

declare global {
  interface Window {
    __game: any;
  }
}

/** Ждём, пока Phaser смонтируется и покажет первую сцену. */
async function waitForGame(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__game), null, { timeout: 30_000 });
  await page.waitForFunction(
    () => window.__game.scene.getScenes(true).length > 0,
    null,
    { timeout: 30_000 }
  );
}

/** Текущее состояние сцен и позиция Соломона. */
async function readState(page: Page): Promise<SceneState> {
  return page.evaluate(() => {
    const g = window.__game;
    const active = g.scene.getScenes(true).map((s: any) => s.scene.key);
    let player: { x: number; y: number } | undefined;
    let joystickVisible = false;

    for (const key of active) {
      const scene = g.scene.getScene(key);
      const solomon = scene?.children?.list?.find(
        (o: any) => o.texture && o.texture.key === 'solomon-idle'
      );
      if (solomon) {
        player = { x: Math.round(solomon.x), y: Math.round(solomon.y) };
      }
      // Джойстик — это картинка ui-target с пониженной прозрачностью.
      const stick = scene?.children?.list?.find(
        (o: any) => o.texture && o.texture.key === 'ui-target'
      );
      if (stick && stick.alpha > 0 && stick.alpha < 1) joystickVisible = true;
    }

    return { active, player, joystickVisible };
  });
}

/** Клик по кнопке Play в меню (координаты — из layout-сцены). */
async function clickPlay(page: Page): Promise<void> {
  const size = page.viewportSize()!;
  await page.mouse.click(size.width / 2, size.height * 0.82);
  await page.waitForFunction(
    () => window.__game.scene.getScenes(true).some((s: any) => s.scene.key === 'Game'),
    null,
    { timeout: 15_000 }
  );
}

test.describe('Меню', () => {
  test('игра загружается и показывает меню', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');
    await waitForGame(page);

    const state = await readState(page);
    expect(state.active).toContain('Menu');
    expect(errors).toEqual([]);

    // Canvas отрисован
    const canvas = await page.locator('#game canvas').count();
    expect(canvas).toBe(1);
  });

  test('кнопка Play переводит в игровую сцену', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
    await clickPlay(page);

    const state = await readState(page);
    expect(state.active).toContain('Game');
  });
});

test.describe('Игровая сцена', () => {
  test('Соломон движется с клавиатуры', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
    await clickPlay(page);

    const before = (await readState(page)).player!;
    expect(before).toBeDefined();

    await page.keyboard.down('d');
    await page.waitForTimeout(1200);
    await page.keyboard.up('d');
    await page.waitForTimeout(200);

    const after = (await readState(page)).player!;
    expect(after.x).toBeGreaterThan(before.x + 50);
    expect(after.y).toBe(before.y);
  });

  test('HUD показывает таймер и координаты', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
    await clickPlay(page);

    // HUD — это текст в Phaser, а не DOM. Проверяем через сцену.
    const hud = await page.evaluate(() => {
      const g = window.__game;
      const scene = g.scene.getScene('Game');
      const text = scene?.children?.list?.find((o: any) => o.type === 'Text');
      return text ? text.text : '';
    });

    expect(hud).toContain('До утра');
    expect(hud).toContain('Позиция');
  });
});

test.describe('Мобильный режим', () => {
  test.skip(({ isMobile }) => !isMobile, 'только для мобильного проекта');

  test('джойстик появляется и двигает Соломона', async ({ page }) => {
    await page.goto('/?mobile=1');
    await waitForGame(page);
    await clickPlay(page);

    const state = await readState(page);
    expect(state.joystickVisible).toBe(true);

    const before = state.player!;

    // Настоящие тач-события через CDP — так же, как их шлёт телефон.
    const client = await page.context().newCDPSession(page);
    const size = page.viewportSize()!;
    const ox = Math.round(size.width * 0.18);
    const oy = Math.round(size.height * 0.78);
    const ex = ox + 50;
    const ey = oy - 40;

    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      client.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
      });

    await touch('touchStart', ox, oy);
    await touch('touchMove', ex, ey);
    await page.waitForTimeout(1200);
    await touch('touchEnd', ex, ey);
    await page.waitForTimeout(200);

    const after = (await readState(page)).player!;
    expect(after.x).toBeGreaterThan(before.x + 30);
  });
});
