# -*- coding: utf-8 -*-
"""Нарезка листа текстур пола в бесшовные тайлы.

Модель не умеет делать по-настоящему бесшовные текстуры: края почти
всегда слегка отличаются, и на стыках видно швы.

Ячейки листа ищем ПО СОДЕРЖИМОМУ, а не по арифметике сетки. Раньше
предполагалось, что ячейка 512x512 начинается в (0,0), (512,0), ... —
но модель оставляет поля, и реальные ячейки лежат вроде (34,32) с
размером 465x461. Кремовые зазоры попадали в тайл, и на стыках
появлялись белые полосы.

Способ бесшовности — зеркалирование ячейки вчетверо: правый край
тайла — зеркальное отражение левого, поэтому стык двух тайлов
непрерывен по построению.

Запуск: python scripts/cut_floors.py
"""
import os
import sys
from collections import deque

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

# Размер итогового бесшовного тайла.
#
# Тайл 1024, а не 256: период повтора на экране должен быть больше
# ширины экрана, иначе фактура пола читается как обои. При 1024 и
# TILE_SCALE 1.0 один тайл занимает 1024 мировых пикселя — ровно
# ширину экрана, и повтор в кадре не виден вовсе.
TILE = 1024
CREAM = (255, 247, 237)
CREAM_TOL = 16
MIN_CELL_PX = 20000


def is_cream(p):
    return (abs(p[0] - CREAM[0]) <= CREAM_TOL
            and abs(p[1] - CREAM[1]) <= CREAM_TOL
            and abs(p[2] - CREAM[2]) <= CREAM_TOL)


def find_cells(sheet):
    """Ищет ячейки листа по связным областям не-кремового цвета.

    Модель рисует сетку с полями, поэтому арифметика (0, 512, 1024)
    не работает. Зато каждая ячейка — связная область, отличная от
    кремового фона.
    """
    w, h = sheet.size
    px = sheet.load()
    seen = bytearray(w * h)
    boxes = []

    for y0 in range(h):
        for x0 in range(w):
            if seen[y0 * w + x0] or is_cream(px[x0, y0]):
                continue
            queue = deque([(x0, y0)])
            seen[y0 * w + x0] = 1
            minx = maxx = x0
            miny = maxy = y0
            count = 0
            while queue:
                x, y = queue.popleft()
                count += 1
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if (0 <= nx < w and 0 <= ny < h
                            and not seen[ny * w + nx]
                            and not is_cream(px[nx, ny])):
                        seen[ny * w + nx] = 1
                        queue.append((nx, ny))
            if count >= MIN_CELL_PX:
                boxes.append((minx, miny, maxx, maxy))

    # Порядок: по строкам сверху вниз, внутри строки — слева направо.
    boxes.sort(key=lambda b: (b[1] // 200, b[0]))
    return boxes


def make_seamless(cell):
    """Собирает бесшовный тайл.

    Способ — зеркалирование целой ячейки вчетверо, а НЕ кросс-фейд.

    Кросс-фейд (сдвиг + наложение) давал бесшовность, но оставлял
    диагональные разводы: маска перехода шла по диагонали, и сдвинутая
    копия протягивалась через всю текстуру. На земле это читалось
    как «протёртость», но выглядело артефактом.

    Зеркалирование швов не создаёт вовсе: правый край тайла — это
    отражение левого, поэтому стык двух тайлов непрерывен по
    построению. Цена — симметрия, но на однородной фактуре (а промт
    отдельно запрещает орнамент и центральный медальон) она
    незаметна, а период повтора большой.

    Тайл собирается из ВСЕЙ ячейки (512), а не из её четверти: иначе
    детали растягиваются в четыре раза и снова превращаются в орнамент.
    """
    cell = cell.convert("RGB")
    w, h = cell.size

    out = Image.new("RGB", (w * 2, h * 2))
    out.paste(cell, (0, 0))
    out.paste(cell.transpose(Image.FLIP_LEFT_RIGHT), (w, 0))
    out.paste(cell.transpose(Image.FLIP_TOP_BOTTOM), (0, h))
    out.paste(
        cell.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.FLIP_TOP_BOTTOM),
        (w, h),
    )
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
        sheet = Image.open(os.path.join(SHEETS_DIR, sheet_name)).convert("RGB")
        boxes = find_cells(sheet)
        print(f"{sheet_name}: найдено ячеек {len(boxes)}")

        for box in boxes:
            if idx >= len(NAMES):
                break
            # Убираем светлый кант по краю ячейки: модель рисует
            # мягкий переход в кремовый фон, и эти 1-2 пикселя попадали
            # в тайл — на стыке они давали белую полосу.
            x0, y0, x1, y1 = box
            inset = 3
            cell = sheet.crop((x0 + inset, y0 + inset,
                               x1 - inset + 1, y1 - inset + 1))
            tile = make_seamless(cell)
            name = NAMES[idx]
            path = os.path.join(OUT_DIR, f"{name}.png")
            tile.save(path, optimize=True)
            print(f"  {name:14s} <- ячейка {box} ({cell.size} -> {tile.size})")
            idx += 1

    print(f"готово: {idx} тайлов в {OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
