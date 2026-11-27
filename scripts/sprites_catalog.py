# -*- coding: utf-8 -*-
"""Каталог спрайтов игры «Белка Соломон».

Каждая запись: (id, размер_x, размер_y, описание для промта).

Размеры — итоговые размеры PNG в игре (спрайты рисуются в 1:1 к пикселю
Phaser, pixelArt: true). Клетка сетки 512px уменьшается до них с LANCZOS
и квантованием к палитре стилевого якоря.

Порядок внутри группы = порядок ячеек в промте, поэтому каталог служит
и заданием для модели, и раскладкой для нарезки.
"""

# ── Враги (этап 2) ────────────────────────────────────────────────────────────
# Враги — школьная атрибутика. Вид: игровой спрайт 3/4 сверху, читается
# силуэтом, толстый контур, палитра та же, что у 110 готовых иконок.

ENEMIES = [
    ("enemy-notebook", 48, 48,
     "a small blue exercise notebook, closed cover with a light grid pattern "
     "and a spiral binding, slightly tilted, seen from a three-quarter top-down "
     "game angle, chunky readable silhouette"),

    ("enemy-chalk", 32, 32,
     "a single short white chalk stick, one chipped end, lying flat, "
     "seen from directly above, tiny compact shape with a strong silhouette"),

    ("enemy-pointer", 48, 48,
     "a wooden school pointer stick, slim tapered rod with a small pink "
     "rubber eraser on one end, angled diagonally, seen from a "
     "three-quarter top-down game angle"),

    ("enemy-pencil", 40, 48,
     "a short yellow wooden pencil with a pink eraser, a metal ferrule and a "
     "sharpened graphite tip, standing tilted on its tip, seen from a "
     "three-quarter top-down game angle"),

    ("enemy-ruler", 56, 32,
     "a straight pale plastic ruler with dark measurement tick marks, lying "
     "flat horizontally, seen from directly above, wide flat silhouette"),

    ("enemy-eraser", 48, 48,
     "a rectangular pink rubber eraser with worn rounded edges, one corner "
     "rubbed away, seen from a three-quarter top-down game angle"),

    ("enemy-textbook", 64, 64,
     "a thick closed hardcover textbook, deep red-brown cover with a visible "
     "spine and stacked page edges, seen from a three-quarter top-down "
     "game angle, heavy bulky shape"),

    ("enemy-diary", 48, 56,
     "a closed personal diary notebook with a marbled dark cover and a thin "
     "rubber band stretched diagonally across it, seen from a three-quarter "
     "top-down game angle"),

    ("enemy-ink", 48, 48,
     "a squat glass bottle of deep blue ink with a metal screw cap, seen from "
     "a three-quarter top-down game angle, glossy round shape"),

    ("enemy-backpack", 64, 64,
     "a small school backpack with a teal fabric body, two shoulder straps "
     "and a top zip pocket, seen from a three-quarter top-down game angle, "
     "wide rounded shape"),
]

# Снаряды и лут отдельным списком: у них другая роль в кадре (мельче,
# должны читаться как летящие предметы), иначе модель рисует их так же,
# как врагов, и они сливаются в кадре.

PROJECTILES = [
    ("proj-page", 32, 32,
     "a single loose white sheet of squared paper with a curled corner, "
     "flying flat, seen from directly above"),

    ("pickup-satchel", 48, 48,
     "a small closed canvas school satchel in warm tan leather with a brass "
     "buckle and a short handle, seen from a three-quarter top-down "
     "game angle"),
]

# ── Оружие и эффекты (этап 3) ───────────────────────────────────────────────
# Оружие отличается от врагов силуэтом и «энергией»: у снарядов есть
# ореол/след, ударные — дуга, зона — клякса. Иначе на арене не отличить.

WEAPONS = [
    ("wpn-pencil", 32, 32,
     "a sharpened yellow pencil flying horizontally to the right, small "
     "orange motion streak behind its tip, seen from a three-quarter "
     "top-down game angle, glowing accent outline"),

    ("wpn-eraser", 48, 48,
     "a pink rubber eraser block spinning with a thin teal energy ring "
     "around it, seen from a three-quarter top-down game angle"),

    ("wpn-pointer", 64, 64,
     "a wooden school pointer striking forward, a short cream crescent slash "
     "arc sweeping in front of its tip, seen from a three-quarter top-down "
     "game angle"),

    ("wpn-ruler", 64, 64,
     "a pale plastic ruler aligned diagonally with a bright golden glowing "
     "line running along its whole length, seen from directly above"),

    ("wpn-notebook-zone", 128, 128,
     "a round spreading puddle of dark blue ink with a blue exercise "
     "notebook lying in the middle of it, seen from directly above, "
     "flat top-down area marker"),

    ("wpn-ink-splat", 64, 64,
     "a burst of deep blue ink splatter, irregular droplets radiating "
     "outward from a central splash, seen from directly above"),
]

EFFECTS = [
    ("fx-formula", 40, 40,
     "a small glowing golden geometric symbol of a compass-drawn star "
     "polygon with a soft halo, floating, no letters and no numbers"),

    ("xp-orb", 24, 24,
     "a small glowing golden five-pointed star token with a warm inner "
     "light, jewel-like, seen from directly above"),

    ("fx-hit-flash", 64, 64,
     "a simple four-pointed starburst impact flash, white-hot core fading to "
     "orange edges, nothing else in the frame"),
]

# ── Боссы (этап 4) ──────────────────────────────────────────────────────────
# Боссы крупные: 160-224 px. Их лучше генерировать одиночными кадрами
# 1024x1024, а не в общей сетке — на общей модель теряет детали.

BOSSES = [
    ("boss-exam", 160, 160,
     "a giant folded exam paper sheet covered in dense scribbled handwriting "
     "lines, with a large red pen slashing diagonally across it, angry "
     "angular shape, seen from a three-quarter top-down game angle, "
     "imposing heavy silhouette"),

    ("boss-diary", 192, 192,
     "a huge closed diary notebook with a marbled dark cover, a stretched "
     "rubber band and a big red mark on the cover, bulky heavy shape, "
     "seen from a three-quarter top-down game angle"),

    ("boss-diploma", 224, 224,
     "a giant rolled certificate scroll tied with a red ribbon, unfurling "
     "slightly at one end, ornate shape, seen from a three-quarter top-down "
     "game angle, largest and heaviest silhouette of the set"),
]

GROUPS = {
    "enemies": ENEMIES,
    "projectiles": PROJECTILES,
    "weapons": WEAPONS,
    "effects": EFFECTS,
    "bosses": BOSSES,
}
