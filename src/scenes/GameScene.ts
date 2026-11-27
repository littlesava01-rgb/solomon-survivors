/**
 * Игровая сцена — боевая система.
 *
 * Ядро геймплея в духе Vampire Survivors:
 *   движение -> оружие бьёт само -> враги падают -> собираешь зачётки ->
 *   растёшь в уровне -> выбираешь карточку -> снова.
 *
 * Оптимизации: пул снарядов, пространственная сетка для коллизий.
 */
import Phaser from 'phaser';
import { CAMERA, PALETTE, PLAYER, RUN, WORLD, isMobile } from '../config/gameConfig';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { XPOrb } from '../entities/XPOrb';
import { SpawnManager } from '../managers/SpawnManager';
import { WeaponManager } from '../managers/WeaponManager';
import { SpatialGrid } from '../systems/SpatialGrid';
import { PersistentEffects } from '../systems/PersistentEffects';
import { UpgradeSystem, type UpgradeOption } from '../systems/UpgradeSystem';

/** Характеристики игрока во время забега. */
interface PlayerRuntimeStats {
  maxHp: number;
  speedMultiplier: number;
  pickupMultiplier: number;
  magnetMultiplier: number;
  armor: number;
  regenPerSecond: number;
}

export class GameScene extends Phaser.Scene {
  /** Характеристики игрока с учётом пассивок. */
  private stats: PlayerRuntimeStats = {
    maxHp: PLAYER.maxHp,
    speedMultiplier: 1,
    pickupMultiplier: 1,
    magnetMultiplier: 1,
    armor: 0,
    regenPerSecond: 0,
  };

  private player!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  private readonly enemies: Enemy[] = [];
  private readonly projectiles: Projectile[] = [];
  private readonly orbs: XPOrb[] = [];
  private readonly grid = new SpatialGrid<Enemy>(160);

  private readonly weapons = new WeaponManager();
  /** Менеджер спавна — доступен снаружи для тестов и отладки. */
  readonly spawner = new SpawnManager();
  /** Постоянные эффекты: орбита ластиков, кляксы и лужи краски. */
  private effects!: PersistentEffects;
  private upgrades!: UpgradeSystem;

  private elapsedMs = 0;
  private kills = 0;
  private hp: number = PLAYER.maxHp;
  private damageMultiplier = 1;

  /**
   * Неуязвимость после удара (мс). Без неё касание врага наносит урон
   * каждый кадр: игрок умирает за два кадра от одного тетради.
   */
  private invulnerableUntil = 0;
  /** Таймер мигания при получении урона. */
  private hurtFlash = 0;
  /** Накопленный дробный регенерационный урон. */
  private regenAccumulator = 0;

  // Джойстик (мобильные).
  private stickCenter = { x: 0, y: 0 };
  private stickActive = false;
  private stickKnob?: Phaser.GameObjects.Image;
  private stickBase?: Phaser.GameObjects.Image;

