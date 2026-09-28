"""Mode test « sans IA » : repère les moments forts au volume sonore (foule, commentateur).

Gratuit et hors ligne, mais bien moins fiable que l'IA vidéo : il ne comprend pas le jeu,
il se contente d'écouter. Utile pour essayer le montage sans clé Gemini.
"""

from __future__ import annotations

import re
from pathlib import Path

from .ffmpeg_utils import MediaInfo, run
from .models import Analysis, Moment

_EBUR128 = re.compile(r"t:\s*([0-9.]+)\s+TARGET:.*?M:\s*(-?[0-9.]+|-inf|nan)")
SILENCE = -70.0


def loudness_curve(video: Path, start: float = 0.0, duration: float | None = None) -> list[tuple[float, float]]:
    """Volume perçu (LUFS « momentary », sur les 0,4 s écoulées) toutes les 0,1 s, de toute la vidéo
    ou d'un extrait (temps donnés dans la vidéo)."""
    extract = ["-ss", f"{start:.3f}"] if start > 0 else []
    if duration is not None:
        extract += ["-t", f"{duration:.3f}"]
    proc = run(
        ["ffmpeg", "-hide_banner", "-nostdin", "-nostats", *extract, "-i", str(video),
         "-vn", "-af", "ebur128=framelog=info", "-f", "null", "-"]
    )
    curve = []
    for match in _EBUR128.finditer(proc.stderr):
        value = match.group(2)
        loudness = SILENCE if value in ("-inf", "nan") else max(SILENCE, float(value))
        curve.append((round(start + float(match.group(1)), 2), loudness))
    return curve


def analyze_heuristic(video: Path, info: MediaInfo, cuts: list[float], title: str) -> Analysis:
    curve = loudness_curve(video) if info.has_audio else []
    bounds = [0.0] + [c for c in cuts if 0.0 < c < info.duration] + [info.duration]

    windows: list[tuple[float, float]] = []
    for a, b in zip(bounds, bounds[1:]):
        if b - a < 2.5:
            continue
        parts = max(1, round((b - a) / 8.0))  # les longs plans sont découpés en fenêtres d'environ 8 s
        step = (b - a) / parts
        windows.extend((a + i * step, a + (i + 1) * step) for i in range(parts))

    scored = []
    for a, b in windows:
        points = [(t, loud) for t, loud in curve if a <= t < b]
        levels = sorted(loud for _, loud in points)
        level = levels[int(0.9 * (len(levels) - 1))] if levels else SILENCE
        peak = max(points, key=lambda p: p[1])[0] if points else a + 0.6 * (b - a)
        scored.append((a, b, level, peak))

    if not scored:
        return Analysis(source_duration=info.duration, analyzer="heuristique", title=title)
    low = min(s[2] for s in scored)
    high = max(s[2] for s in scored)
    moments = [
        Moment(
            start=round(a, 2),
            key=round(min(max(peak, a), b), 2),
            end=round(b, 2),
            description="Moment repéré au son (mode sans IA)",
            spectacular=1 + round(9 * (level - low) / (high - low)) if high > low else 5,
            importance=5,
        )
        for a, b, level, peak in scored
    ]
    return Analysis(
        source_duration=info.duration,
        analyzer="heuristique",
        video_type="other",
        title=title,
        moments=moments,
    )
