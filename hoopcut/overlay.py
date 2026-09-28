"""Habillage du short : titre, score et légende dessinés dans une image PNG transparente.

L'image (1080x1920) est posée par FFmpeg au-dessus de la vidéo : le titre dans la zone
libre du haut, le score et la légende dans celle du bas, hors des zones masquées par
l'interface de TikTok / Reels / Shorts.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageColor, ImageDraw, ImageFilter, ImageFont

FONT_PATH = Path(__file__).parent / "assets" / "fonts" / "Anton-Regular.ttf"
FALLBACK_FONTS = (
    "DejaVuSans-Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
)

SAFE_TOP = 150  # sous l'interface du haut des applis
SAFE_BOTTOM = 1600  # au-dessus de la description et des boutons du bas
MAX_TEXT_WIDTH = 960
EXTRA_GLYPHS = set("–—‘’“”…·•€")


@dataclass
class OverlayContent:
    title: str
    tag: str | None = None  # petite étiquette au-dessus du titre (compétition, « FOCUS … »)
    team_a: str | None = None
    team_b: str | None = None
    score_a: int | None = None
    score_b: int | None = None
    score_label: str = "SCORE"
    caption: str | None = None  # ex. « DUNK · TONY PARKER »

    @property
    def has_score(self) -> bool:
        return None not in (self.team_a, self.team_b, self.score_a, self.score_b)


def draw_overlay(
    path: Path,
    content: OverlayContent,
    *,
    video_top: int,
    video_bottom: int,
    accent: str = "#FF7A00",
    size: tuple[int, int] = (1080, 1920),
) -> Path:
    canvas = overlay_image(content, video_top=video_top, video_bottom=video_bottom, accent=accent, size=size)
    path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(path)
    return path


def overlay_image(
    content: OverlayContent,
    *,
    video_top: int,
    video_bottom: int,
    accent: str = "#FF7A00",
    size: tuple[int, int] = (1080, 1920),
) -> Image.Image:
    content = replace(content, **{k: _printable(v) for k, v in vars(content).items() if isinstance(v, str)})
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    accent_rgb = ImageColor.getrgb(accent)[:3]
    center_x = size[0] // 2

    _draw_title_block(canvas, content, center_x, video_top, accent_rgb)

    y = video_bottom + 44
    if content.has_score:
        y = _draw_score_panel(canvas, content, center_x, y, accent_rgb) + 34
    if content.caption:
        caption_size = 62 if content.has_score else 74
        font, lines = _fit(content.caption.upper(), MAX_TEXT_WIDTH, 2, caption_size, 36)
        line_height = int(font.size * 1.12)
        if y + line_height * len(lines) > SAFE_BOTTOM:
            y = SAFE_BOTTOM - line_height * len(lines)
        for line in lines:
            _text(canvas, (center_x, y + line_height // 2), line, font, accent_rgb)
            y += line_height
    return canvas


def _draw_title_block(canvas: Image.Image, content: OverlayContent, cx: int, video_top: int, accent) -> None:
    room = video_top - 44 - SAFE_TOP
    if room < 80 or not content.title:
        return
    tag_height, tag_gap = (64, 22) if content.tag else (0, 0)
    font, lines = _fit(content.title.upper(), MAX_TEXT_WIDTH, 2, 118, 56)
    while True:
        line_height = int(font.size * 1.08)
        block = tag_height + tag_gap + line_height * len(lines)
        if block <= room or font.size <= 40:
            break
        font, lines = _fit(content.title.upper(), MAX_TEXT_WIDTH, 2, font.size - 6, 40)
    y = video_top - 44 - block
    if content.tag:
        _pill(canvas, cx, y + tag_height // 2, content.tag.upper(), accent)
        y += tag_height + tag_gap
    for line in lines:
        _text(canvas, (cx, y + line_height // 2), line, font, (255, 255, 255))
        y += line_height


def _draw_score_panel(canvas: Image.Image, content: OverlayContent, cx: int, top: int, accent) -> int:
    width, height = 920, 180
    panel = Image.new("RGBA", (width + 1, height + 1), (0, 0, 0, 0))
    ImageDraw.Draw(panel).rounded_rectangle((0, 0, width, height), radius=34, fill=(12, 12, 16, 215),
                                            outline=accent + (255,), width=4)
    canvas.alpha_composite(panel, dest=(cx - width // 2, top))

    _text(canvas, (cx, top + 40), content.score_label.upper(), _font(36), accent, shadow=False)
    score = f"{content.score_a}  -  {content.score_b}"
    score_font = _font(92)
    score_width = int(score_font.getlength(score))
    row_y = top + 116
    _text(canvas, (cx, row_y), score, score_font, (255, 255, 255), shadow=False)
    side_width = width // 2 - score_width // 2 - 70
    for name, direction in ((content.team_a, -1), (content.team_b, 1)):
        font, lines = _fit(str(name).upper(), side_width, 1, 60, 30)
        x = cx + direction * (score_width // 2 + 36 + side_width // 2)
        _text(canvas, (x, row_y), lines[0], font, (255, 255, 255), shadow=False)
    return top + height


def _pill(canvas: Image.Image, cx: int, cy: int, text: str, accent) -> None:
    font, lines = _fit(text, MAX_TEXT_WIDTH - 60, 1, 38, 26)
    text_width = int(font.getlength(lines[0]))
    half_w, half_h = text_width // 2 + 28, 32
    layer = Image.new("RGBA", (2 * half_w + 1, 2 * half_h + 1), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle((0, 0, 2 * half_w, 2 * half_h), radius=half_h, fill=accent + (255,))
    canvas.alpha_composite(layer, dest=(cx - half_w, cy - half_h))
    _text(canvas, (cx, cy), lines[0], font, (15, 15, 18), shadow=False)


def _text(canvas: Image.Image, center: tuple[int, int], text: str, font, fill, shadow: bool = True) -> None:
    """Écrit un texte centré sur son encre (utile pour les majuscules), avec ombre portée."""
    draw = ImageDraw.Draw(canvas)
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font, anchor="ls")
    x = center[0] - (left + right) / 2
    y = center[1] - (top + bottom) / 2
    if shadow:
        # L'ombre (texte flouté, décalé de 6 px) n'est calculée qu'autour du texte : bien plus rapide
        box = _clip_box((x + left - 30, y + 6 + top - 30, x + right + 30, y + 6 + bottom + 30), canvas.size)
        if box:
            layer = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
            ImageDraw.Draw(layer).text((x - box[0], y + 6 - box[1]), text, font=font, fill=(0, 0, 0, 180), anchor="ls")
            canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(8)), dest=box[:2])
    draw.text((x, y), text, font=font, fill=tuple(fill) + (255,), anchor="ls")


def _clip_box(box: tuple[float, float, float, float], size: tuple[int, int]) -> tuple[int, int, int, int] | None:
    left, top = max(0, int(box[0])), max(0, int(box[1]))
    right, bottom = min(size[0], int(box[2]) + 1), min(size[1], int(box[3]) + 1)
    return (left, top, right, bottom) if right > left and bottom > top else None


def _printable(text: str) -> str:
    """Retire les caractères que la police ne sait pas dessiner (emojis, écritures non latines)."""
    kept = "".join(c for c in text if ord(c) < 0x250 or c in EXTRA_GLYPHS)
    return " ".join(kept.split())


def _fit(text: str, max_width: int, max_lines: int, size_max: int, size_min: int):
    """Plus grande taille de police (et découpage en lignes) qui tient dans la largeur."""
    for size in range(size_max, size_min - 1, -2):
        font = _font(size)
        lines = _wrap(text, font, max_width, max_lines)
        if lines:
            return font, lines
    font = _font(size_min)
    words = text.split()
    while words:  # dernier recours : on raccourcit
        lines = _wrap(" ".join(words) + "…", font, max_width, max_lines)
        if lines:
            return font, lines
        words = words[:-1]
    return font, [text[:12]]


def _wrap(text: str, font, max_width: int, max_lines: int) -> list[str] | None:
    lines: list[str] = []
    current = ""
    for word in text.split():
        trial = f"{current} {word}".strip()
        if font.getlength(trial) <= max_width:
            current = trial
            continue
        if font.getlength(word) > max_width:
            return None
        lines.append(current)
        current = word
    if current:
        lines.append(current)
    return lines if 0 < len(lines) <= max_lines else None


@lru_cache(maxsize=64)
def _font(size: int) -> ImageFont.FreeTypeFont:
    for candidate in (FONT_PATH, *FALLBACK_FONTS):
        try:
            return ImageFont.truetype(str(candidate), size)
        except OSError:
            continue
    return ImageFont.load_default(size)