  // HUD.
  private hudText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Rectangle;
  private hpBar!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Game');
  }

  create(): void {
    const mobile = isMobile();

    this.cameras.main.setBackgroundColor(PALETTE.cold);
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);

    this.upgrades = new UpgradeSystem(this.weapons);
    this.effects = new PersistentEffects(this);
    this.weapons.effects = this.effects;
    this.upgrades.apply({
      kind: 'weapon',
      id: 'pencil',
      title: '',
      description: '',
      icon: 'wpn-pencil',
      weaponId: 'pencil',
    });
    this.elapsedMs = 0;
    this.kills = 0;
    this.hp = PLAYER.maxHp;
    this.damageMultiplier = 1;
    this.stats = {
      maxHp: PLAYER.maxHp,
      speedMultiplier: 1,
      pickupMultiplier: 1,
      magnetMultiplier: 1,
      armor: 0,
      regenPerSecond: 0,
    };

    this.drawArena();

    this.player = this.add
      .image(WORLD.width / 2, WORLD.height / 2, 'solomon-idle')
      .setScale(PLAYER.spriteScale)
      .setDepth(10);
    this.physics.add.existing(this.player);

    this.cameras.main.startFollow(this.player, true, CAMERA.lerp, CAMERA.lerp);
    this.cameras.main.setZoom(mobile ? CAMERA.zoomMobile : CAMERA.zoomDesktop);

    // Ввод.
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    if (mobile) this.setupJoystick();

    this.buildHud();

    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('Menu'));
  }

  /** Заливка арены с сеткой (на этапе 4 заменится на тайлы биомов). */
  private drawArena(): void {
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
  }

  private buildHud(): void {
    const { width } = this.scale;

    this.add
      .rectangle(width / 2, 10, width - 24, 14, 0x0f172a, 0.85)
      .setScrollFactor(0)
      .setDepth(100);
    this.xpBar = this.add
      .rectangle(width / 2 - (width - 24) / 2, 10, 0, 14, 0x38bdf8, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(101);

    this.add
      .rectangle(width / 2, 30, 220, 10, 0x0f172a, 0.85)
      .setScrollFactor(0)
      .setDepth(100);
    this.hpBar = this.add
      .rectangle(width / 2 - 110, 30, 220, 10, 0xf97316, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(101);

    this.hudText = this.add
      .text(12, 46, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: PALETTE.cream,
        backgroundColor: '#00000066',
        padding: { x: 8, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(100);
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
    const dt = Math.min(delta, 50);
    this.elapsedMs += dt;

    this.updatePlayerMovement(dt);
    this.updateSpawning(dt);
    this.updateEnemies(dt);
    this.updateWeapons(dt);
    this.updateProjectiles(dt);
    this.updateOrbs(dt);
    this.updateRegen(dt);
    this.updateHud();
  }

  /** Регенерация из пассивки «Регенерация». */
  private updateRegen(dt: number): void {
    if (this.stats.regenPerSecond <= 0) return;
    this.regenAccumulator += (this.stats.regenPerSecond * dt) / 1000;
    if (this.regenAccumulator >= 1) {
      const whole = Math.floor(this.regenAccumulator);
      this.regenAccumulator -= whole;
      this.healPlayer(whole);
    }
  }

  private updatePlayerMovement(dt: number): void {
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
      const speed = PLAYER.speed * this.stats.speedMultiplier;
      this.player.x += vx * speed * (dt / 1000);
      this.player.y += vy * speed * (dt / 1000);
      const bob = Math.sin(this.elapsedMs / 120) * 0.02;
      this.player.setScale(PLAYER.spriteScale * (1 + bob), PLAYER.spriteScale * (1 - bob));
    } else {
      this.player.setScale(PLAYER.spriteScale);
    }

    // Мигание при получении урона.
    if (this.hurtFlash > 0) {
      this.hurtFlash -= dt;
      this.player.setAlpha(Math.sin(this.elapsedMs / 40) > 0 ? 0.35 : 1);
    } else {
      this.player.setAlpha(1);
    }
  }

  private updateSpawning(dt: number): void {
    const decision = this.spawner.next(
      this.elapsedMs,
      this.player.x,
      this.player.y,
      this.enemies.length,
      dt
    );
    if (!decision) return;

    const enemy = new Enemy(
      this,
      decision.def,
      decision.x,
      decision.y,
      decision.hpMultiplier,
      decision.speedMultiplier
    );
    this.enemies.push(enemy);
  }

  private updateEnemies(dt: number): void {
    // Перестраиваем сетку раз в кадр — она отражает текущие позиции.
    this.grid.clear();
    for (const e of this.enemies) this.grid.insert(e);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dead = enemy.update(dt, this.player.x, this.player.y);
      if (dead) {
        this.onEnemyKilled(enemy);
        enemy.destroy();
        this.enemies.splice(i, 1);
        continue;
      }

      // Касание игрока — урон.
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist < enemy.state.def.radius + 18) {
        this.damagePlayer(enemy.state.def.damage);
      }
    }
  }

  private onEnemyKilled(enemy: Enemy): void {
    this.kills += 1;

    // Зачётка выпадает из врага.
    this.orbs.push(new XPOrb(this, enemy.x, enemy.y, enemy.state.def.xp));

    // Рюкзак роняет сумку и даёт немного HP.
    if (enemy.state.def.kind === 'dropper') {
      const satchel = this.add.image(enemy.x, enemy.y, 'pickup-satchel').setDepth(5);
      this.tweens.add({
        targets: satchel,
        y: enemy.y - 24,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.healPlayer(15);
    }

    // Вспышка попадания.
    const flash = this.add.image(enemy.x, enemy.y, 'fx-hit-flash').setDepth(7);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.6,
      duration: 220,
      onComplete: () => flash.destroy(),
    });
  }

  private updateWeapons(dt: number): void {
    const ctx = {
      playerX: this.player.x,
      playerY: this.player.y,
      enemies: this.enemies,
      damageMultiplier: this.damageMultiplier,
      effects: this.effects,
      spawnProjectile: (opts: Parameters<typeof this.spawnProjectile>[0]) =>
        this.spawnProjectile(opts),
    };
    this.weapons.update(dt, ctx);
    this.weapons.updateContinuous(dt, ctx);

    // Постоянные эффекты наносят урон мимо снарядов.
    const hits = this.effects.update(dt, this.player.x, this.player.y, this.enemies);
    for (const hit of hits) {
      const enemy = this.enemies[hit.enemyIndex];
      if (!enemy || enemy.isDead) continue;
      const dead = enemy.takeDamage(hit.damage);
      if (dead) {
        this.onEnemyKilled(enemy);
        enemy.destroy();
        this.enemies.splice(hit.enemyIndex, 1);
      }
    }
  }

  private spawnProjectile(opts: {
    x: number;
    y: number;
    sprite: string;
    kind: 'linear' | 'homing' | 'orbit' | 'arc' | 'beam' | 'zone' | 'splash';
    damage: number;
    speed: number;
    radius: number;
    pierce: number;
    lifetime: number;
    dx?: number;
    dy?: number;
    arcHalfAngle?: number;
  }): Projectile {
    const p = new Projectile(this, opts);
    this.projectiles.push(p);
    return p;
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      if (p.kind === 'homing') {
        // Ищем ближайшего врага и ведём к нему.
        const candidates = this.grid.query(p.x, p.y, 400);
        let best: Enemy | undefined;
        let bestDist = Infinity;
        for (const e of candidates) {
          if (e.isDead) continue;
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < bestDist) {
            bestDist = d;
            best = e;
          }
        }
        if (best) p.steer(best.x, best.y, 0.08);
      }

      p.update(dt);

      // Попадания.
      const candidates = this.grid.query(p.x, p.y, p.radius + 60);
      for (const enemy of candidates) {
        if (enemy.isDead || p.hitSprites.includes(enemy.state.sprite)) continue;
        if (!p.hits(enemy.x, enemy.y, enemy.state.def.radius)) continue;

        p.hitSprites.push(enemy.state.sprite);
        const dead = enemy.takeDamage(p.damage);
        if (dead) {
          this.onEnemyKilled(enemy);
          enemy.destroy();
          const idx = this.enemies.indexOf(enemy);
          if (idx >= 0) this.enemies.splice(idx, 1);
        }

        if (p.pierce <= 0) {
          p.alive = false;
          break;
        }
        p.pierce -= 1;
      }

      if (!p.alive || p.expired) {
        p.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateOrbs(dt: number): void {
    const magnetRange = PLAYER.magnetRange * this.stats.magnetMultiplier;
    const pickupRange = PLAYER.pickupRange * this.stats.pickupMultiplier;

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      orb.update(dt, this.player.x, this.player.y, magnetRange);

      const dist = Math.hypot(orb.x - this.player.x, orb.y - this.player.y);
      if (dist < pickupRange) {
        const leveled = this.upgrades.addXp(orb.value);
        orb.destroy();
        this.orbs.splice(i, 1);
        if (leveled) this.showLevelUp();
        continue;
      }

      // Зачётки не висят вечно.
      if (orb.age > 30000) {
        orb.destroy();
        this.orbs.splice(i, 1);
      }
    }
  }

  private damagePlayer(amount: number): void {
    // Пока идёт неуязвимость — урон не проходит.
    if (this.elapsedMs < this.invulnerableUntil) return;

    const real = Math.max(0, amount - this.stats.armor);
    if (real <= 0) return;

    this.hp = Math.max(0, this.hp - real);
    this.invulnerableUntil = this.elapsedMs + PLAYER.invincibilityMs;
    this.hurtFlash = 220;

    if (this.hp <= 0) this.onPlayerDead();
  }

  private healPlayer(amount: number): void {
    this.hp = Math.min(this.stats.maxHp, this.hp + amount);
  }

  private onPlayerDead(): void {
    this.scene.start('GameOver', {
      kills: this.kills,
      level: this.upgrades.level,
      time: this.elapsedMs,
    });
  }

  private showLevelUp(): void {
    const options = this.upgrades.rollOptions(3);
    this.scene.pause();
    this.scene.launch('LevelUp', {
      options,
      level: this.upgrades.level,
      onChoose: (option: UpgradeOption) => {
        this.upgrades.apply(option);
        this.recalcStats();
      },
    });
  }

  private recalcStats(): void {
    const s = this.upgrades.stats({
      maxHp: PLAYER.maxHp,
      speed: PLAYER.speed,
      pickupRange: PLAYER.pickupRange,
      magnetRange: PLAYER.magnetRange,
    });
    // Прирост максимума HP сразу добавляет столько же здоровья.
    const hpGain = Math.max(0, s.maxHp - this.stats.maxHp);
    this.stats = {
      maxHp: s.maxHp,
      speedMultiplier: s.speedMultiplier,
      pickupMultiplier: s.pickupMultiplier,
      magnetMultiplier: s.magnetMultiplier,
      armor: s.armor,
      regenPerSecond: s.regenPerSecond,
    };
    this.damageMultiplier = s.damageMultiplier;
    this.hp = Math.min(this.hp + hpGain, s.maxHp);
  }

  private updateHud(): void {
    const { width } = this.scale;
    const total =
      (isMobile() ? RUN.durationMinutesMobile : RUN.durationMinutes) * 60 * 1000;
    const left = Math.max(0, total - this.elapsedMs);
    const mm = Math.floor(left / 60000);
    const ss = Math.floor((left % 60000) / 1000);

    // Полоса опыта.
    const barW = width - 24;
    this.xpBar.width = barW * this.upgrades.levelProgress();
    this.xpBar.x = width / 2 - barW / 2;

    // Полоса здоровья.
    this.hpBar.width = 220 * (this.hp / Math.max(1, this.stats.maxHp));
    this.hpBar.x = width / 2 - 110;

    this.hudText.setText(
      `До утра: ${mm}:${ss.toString().padStart(2, '0')}\n` +
        `Ур. ${this.upgrades.level}  ·  Убито: ${this.kills}\n` +
        `HP: ${Math.ceil(this.hp)}/${this.stats.maxHp}\n` +
        `Позиция: ${Math.round(this.player.x)}, ${Math.round(this.player.y)}\n` +
        `ESC — выход в меню`
    );
  }
}
