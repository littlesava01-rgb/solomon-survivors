# -*- coding: utf-8 -*-
"""Нарезка сеток 3x2 на отдельные спрайты + удаление кремового фона.

Сетки лежат в art/sheets/<group>-<n>.png (1536x1024 -> ячейки 512x512),
порядок спрайтов задан каталогом sprites_catalog.py: тот же порядок,
что и в промте, поэтому ячейка N соответствует элементу N списка.

Результат: art/sprites/<id>.png, RGBA, прозрачный фон, размер по каталогу.

Уменьшение 512 -> 32..224 делается через LANCZOS + квантование к палитре
стилевого якоря: NEAREST на таком масштабе выбрасывал целые блоки пикселей,
а плавный ресайз без квантования давал кашу из полупрозрачных краёв.

Фон удаляется связностью с краем ячейки, а не порогом по всему кадру:
порог «цвет ≈ #FFF7ED» съедал бы белые детали внутри спрайта (мел, бумагу).
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sprites_catalog import GROUPS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, "art", "sheets")
OUT = os.path.join(ROOT, "art", "sprites")
BG = (255, 247, 237)  # тёплый кремовый #FFF7ED, фон сетки

# Палитра стилевого якоря (docs/АНАЛИЗ-РЕСУРСОВ.md, раздел 3).
PALETTE = [
    (255, 247, 237),  # cream
    (253, 230, 138),  # parchment
    (249, 115, 22),   # accent orange
    (124, 45, 18),    # deep shadow
    (146, 64, 14),    # muted brown
    (15, 118, 110),   # teal-green
    (30, 58, 95),     # muted blue
    (30, 41, 59),     # outline (dark navy)
    (240, 104, 48),   # squirrel fur
    (248, 232, 216),  # squirrel belly
    (192, 48, 16),    # dark red
    (32, 72, 120),    # squirrel shorts
    (56, 192, 216),   # squirrel eyes
    (231, 229, 228),  # snow / paper white
    (236, 180, 60),   # gold
    (168, 120, 70),   # wood
    (120, 130, 140),  # metal
]


def _nearest_palette(rgb):
    r, g, b = rgb[:3]
    best, best_d = PALETTE[0], None
    for c in PALETTE:
        d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2
        if best_d is None or d < best_d:
            best, best_d = c, d
    return best


def _bg_mask(cell):
    """Маска фона: пиксели цвета кремового фона, связанные с краем ячейки.

    Связность с краем обязательна: иначе выедаются белые детали внутри
    спрайта (мел, бумага, снег).
    """
    w, h = cell.size
    px = cell.load()
    bg = [[False] * w for _ in range(h)]
    stack = []
    for x in range(w):
        for y in (0, h - 1):
            stack.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            stack.append((x, y))
    while stack:
        x, y = stack.pop()
        if bg[y][x]:
            continue
        r, g, b, _a = px[x, y]
        d = abs(r - BG[0]) + abs(g - BG[1]) + abs(b - BG[2])
        if d > 70:
            continue
        bg[y][x] = True
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx]:
                stack.append((nx, ny))
    return bg


def cut_cell(cell, size_w, size_h, sprite_id, out_dir):
    """Ячейка -> отдельный спрайт RGBA size_w x size_h."""
    px = cell.load()
    bg = _bg_mask(cell)
    for y in range(cell.height):
        for x in range(cell.width):
            if bg[y][x]:
                px[x, y] = (*px[x, y][:3], 0)
            else:
                px[x, y] = (*px[x, y][:3], 255)

    bbox = cell.getbbox()
    if bbox:
        cell = cell.crop(bbox)
    if cell.width == 0 or cell.height == 0:
        return None

    # Вписываем в целевой размер с полями, сохраняя пропорции.
    scale = min((size_w - 2) / cell.width, (size_h - 2) / max(cell.height, 1))
    nw = max(1, int(round(cell.width * scale)))
    nh = max(1, int(round(cell.height * scale)))
    cell = cell.resize((nw, nh), Image.Resampling.LANCZOS)

    # Квантуем к палитре стилевого якоря -> снова пиксель-арт.
    cp = cell.load()
    for y in range(nh):
        for x in range(nw):
            r, g, b, a = cp[x, y]
            if a == 0:
                continue
            cp[x, y] = _nearest_palette((r, g, b)) + (a,)

    canvas = Image.new("RGBA", (size_w, size_h), (0, 0, 0, 0))
    canvas.paste(cell, ((size_w - nw) // 2, (size_h - nh) // 2), cell)
    dest = os.path.join(out_dir, f"{sprite_id}.png")
    canvas.save(dest)
    return dest


def cut_sheet(path, items, out_dir, cols=3, rows=2):
    im = Image.open(path).convert("RGBA")
    W, H = im.size
    cw, ch = W // cols, H // rows
    names = []
    for i, (sprite_id, w, h, _desc) in enumerate(items):
        if i >= cols * rows:
            break
        cx = (i % cols) * cw
        cy = (i // cols) * ch
        dest = cut_cell(im.crop((cx, cy, cx + cw, cy + ch)), w, h,
                        sprite_id, out_dir)
        if dest:
            names.append(sprite_id)
    return names


def main():
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for group, items in GROUPS.items():
        chunks = [items[i:i + 6] for i in range(0, len(items), 6)]
        for n, chunk in enumerate(chunks, 1):
            if len(chunk) == 6:
                path = os.path.join(SHEETS, f"{group}-{n}.png")
                if not os.path.exists(path):
                    print(f"MISSING {path}")
                    continue
                names = cut_sheet(path, chunk, OUT, 3, 2)
            else:
                # Остаток нарисован одиночными кадрами.
                names = []
                for item in chunk:
                    path = os.path.join(SHEETS, f"solo-{group}-{item[0]}.png")
                    if not os.path.exists(path):
                        print(f"MISSING {path}")
                        continue
                    cut_sheet(path, [item], OUT, 1, 1)
                    names.append(item[0])
            total += len(names)
            print(f"ok {group}-{n}: {len(names)} спрайтов")
    print(f"всего: {total} -> {OUT}")


if __name__ == "__main__":
    main()
