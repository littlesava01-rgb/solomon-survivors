/**
 * Пространственная сетка для коллизий.
 *
 * Проверка «каждый снаряд против каждого врага» — это O(n*m): при 150 врагах
 * и 200 снарядах получается 30 000 проверок в кадр. Сетка делит мир на
 * квадраты и даёт кандидатов только из соседних ячеек.
 */
export class SpatialGrid<T extends { x: number; y: number }> {
  private readonly cells = new Map<string, T[]>();
  private readonly cellSize: number;

  constructor(cellSize = 128) {
    this.cellSize = cellSize;
  }

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  private cellOf(x: number, y: number): [number, number] {
    return [Math.floor(x / this.cellSize), Math.floor(y / this.cellSize)];
  }

  clear(): void {
    this.cells.clear();
  }

  insert(item: T): void {
    const [cx, cy] = this.cellOf(item.x, item.y);
    const key = this.key(cx, cy);
    let bucket = this.cells.get(key);
    if (!bucket) {
      bucket = [];
      this.cells.set(key, bucket);
    }
    bucket.push(item);
  }

  /** Все объекты в радиусе r от точки. */
  query(x: number, y: number, r: number): T[] {
    const out: T[] = [];
    const minCx = Math.floor((x - r) / this.cellSize);
    const maxCx = Math.floor((x + r) / this.cellSize);
    const minCy = Math.floor((y - r) / this.cellSize);
    const maxCy = Math.floor((y + r) / this.cellSize);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = this.cells.get(this.key(cx, cy));
        if (bucket) out.push(...bucket);
      }
    }
    return out;
  }
}
