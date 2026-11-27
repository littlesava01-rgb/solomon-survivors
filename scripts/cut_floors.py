# -*- coding: utf-8 -*-
"""Нарезка листа текстур пола в бесшовные тайлы.

Модель не умеет делать по-настоящему бесшовные текстуры: края почти
всегда слегка отличаются, и на стыках видно швы.

Надёжный способ — «зеркалирование квадранта»:
  1. берём ячейку листа;
  2. вырезаем из неё квадрант;
  3. собираем тайл из четырёх отражений этого квадранта.

Тогда швы совпадают по построению: правый край тайла — это зеркальное
отражение левого, а значит, стык двух тайлов непрерывен.

Запуск: python scripts/cut_floors.py
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS_DIR = os.path.join(ROOT, "art", "floors")
OUT_DIR = os.path.join(ROOT, "src", "assets", "floors")

# Порядок совпадает с FLOORS в gen_floors.py.
NAMES = [
    "snow-asphalt",
    "snow-cobble",
    "wood-floor",
    "linoleum",
    "snow-grass",
    "snow-path",
]

GRID_COLS = 3
GRID_ROWS = 2
TILE = 256          # размер итогового бесшовного тайла
# Размер квадранта, из которого собирается тайл.
#
# Важно: берём четверть ячейки (256 из 512), а не её шестнадцатую
# часть. При мелком квадранте любой рисунок в исходнике растягивался
# в орнамент: модель рисовала в центре ячейки что-то круглое, а
# зеркалирование превращало это в обои. Крупный квадрант + уменьшение
# в 2 раза съедают рисунок и оставляют фактуру.
QUADRANT = 256
CREAM = (255, 247, 237)


def cell_box(sheet_w, sheet_h, index):
    """Границы ячейки сетки 3x2 с равными квадратными ячейками."""
    cols, rows = GRID_COLS, GRID_ROWS
    cell_w = sheet_w // cols
    cell_h = sheet_h // rows
    # Выравниваем ячейки по меньшей стороне, чтобы они были квадратными.
    side = min(cell_w, cell_h)
    total_h = side * rows
    top = (sheet_h - total_h) // 2
    col = index % cols
    row = index // cols
    x0 = col * side
    y0 = top + row * side
    return (x0, y0, x0 + side, y0 + side)


def trim_cream(img):
    """Убирает кремовый фон по краям ячейки (flood fill от углов)."""
    from collections import deque

    w, h = img.size
    px = img.load()
    seen = bytearray(w * h)
    queue = deque()

    def is_bg(p):
        return (abs(p[0] - CREAM[0]) <= 14 and abs(p[1] - CREAM[1]) <= 14
                and abs(p[2] - CREAM[2]) <= 14)

    for x in range(w):
        for y in (0, h - 1):
            if is_bg(px[x, y]) and not seen[y * w + x]:
                seen[y * w + x] = 1
                queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(px[x, y]) and not seen[y * w + x]:
                seen[y * w + x] = 1
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                if is_bg(px[nx, ny]):
                    seen[ny * w + nx] = 1
                    queue.append((nx, ny))

    # Обрезаем по найденному содержательному прямоугольнику.
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        row = y * w
        for x in range(w):
            if not seen[row + x]:
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    if maxx < 0:
        return img
    return img.crop((minx, miny, maxx + 1, maxy + 1))


def make_seamless(cell):
    """Собирает бесшовный тайл.

    Способ — «сдвиг + кросс-фейд», а не зеркалирование.

    Зеркалирование квадранта гарантирует бесшовность, но вносит
    четырёхкратную симметрию: любой рисунок в исходнике превращается
    в орнамент, и пол выглядит обоями. Особенно заметно, когда модель
    рисует в ячейке что-то круглое по центру.

    Сдвиг + кросс-фейд: берём ячейку, сдвигаем её на половину и
    накладываем копию, сглаживая стык. Текстура остаётся такой,
    какой её нарисовали, а края совпадают.
    """
    cell = cell.convert("RGB")
    w, h = cell.size
    if w < 4 or h < 4:
        return cell.resize((TILE, TILE), Image.LANCZOS)

    # Сдвинутая на половину копия: её левый край — это правый край
    # исходника, поэтому наложение сглаживает разрыв.
    shifted = Image.new("RGB", (w, h))
    ox, oy = w // 2, h // 2
    shifted.paste(cell.crop((ox, oy, w, h)), (0, 0))
    shifted.paste(cell.crop((0, oy, ox, h)), (w - ox, 0))
    shifted.paste(cell.crop((ox, 0, w, oy)), (0, h - oy))
    shifted.paste(cell.crop((0, 0, ox, oy)), (w - ox, h - oy))

    # Маска: 0 там, где берём исходник, 1 там, где берём сдвинутую
    # копию. Плавный переход по диагонали.
    mask = Image.new("L", (w, h))
    px = mask.load()
    for y in range(h):
        for x in range(w):
            t = (x / w + y / h) / 2.0
            px[x, y] = int(max(0.0, min(1.0, (t - 0.25) / 0.5)) * 255)

    out = Image.composite(shifted, cell, mask)
    return out.resize((TILE, TILE), Image.LANCZOS)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    sheets = sorted(
        f for f in os.listdir(SHEETS_DIR) if f.startswith("floors-") and f.endswith(".png")
    )
    if not sheets:
        print("нет листов в art/floors")
        return 1

    idx = 0
    for sheet_name in sheets:
        sheet = Image.open(os.path.join(SHEETS_DIR, sheet_name)).convert("RGBA")
        for i in range(GRID_COLS * GRID_ROWS):
            if idx >= len(NAMES):
                break
            box = cell_box(sheet.width, sheet.height, i)
            cell = sheet.crop(box)
            trimmed = trim_cream(cell)
            tile = make_seamless(trimmed)
            name = NAMES[idx]
            path = os.path.join(OUT_DIR, f"{name}.png")
            tile.save(path, optimize=True)
            print(f"  {name:14s} <- {sheet_name} ячейка {i + 1} "
                  f"({cell.size} -> {tile.size})")
            idx += 1

    print(f"готово: {idx} тайлов в {OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
