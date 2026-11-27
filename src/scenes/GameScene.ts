/**
 * Игровая сцена — прототип.
 *
 * Сейчас здесь только проверка основ: арена, движение Соломона (клавиатура +
 * экранный джойстик на мобильных), следование камеры и HUD с таймером.
 * Боевая система (враги, оружие, апгрейды) — этапы 2–3 плана,
 * см. docs/ПЛАН-ИГРЫ.md.
 */
import Phaser from 'phaser';
import { CAMERA, PALETTE, PLAYER, RUN, WORLD, isMobile } from '../config/gameConfig';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  /** Виртуальный джойстик (мобильные): центр и текущая позиция. */
  private stickCenter = { x: 0, y: 0 };
  private stickActive = false;
  private stickKnob?: Phaser.GameObjects.Image;
  private stickBase?: Phaser.GameObjects.Image;

  private hudText!: Phaser.GameObjects.Text;
  private elapsedMs = 0;

  constructor() {
    super('Game');
  }

  create(): void {
    const mobile = isMobile();

    this.cameras.main.setBackgroundColor(PALETTE.cold);
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);

    // Сетка-подложка арены: на этапе 4 заменится на тайлы биомов.
    const grid = this.add.graphics();
    grid.fillStyle(0x152238, 1);
    grid.fillRect(0, 0, WORLD.width, WORLD.height);
    grid.lineStyle(1, 0x1e3a5f, 0.6);
    for (let x = 0; x <= WORLD.width; x += WORLD.tileSize) {
      grid.lineBetween(x, 0, x, WORLD.height);
    }
    for (let y = 0; y <= WORLD.height; y += WORLD.tileSize) {
      grid.lineBetween(0, y, WORLD.width, y);
    }

    this.player = this.add
      .image(WORLD.width / 2, WORLD.height / 2, 'solomon-idle')
      .setScale(PLAYER.spriteScale);
    this.physics.add.existing(this.player);
    this.player.setDepth(10);

    this.cameras.main.startFollow(this.player, true, CAMERA.lerp, CAMERA.lerp);
    this.cameras.main.setZoom(mobile ? CAMERA.zoomMobile : CAMERA.zoomDesktop);

    // --- Ввод: клавиатура ---
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    // --- Ввод: экранный джойстик для телефона ---
    if (mobile) this.setupJoystick();

    // --- HUD ---
    this.hudText = this.add
      .text(12, 12, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: PALETTE.cream,
        backgroundColor: '#00000066',
        padding: { x: 8, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('Menu'));
  }

  private setupJoystick(): void {
    const { width, height } = this.scale;
    const radius = 70;

    this.stickCenter = { x: 110, y: height - 110 };
    this.stickBase = this.add
      .image(this.stickCenter.x, this.stickCenter.y, 'ui-target')
      .setAlpha(0.25)
      .setDisplaySize(radius * 2, radius * 2)
      .setScrollFactor(0)
      .setDepth(99);
    this.stickKnob = this.add
      .image(this.stickCenter.x, this.stickCenter.y, 'solomon')
      .setAlpha(0.55)
      .setDisplaySize(44, 44)
      .setScrollFactor(0)
      .setDepth(100);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Джойстик активируется в нижней левой четверти экрана.
      if (pointer.x > width * 0.5 || pointer.y < height * 0.45) return;
      this.stickActive = true;
      this.stickCenter = { x: pointer.x, y: pointer.y };
      this.stickBase!.setPosition(pointer.x, pointer.y);
      this.stickKnob!.setPosition(pointer.x, pointer.y);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.stickActive) return;
      const dx = pointer.x - this.stickCenter.x;
      const dy = pointer.y - this.stickCenter.y;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, radius);
      const nx = dist > 0 ? dx / dist : 0;
      const ny = dist > 0 ? dy / dist : 0;
      this.stickKnob!.setPosition(
        this.stickCenter.x + nx * clamped,
        this.stickCenter.y + ny * clamped
      );
    });

    this.input.on('pointerup', () => {
      this.stickActive = false;
      this.stickKnob!.setPosition(this.stickCenter.x, this.stickCenter.y);
    });
  }

  override update(_time: number, delta: number): void {
    this.elapsedMs += delta;

    // Вектор движения: клавиатура или джойстик.
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) vy += 1;

    if (this.stickActive && this.stickKnob) {
      const dx = this.stickKnob.x - this.stickCenter.x;
      const dy = this.stickKnob.y - this.stickCenter.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 4) {
        const norm = Math.min(dist, 70) / 70;
        vx = (dx / dist) * norm;
        vy = (dy / dist) * norm;
      }
    }

    const len = Math.hypot(vx, vy);
    if (len > 0) {
      vx /= len;
      vy /= len;
      this.player.x += vx * PLAYER.speed * (delta / 1000);
      this.player.y += vy * PLAYER.speed * (delta / 1000);
      // Лёгкое «покачивание» вместо полноценной анимации шага.
      this.player.setScale(
        PLAYER.spriteScale * (1 + Math.sin(this.elapsedMs / 120) * 0.02),
        PLAYER.spriteScale * (1 - Math.sin(this.elapsedMs / 120) * 0.02)
      );
    } else {
      this.player.setScale(PLAYER.spriteScale);
    }

    const total = RUN.durationMinutes * 60 * 1000;
    const left = Math.max(0, total - this.elapsedMs);
    const mm = Math.floor(left / 60000);
    const ss = Math.floor((left % 60000) / 1000);
    this.hudText.setText(
      `До утра: ${mm}:${ss.toString().padStart(2, '0')}\n` +
        `Позиция: ${Math.round(this.player.x)}, ${Math.round(this.player.y)}\n` +
        `ESC — выход в меню`
    );
  }
}
