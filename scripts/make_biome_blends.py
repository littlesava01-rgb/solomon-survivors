# -*- coding: utf-8 -*-
"""Сборка переходов между биомами — настоящее смешивание текстур.

Проблема: арена собрана из прямоугольных зон с разным полом, и на
границе зон текстуры обрывались. Подмешивание только цвета (градиент)
не помогает: видно, что рисунок рвётся.

Решение: заранее склеить переходные полосы, где текстура зоны A
плавно переходит в текстуру зоны B. Полоса кладётся поверх стыка, и
шов исчезает.

Три тонкости, из-за которых в первой версии шов остался:

1. Направление смешивания. Переход «слева направо» смешивает по X,
   а «сверху вниз» — по Y. Смешивание всегда шло по X, поэтому
   горизонтальные стыки получались рывком без перехода.

2. Фаза текстуры. Тайлспрайт зоны начинается от левого верхнего угла
   зоны, поэтому в любой точке мира текстура имеет своё смещение.
   Чтобы полоса совпала с обоими тайлами, фаза считается в мировых
   координатах.

3. Оттенок и затенение зоны. Оттенок рисуется поверх пола с
   полупрозрачностью, значит в полосе перехода он тоже должен
   меняться — иначе на краях полосы появляется цветовая ступенька.

Полосы сохраняются в WebP: они непрозрачные, вес получается втрое
меньше, чем у PNG.

Запуск: python scripts/make_biome_blends.py
"""
import json
import math
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FLOOR_DIR = os.path.join(ROOT, "src", "assets", "floors")
OUT_DIR = os.path.join(ROOT, "src", "assets", "blends")
LAYOUT_JSON = os.path.join(ROOT, "src", "data", "biomeLayout.json")

WORLD = 4000
COLS, ROWS = 3, 2
TILE_PX = 256          # размер текстуры пола в пикселях
TILE_SCALE = 1.6       # во сколько раз тайл показан в мире (см. ArenaRenderer)
BLEND_WORLD = 190      # ширина переходной полосы в мировых пикселях (в каждую сторону)
TINT_ALPHA = 0.32      # полупрозрачность оттенка зоны (см. ArenaRenderer)

# Порядок биомов по зонам: 3 колонки x 2 ряда. Должен совпадать
# с src/data/biomes.ts (ZONE_ORDER).
ZONE_ORDER = [
    "street", "old-town", "dorm",
    "corridor", "park", "path",
]

# id -> (файл текстуры, оттенок, затемнение)
BIOMES = {
    "street":   ("snow-asphalt.png", 0xdce6f2, 0.00),
    "old-town": ("snow-cobble.png",  0xe4dcd0, 0.06),
    "dorm":     ("wood-floor.png",   0xf3ddc0, 0.12),
    "corridor": ("linoleum.png",     0xd8e4e0, 0.16),
    "park":     ("snow-grass.png",   0xd9e6d8, 0.04),
    "path":     ("snow-path.png",    0xeef2f7, 0.02),
}


def load_floors():
    floors = {}
    for biome, (fname, _tint, _dark) in BIOMES.items():
        img = Image.open(os.path.join(FLOOR_DIR, fname)).convert("RGB")
        if img.size != (TILE_PX, TILE_PX):
            img = img.resize((TILE_PX, TILE_PX), Image.LANCZOS)
        floors[biome] = img
    return floors


def sample(img, tx, ty):
    """Пиксель текстуры по текстурным координатам (с циклом)."""
    x = int(math.floor(tx)) % TILE_PX
    y = int(math.floor(ty)) % TILE_PX
    return img.getpixel((x, y))


def smoothstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def shade(rgb, tint, dark):
    """Накладывает оттенок и затемнение — ровно как в ArenaRenderer.

    Порядок наложения в рендере: пол -> оттенок (alpha 0.32) ->
    затемнение (alpha = dark, цвет 0x0b1220). Здесь тот же порядок,
    иначе на краях полосы перехода появится цветовая ступенька.
    """
    r, g, b = rgb

    # Оттенок поверх пола с полупрозрачностью.
    tr = (tint >> 16) & 0xFF
    tg = (tint >> 8) & 0xFF
    tb = tint & 0xFF
    a = TINT_ALPHA
    r = r * (1 - a) + tr * a
    g = g * (1 - a) + tg * a
    b = b * (1 - a) + tb * a

    # Затемнение поверх оттенка — тоже наложением, а не умножением.
    if dark > 0:
        sr, sg, sb = (0x0B >> 16) & 0xFF, (0x0B >> 8) & 0xFF, 0x0B & 0xFF
        sr, sg, sb = 0x0B, 0x12, 0x20
        r = r * (1 - dark) + sr * dark
        g = g * (1 - dark) + sg * dark
        b = b * (1 - dark) + sb * dark
    return r, g, b


