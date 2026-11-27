# -*- coding: utf-8 -*-
"""Генерация декораций для арены (вид строго сверху).

Фоновые текстуры уже готовы (gen_floors.py). Здесь — предметы, которые
рассыпаются по арене: фонари, скамейки, урны, деревья, сугробы.

Важно: вид строго сверху (overhead). Исходные иконки проекта нарисованы
фронтально и в арене смотрелись бы чужеродно, поэтому декор рисуется
заново — с видом сверху, как в классических тайловых играх.

Запуск: python scripts/gen_props.py
"""
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_api import generate  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, "art", "props")
os.makedirs(SHEETS, exist_ok=True)

STYLE = """Chunky 32-bit era pixel art game sprite, hand-placed pixels,
strict limited palette, no anti-aliasing, no gradients.
Birobidzhan / Jewish Autonomous Region ambience: small far-eastern Russian
border town, wooden and low-rise brick architecture, birch and larch trees,
mild blue-grey winter light. Warm, kind, nostalgic, NOT grim.

VIEWPOINT: STRICT OVERHEAD TOP-DOWN view, the camera is directly above the
object looking straight down at the ground, like a map or a classic
tile-based RPG seen from above. The object must read clearly as a shape
seen from directly overhead: a streetlamp is a small round lamp head with
its pole base and a short dark shadow; a tree is a round canopy seen from
above; a bench is a narrow rectangle seen from above.

ONE SINGLE OBJECT per cell, floating on a flat solid warm cream #FFF7ED
background, no ground, no scenery, no other objects, no cast shadow beyond
the object's own short contact shadow, no text, no letters, no numbers,
no watermark, no frame, no cell border.

BACKGROUND: one single flat solid warm cream #FFF7ED fill, no texture, no
gradient, no vignette, no shadow around the object.
"""

PROPS = [
    ("prop-lamp", "a street lamp post seen from directly above: a round "
                  "glowing lamp head with a snow cap on it and a small dark "
                  "circular pole base"),
    ("prop-bench", "a wooden park bench seen from directly above: a "
                   "narrow horizontal rectangle of brown slats with dark "
                   "metal legs at the ends, thin snow on the slats"),
    ("prop-bin", "a metal trash bin seen from directly above: a round "
                 "green-grey drum with a snow-covered lid and a dark "
                 "circular opening in the middle"),
    ("prop-tree", "a bare winter tree seen from directly above: a round "
                  "snow-dusted canopy of thin dark branches spreading from "
                  "a central trunk"),
    ("prop-snowpile", "a mound of shoveled snow seen from directly above: "
                      "an irregular white oval heap with pale blue shadow "
                      "on one side"),
    ("prop-planter", "a concrete planter box seen from directly above: a "
                     "rectangular grey stone box filled with dark soil and "
                     "a few dead stems under snow"),
    ("prop-bollard", "a short metal bollard post seen from directly above: "
                     "a small round steel cap on a round base, snow ring "
                     "around it"),
    ("prop-manhole", "a round iron manhole cover seen from directly above: "
                     "a dark grey circle with a raised grid pattern and "
                     "snow around the rim"),
    ("prop-fence", "a short wooden fence section seen from directly above: "
                   "a row of vertical brown planks in a line with snow "
                   "capping each plank"),
    ("prop-hydrant", "a fire hydrant seen from directly above: a small red "
                     "round cap with side nozzles and a patch of snow "
                     "around its base"),
    ("prop-signpost", "a directional signpost seen from directly above: a "
                       "square blue sign plate on a round post base, seen "
                       "from above so it looks like a blue square"),
    ("prop-crate", "a wooden crate seen from directly above: a square box "
                   "of brown planks with diagonal cross-bracing and snow "
                   "on the corners"),
]

SHEET_PROMPT = """SHEET LAYOUT: a clean 3x2 grid of {n} separate game
sprites, one sprite per cell, equal square cells, a clear empty cream gap
between neighbouring sprites, nothing touches the sheet edge, no frames, no
grid lines, no dividers, no labels, no letters, no numbers, no watermark.

EVERY cell of the grid must hold exactly one of the listed objects, seen
from DIRECTLY ABOVE, floating alone on the cream background. Do not merge
objects into a scene, do not add scenery, do not add ground, do not leave a
cell empty. Only the listed objects, nothing else.

{cell_list}
"""


def build_prompt(items):
    cell_list = "\n".join(
        f"Cell {i}: {desc}"
        for i, (_id, desc) in enumerate(items, 1)
    )
    return STYLE + "\n" + SHEET_PROMPT.format(n=len(items), cell_list=cell_list)


def run_sheet(chunk, path):
    if os.path.exists(path) and os.path.getsize(path) > 20000:
        return f"skip {os.path.basename(path):20s} уже есть"
    t0 = time.time()
    try:
        generate(build_prompt(chunk), size="1536x1024", out=path)
    except Exception as exc:  # noqa: BLE001
        return f"FAIL {os.path.basename(path):20s} {str(exc)[:90]}"
    return (f"ok   {os.path.basename(path):20s} {len(chunk)} объектов "
            f"{round(time.time() - t0, 1)}s")


if __name__ == "__main__":
    batches = []
    for i in range(0, len(PROPS), 6):
        chunk = PROPS[i:i + 6]
        path = os.path.join(SHEETS, f"props-{i // 6 + 1}.png")
        batches.append((chunk, path))

    print(f"заданий: {len(batches)}", flush=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        for line in pool.map(lambda b: run_sheet(*b), batches):
            print(line, flush=True)
