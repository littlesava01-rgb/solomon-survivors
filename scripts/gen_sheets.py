# -*- coding: utf-8 -*-
"""Генерация спрайтов сетками 3x2 + нарезка на отдельные PNG.

Один промт -> 6 спрайтов. Это и есть требование «одним промтом получить
сразу несколько картинок»: полная сетка 1536x1024 (клетки 512px),
остаток (<6) — одиночными кадрами 1024x1024 (на неполной сетке модель
«разъезжается» и рисует композицию 2x2 вместо сетки).

Прозрачный фон через API не выдаётся: рисуем на кремовом #FFF7ED
и вырезаем сами (см. cut_sprites.py).
"""
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_api import generate  # noqa: E402
from sprites_catalog import GROUPS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, "art", "sheets")
os.makedirs(SHEETS, exist_ok=True)

# Стилевой якорь. Палитра — из docs/АНАЛИЗ-РЕСУРСОВ.md (раздел 3),
# она совпадает с 110 готовыми иконками, чтобы спрайты врагов и
# существующая графика интерфейса жили в одном наборе.
#
# Отличие от промта для иконок: это ИГРОВОЙ СПРАЙТ 3/4 сверху, а не
# изометрическая иконка. Вид сверху обязателен — по нему считаются
# коллизии на арене.
STYLE = """Chunky 32-bit era pixel art game sprite sheet, hand-placed pixels,
strict limited palette, no anti-aliasing, no gradients, bold dark-navy
outline #1E293B, warm cream #FFF7ED, accent orange #F97316, deep shadow
#7C2D12, parchment #FDE68A, muted brown #92400E, teal-green #0F766E,
muted blue #1E3A5F for cold elements.
Birobidzhan / Jewish Autonomous Region ambience: small far-eastern Russian
border town, wooden and low-rise brick architecture, birch and larch trees,
mild blue-grey winter light. Warm, kind, nostalgic, NOT grim.

VIEWPOINT: this is a top-down GAME SPRITE sheet, seen from a three-quarter
top-down angle like an arcade survival game (Vampire Survivors), NOT an
isometric icon and NOT a side view. Objects sit flat as if lying on the
ground. Strong readable silhouette, single flat lighting, contact shadow
directly under the object only.

BACKGROUND: one single flat solid warm cream #FFF7ED fill, no texture, no
gradient, no vignette, no shadow on the background, no frame around the sheet.
"""


def sheet_prompt(items, cols, rows):
    lines = [STYLE]
    lines.append(
        f"SHEET LAYOUT: a clean {cols}x{rows} grid of {len(items)} separate "
        "game sprites, one sprite per cell, equal square cells, a clear empty "
        "cream gap between neighbouring sprites, nothing touches the sheet "
        "edge, no frames, no grid lines, no dividers, no labels, no letters, "
        "no numbers, no watermark, no UI.")
    lines.append(
        "Each sprite is centered inside its cell, fills about 75% of the cell, "
        "reads instantly as a small 48px silhouette, single flat lighting, "
        "bold outline, no drop shadow beyond a tight contact shadow.")
    lines.append(
        "EVERY cell of the grid must hold exactly one of the listed objects. "
        "Do not merge objects into a scene, do not add scenery, buildings, "
        "snowy backgrounds or scenery vignettes around them, do not leave a "
        "cell empty, do not draw hands, characters or people. Only the listed "
        "objects, nothing else.")
    for i, (_id, _w, _h, desc) in enumerate(items, 1):
        lines.append(f"Cell {i}: {desc}")
    lines.append(
        "No text, no letters, no numbers anywhere, including on covers, "
        "labels and pages. Blank covers only.")
    return "\n".join(lines)


def solo_prompt(items):
    """Один спрайт на весь кадр — для остатков, где сетка не нужна.

    Принимает список из одного элемента (как sheet_prompt).
    """
    _id, _w, _h, desc = items[0]
    lines = [STYLE]
    lines.append(
        "LAYOUT: exactly ONE single game sprite centered on the flat cream "
        "background, filling about 70% of the frame, generous empty cream "
        "margin on all sides. No scenery, no buildings, no landscape, no "
        "second object, no vignette, no frame, no shadow, no letters, no "
        "numbers, no watermark.")
    lines.append(f"Object: {desc}")
    lines.append(
        "No text, no letters, no numbers anywhere, including on covers, "
        "labels and pages. Blank covers only.")
    return "\n".join(lines)


def make_batches(group, items, per_sheet=6):
    """Полные сетки 3x2 -> один промт на 6 спрайтов."""
    batches = []
    for i in range(0, len(items), per_sheet):
        chunk = items[i:i + per_sheet]
        if len(chunk) == per_sheet:
            path = os.path.join(SHEETS, f"{group}-{i // per_sheet + 1}.png")
            batches.append((chunk, path, 3, 2, "1536x1024"))
        else:
            for item in chunk:
                path = os.path.join(SHEETS, f"solo-{group}-{item[0]}.png")
                batches.append(([item], path, 1, 1, "1024x1024"))
    return batches


def run(batch):
    chunk, path, cols, rows, size = batch
    if os.path.exists(path) and os.path.getsize(path) > 20000:
        return f"skip {os.path.basename(path):26s} уже есть"
    t0 = time.time()
    prompt = sheet_prompt(chunk, cols, rows) if cols > 1 else solo_prompt(chunk)
    try:
        generate(prompt, size=size, out=path)
    except Exception as exc:  # noqa: BLE001
        return f"FAIL {os.path.basename(path):26s} {str(exc)[:90]}"
    return (f"ok   {os.path.basename(path):26s} {len(chunk)} спрайтов "
            f"{round(time.time() - t0, 1)}s")


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    batches = []
    for group, items in GROUPS.items():
        if which in ("all", group):
            batches += make_batches(group, items, 6)
    print(f"заданий: {len(batches)}", flush=True)
    with ThreadPoolExecutor(max_workers=3) as pool:
        for line in pool.map(run, batches):
            print(line, flush=True)