def blend_strip(a_img, b_img, a_tex, b_tex, a_tint, a_dark, b_tint, b_dark,
                width_px, height_px, axis):
    """Полоса перехода между двумя текстурами.

    axis='x' — смешивание слева направо (граница вертикальная).
    axis='y' — смешивание сверху вниз (граница горизонтальная).

    a_tex/b_tex — текстурные координаты A и B в начале полосы.
    """
    out = Image.new("RGB", (width_px, height_px))
    op = out.load()

    span = max(1, (width_px - 1) if axis == "x" else (height_px - 1))

    for j in range(height_px):
        for i in range(width_px):
            t = smoothstep((i if axis == "x" else j) / span)
            ax, ay = a_tex[0] + i, a_tex[1] + j
            bx, by = b_tex[0] + i, b_tex[1] + j

            ar, ag, ab = shade(sample(a_img, ax, ay), a_tint, a_dark)
            br, bg, bb = shade(sample(b_img, bx, by), b_tint, b_dark)

            op[i, j] = (
                int(ar + (br - ar) * t),
                int(ag + (bg - ag) * t),
                int(ab + (bb - ab) * t),
            )
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    floors = load_floors()

    cell_w = WORLD / COLS
    cell_h = WORLD / ROWS

    zones = []
    for row in range(ROWS):
        for col in range(COLS):
            biome = ZONE_ORDER[row * COLS + col]
            zones.append({
                "biome": biome,
                "col": col,
                "row": row,
                "x": col * cell_w,
                "y": row * cell_h,
                "width": cell_w,
                "height": cell_h,
            })

    by_pos = {(z["col"], z["row"]): z for z in zones}
    blends = []

    def emit(name, a, b, axis, rect):
        """Склеивает полосу и добавляет её в раскладку."""
        _af, a_tint, a_dark = BIOMES[a["biome"]]
        _bf, b_tint, b_dark = BIOMES[b["biome"]]
        strip = blend_strip(
            floors[a["biome"]], floors[b["biome"]],
            rect["a_tex"], rect["b_tex"],
            a_tint, a_dark, b_tint, b_dark,
            rect["width"], rect["height"], axis,
        )
        strip.save(os.path.join(OUT_DIR, name), quality=90)
        blends.append({
            "file": name,
            "axis": axis,
            "x": rect["x"],
            "y": rect["y"],
            "width": rect["world_width"],
            "height": rect["world_height"],
        })
        print(f"  {name}  {rect['width']}x{rect['height']}")

    # --- Вертикальные стыки: зоны слева и справа ---
    for row in range(ROWS):
        for col in range(COLS - 1):
            a = by_pos[(col, row)]
            b = by_pos[(col + 1, row)]
            seam_x = b["x"]

            world_x0 = seam_x - BLEND_WORLD
            strip_w = int(round(2 * BLEND_WORLD / TILE_SCALE))
            strip_h = int(round(a["height"] / TILE_SCALE))

            # Фаза текстуры в левом краю полосы.
            a_tx = (world_x0 - a["x"]) / TILE_SCALE
            b_tx = (world_x0 - b["x"]) / TILE_SCALE

            for order in (0, 1):
                first, second = (a, b) if order == 0 else (b, a)
                f_tex = (a_tx, 0) if order == 0 else (b_tx, 0)
                s_tex = (b_tx, 0) if order == 0 else (a_tx, 0)
                emit(
                    f"blend-x-{first['biome']}-{second['biome']}-{order}.webp",
                    first, second, "x",
                    {
                        "a_tex": f_tex, "b_tex": s_tex,
                        "width": strip_w, "height": strip_h,
                        "x": world_x0, "y": a["y"],
                        "world_width": 2 * BLEND_WORLD,
                        "world_height": a["height"],
                    },
                )

    # --- Горизонтальные стыки: зоны сверху и снизу ---
    for row in range(ROWS - 1):
        for col in range(COLS):
            a = by_pos[(col, row)]
            b = by_pos[(col, row + 1)]
            seam_y = b["y"]

            world_y0 = seam_y - BLEND_WORLD
            strip_w = int(round(a["width"] / TILE_SCALE))
            strip_h = int(round(2 * BLEND_WORLD / TILE_SCALE))

            # По X зоны в одном столбце — фаза совпадает.
            a_ty = (world_y0 - a["y"]) / TILE_SCALE
            b_ty = (world_y0 - b["y"]) / TILE_SCALE

            for order in (0, 1):
                first, second = (a, b) if order == 0 else (b, a)
                f_tex = (0, a_ty) if order == 0 else (0, b_ty)
                s_tex = (0, b_ty) if order == 0 else (0, a_ty)
                emit(
                    f"blend-y-{first['biome']}-{second['biome']}-{order}.webp",
                    first, second, "y",
                    {
                        "a_tex": f_tex, "b_tex": s_tex,
                        "width": strip_w, "height": strip_h,
                        "x": a["x"], "y": world_y0,
                        "world_width": a["width"],
                        "world_height": 2 * BLEND_WORLD,
                    },
                )

    layout = {
        "worldWidth": WORLD,
        "worldHeight": WORLD,
        "tileScale": TILE_SCALE,
        "zones": zones,
        "blends": blends,
    }
    os.makedirs(os.path.dirname(LAYOUT_JSON), exist_ok=True)
    with open(LAYOUT_JSON, "w", encoding="utf-8") as f:
        json.dump(layout, f, ensure_ascii=False, indent=2)

    print(f"готово: {len(blends)} переходов, раскладка -> {LAYOUT_JSON}")


if __name__ == "__main__":
    sys.exit(main())
