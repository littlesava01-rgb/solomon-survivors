# -*- coding: utf-8 -*-
"""Генерация текстур пола для арены.

Пол — это повторяющаяся текстура, поэтому требования другие, чем к спрайтам:
вид строго сверху (ортографический), текстура должна быть бесшовной,
без предметов и без теней.

Один промт даёт 6 текстур (сетка 3x2), каждая в своей ячейке.
После нарезки каждая текстура делается заведомо бесшовной приёмом
«зеркалирование квадранта»: берём левый верхний квадрант и собираем
текстуру из четырёх его отражений. Швы при таком способе невозможны
в принципе.
"""
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_api import generate  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, "art", "floors")
os.makedirs(SHEETS, exist_ok=True)

STYLE = """Chunky 32-bit era pixel art game ground texture, hand-placed pixels,
strict limited palette, no anti-aliasing, no gradients, muted and
desaturated so that game characters placed on top stay readable.
Birobidzhan / Jewish Autonomous Region ambience: small far-eastern Russian
border town, birch and larch trees, mild blue-grey winter light.
Cold, quiet, slightly worn and lived-in. NOT grim, NOT festive.

VIEWPOINT: this is a FLAT TOP-DOWN GROUND TEXTURE, viewed from DIRECTLY ABOVE,
orthographic, like the floor of an arcade survival game. No horizon, no
perspective, no objects standing on it, no furniture, no characters, no
buildings, no trees, no shadows cast by anything. Just the ground surface
filling the whole cell.

THE MOST IMPORTANT RULE: this image must be a completely UNIFORM, PLAIN,
UNDESIGNED sample of ground. It must look like a RANDOM CROPPED PATCH OF
REAL GROUND, not like a designed picture.
NO focal point. NO centred subject. NO medallion. NO decorative motif of
any kind. NO symmetrical arrangement. NO spotlight, NO vignette, NO
highlight pool in the middle, NO framing, NO border, NO corner decoration.
Every single part of the image must be equally plain and equally detailed,
and the four corners must look just like the centre. If you can point at
one spot and say "this is the interesting part", that is WRONG.

SURFACE: the texture must be an IRREGULAR, NATURAL, WEATHERED surface with
random small-scale variation. Fine grain, dirt, scuffs, small stones,
patchy dirt and packed snow. No repeating decorative motif, no tiled
pattern, no checkerboard, no herringbone, no diamond lattice, no woven or
carpet-like design, no large regular shapes.

CONTRAST: keep the value range NARROW and mid-to-light. The surface must be
low contrast so that a character standing on it is always clearly visible.
Avoid strong black outlines, strong dark blobs and saturated colours.

LIGHTING: flat even ambient lighting across the whole cell, no directional
shadow.

BACKGROUND: one single flat solid warm cream #FFF7ED fill, no texture, no
gradient, no vignette, no shadow, no frame around the sheet.
"""

# (id, описание текстуры)
FLOORS = [
    ("snow-asphalt",
     "packed dirty grey asphalt covered with thin patchy snow, grit and "
     "small pebbles showing through, tyre marks"),
    ("snow-cobble",
     "old grey cobblestone street half covered by snow, rounded stones "
     "visible, irregular joints"),
    ("wood-floor",
     "worn warm brown wooden floorboards of a dormitory corridor, long "
     "planks, scuffed varnish"),
    ("linoleum",
     "pale green-beige institutional linoleum floor of a hallway, faint "
     "speckles, worn patches, thin seams"),
    ("snow-grass",
     "frosted winter grass tufts poking through thin snow, frozen soil "
     "and dead stalks"),
    ("snow-path",
     "snowy pedestrian path beaten down to packed white snow with shallow "
     "footprint dents and a compacted dirty track in the middle"),
]

SHEET_PROMPT = """SHEET LAYOUT: a clean 3x2 grid of {n} separate ground
textures, one texture per cell, equal square cells, a clear empty cream gap
between neighbouring cells, nothing touches the sheet edge, no frames, no
grid lines, no dividers, no labels, no letters, no numbers, no watermark.

EVERY cell of the grid must hold exactly one of the listed ground textures
filling its whole cell edge to edge. Do not merge cells into a scene, do not
add objects, do not add scenery, do not leave a cell empty. Only the listed
ground surfaces, nothing else.

{cell_list}
"""


def build_prompt(items):
    cell_list = "\n".join(
        f"Cell {i}: a seamless tileable top-down ground texture of {desc}, "
        f"filling the entire cell edge to edge"
        for i, (_id, desc) in enumerate(items, 1)
    )
    return STYLE + "\n" + SHEET_PROMPT.format(n=len(items), cell_list=cell_list)


def run_sheet(chunk, path):
    if os.path.exists(path) and os.path.getsize(path) > 20000:
        return f"skip {os.path.basename(path):24s} уже есть"
    t0 = time.time()
    try:
        generate(build_prompt(chunk), size="1536x1024", out=path)
    except Exception as exc:  # noqa: BLE001
        return f"FAIL {os.path.basename(path):24s} {str(exc)[:90]}"
    return (f"ok   {os.path.basename(path):24s} {len(chunk)} текстур "
            f"{round(time.time() - t0, 1)}s")


if __name__ == "__main__":
    batches = []
    for i in range(0, len(FLOORS), 6):
        chunk = FLOORS[i:i + 6]
        path = os.path.join(SHEETS, f"floors-{i // 6 + 1}.png")
        batches.append((chunk, path))

    print(f"заданий: {len(batches)}", flush=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        for line in pool.map(lambda b: run_sheet(*b), batches):
            print(line, flush=True)
