/**
 * Пул объектов.
 *
 * На арене одновременно сотни врагов и снарядов. Если создавать и уничтожать
 * Phaser-объекты каждый кадр — будут сборки мусора и просадки FPS. Пул
 * переиспользует объекты: `acquire` достаёт свободный, `release` возвращает.
 */
export class ObjectPool<T> {
  private readonly items: T[] = [];
  private readonly active = new Set<T>();

  constructor(
    private readonly factory: () => T,
    private readonly reset: (item: T) => void,
    prefill = 0
  ) {
    for (let i = 0; i < prefill; i++) {
      this.items.push(this.factory());
    }
  }

  /** Достаёт объект из пула (или создаёт новый, если свободных нет). */
  acquire(): T {
    const item = this.items.pop() ?? this.factory();
    this.active.add(item);
    return item;
  }

  /** Возвращает объект в пул. */
  release(item: T): void {
    if (!this.active.has(item)) return;
    this.active.delete(item);
    this.reset(item);
    this.items.push(item);
  }

  /** Возвращает в пул всё активное — при перезапуске забега. */
  releaseAll(): void {
    for (const item of [...this.active]) {
      this.release(item);
    }
  }

  get activeCount(): number {
    return this.active.size;
  }

  get freeCount(): number {
    return this.items.length;
  }
}
