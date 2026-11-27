/**
 * Отрисовка арены: пол по зонам, декор, свет и виньетка.
 *
 * Раньше арена была тёмно-синей сеткой — заглушкой. Теперь это
 * зимний город: у каждой зоны своя текстура пола, по ней разбросан
 * декор (фонари, лавки, сугробы), поверх — холодный свет и виньетка
 * по краям, чтобы арена читалась как замкнутое пространство.
 *
 * Пол рисуется через TileSprite: одна текстура растягивается на всю
 * зону, поэтому текстура должна быть бесшовной (см. scripts/cut_floors.py).
 */
import Phaser from 'phaser';
import { WORLD } from '../config/gameConfig';
import { BIOMES, type BiomeDef } from '../data/biomes';
import layout from '../data/biomeLayout.json';

export interface ArenaVisual {
  /** Слои арены. */
  destroy(): void;
}

interface ZoneLayout {
  biome: string;
  col: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BlendLayout {
  file: string;
  axis: 'x' | 'y';
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ArenaRenderer {
  private readonly layers: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  /** Рисует всю арену. */
  draw(): ArenaVisual {
    const zones = layout.zones as ZoneLayout[];
    const blends = layout.blends as BlendLayout[];
    const byBiome = new Map<string, BiomeDef>(
      BIOMES.map((b) => [b.id, b])
    );

    // Подложка на случай, если текстура не загрузилась.
    const base = this.scene.add
      .rectangle(0, 0, WORLD.width, WORLD.height, 0x1b2430, 1)
      .setOrigin(0)
      .setDepth(-100);
    this.layers.push(base);

    for (const zone of zones) {
      const biome = byBiome.get(zone.biome);
      if (biome) this.drawZone(zone, biome.floor, biome.tint, biome.darkness);
    }

    // Переходы между зонами — поверх пола и оттенков.
    for (const blend of blends) this.drawBlend(blend);

    this.drawDecor(zones, byBiome);
    this.drawLighting();

    return {
      destroy: () => {
        for (const layer of this.layers) layer.destroy();
        this.layers.length = 0;
      },
    };
  }

  /** Зона: текстура пола + оттенок настроения. */
  private drawZone(
    zone: ZoneLayout,
    floorKey: string,
    tint: number,
    darkness: number
  ): void {
    if (this.scene.textures.exists(floorKey)) {
      // TileSprite повторяет текстуру по всей зоне — пол получается
      // бесконечным, а не растянутым на 1300 px.
      const tile = this.scene.add
        .tileSprite(zone.x, zone.y, zone.width, zone.height, floorKey)
        .setOrigin(0)
        .setDepth(-90);
      // Масштаб тайла обязан совпадать с тем, что при сборке полос
      // перехода (scripts/make_biome_blends.py, TILE_SCALE).
      tile.setTileScale(layout.tileScale);
      this.layers.push(tile);
    }

    // Оттенок зоны поверх пола — и под ним тень по краю.
    const tintRect = this.scene.add
      .rectangle(zone.x, zone.y, zone.width, zone.height, tint, 0.32)
      .setOrigin(0)
      .setDepth(-89);
    this.layers.push(tintRect);

    if (darkness > 0) {
      const shade = this.scene.add
        .rectangle(zone.x, zone.y, zone.width, zone.height, 0x0b1220, darkness)
        .setOrigin(0)
        .setDepth(-88);
      this.layers.push(shade);
    }
  }

  /**
   * Полоса перехода между зонами.
   *
   * Это не градиент цвета, а настоящая склейка двух текстур: в ней
   * рисунок одной зоны плавно переходит в рисунок другой. Поэтому
   * шов не виден даже на детальных текстурах вроде брусчатки.
   */
  private drawBlend(blend: BlendLayout): void {
    const key = blend.file.replace(/\.webp$/, '');
    if (!this.scene.textures.exists(key)) return;

    const img = this.scene.add
      .image(blend.x, blend.y, key)
      .setOrigin(0)
      .setDepth(-87);
    // Полоса собрана в пикселях тайла, а показывается в мире.
    img.setScale(layout.tileScale);
    this.layers.push(img);
  }

  /**
   * Декор: фонари, лавки, сугробы.
   *
   * Расставляем по зонам, каждый вид — случайное количество. Декор
   * не участвует в физике и лежит под врагами: он задаёт глубину,
   * а не преграды.
   */
  private drawDecor(
    zones: ZoneLayout[],
    byBiome: Map<string, BiomeDef>
  ): void {
    // Плотность: один объект примерно на 260x260 клеток сетки.
    //
    // Мир — 4000x4000, то есть 16 млн пикселей. При «одном объекте
    // на 26x26» их выходило 4158 — арена превращалась в склад, декор
    // спорил с врагами за внимание, а Phaser волочил 4 тысячи Image.
    // Сейчас их около 230: на экран (1024x768) приходится ~9 штук,
    // ровно столько, чтобы земля выглядела обжитой, но не заваленной.
    const area = WORLD.width * WORLD.height;
    const total = Math.floor(area / (260 * 260));

    for (const zone of zones) {
      const biome = byBiome.get(zone.biome);
      if (!biome) continue;

      const share = Math.floor(
        (total * (zone.width * zone.height)) / area
      );
      const usable = biome.props.filter((key: string) =>
        this.scene.textures.exists(key)
      );
      if (usable.length === 0) continue;

      for (let i = 0; i < share; i++) {
        const key = usable[Math.floor(Math.random() * usable.length)];
        const x = zone.x + Math.random() * zone.width;
        const y = zone.y + Math.random() * zone.height;

        const sprite = this.scene.add.image(x, y, key);
        // Декор чуть меньше игрока и приглушён: он должен читаться
        // как элемент земли, а не как ещё один персонаж в толпе.
        const scale = 0.35 + Math.random() * 0.28;
        sprite.setScale(scale);
        sprite.setAlpha(0.78);
        sprite.setDepth(-85);
        this.layers.push(sprite);
      }
    }
  }

  /**
   * Свет и виньетка.
   *
   * По краям мира — темно, в центре — светло: так арена читается
   * как замкнутое пространство, а не как бесконечный фон.
   */
  private drawLighting(): void {
    // Мягкое свечение в центре арены.
    const glow = this.scene.add
      .graphics()
      .setDepth(-80);
    glow.fillStyle(0xfde68a, 0.1);
    glow.fillCircle(WORLD.width / 2, WORLD.height / 2, 900);
    glow.fillStyle(0xfde68a, 0.08);
    glow.fillCircle(WORLD.width / 2, WORLD.height / 2, 1400);
    this.layers.push(glow);

    // Виньетка по краям — четыре полосы вглубь от границ.
    const band = 420;
    const edge = (x: number, y: number, w: number, h: number) => {
      const rect = this.scene.add
        .rectangle(x, y, w, h, 0x070c16, 0.5)
        .setOrigin(0)
        .setDepth(-79);
      this.layers.push(rect);
    };
    edge(0, 0, WORLD.width, band);
    edge(0, WORLD.height - band, WORLD.width, band);
    edge(0, 0, band, WORLD.height);
    edge(WORLD.width - band, 0, band, WORLD.height);

    // Границы между зонами НЕ обводим: прямая линия по краю зоны
    // читалась как шов, будто арена собрана из прямоугольников.
    // Переход размывают градиенты из drawZoneSeams.
  }
}
