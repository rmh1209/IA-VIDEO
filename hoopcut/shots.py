"""Repérage des changements de plan, pour couper les clips proprement.

Deux signes de changement de plan :
- une coupe franche : l'image change d'un coup (filtre « scene » de FFmpeg) ;
- une transition par flash blanc ou fondu au noir, fréquente entre deux actions dans les résumés TV :
  l'image change progressivement, sans coupe franche, mais la luminosité fait un pic (ou un creux).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from .ffmpeg_utils import run

_PTS_TIME = re.compile(r"pts_time:\s*([0-9]+(?:\.[0-9]+)?)")
_SCENE = re.compile(r"lavfi\.scene_score=([0-9.]+)")
_LUMA = re.compile(r"lavfi\.signalstats\.YAVG=([0-9.]+)")


def detect_cuts(video: Path, threshold: float = 0.3, min_gap: float = 0.4) -> list[float]:
    """Instants (en s) où le plan change : coupe franche, flash blanc ou fondu au noir."""
    proc = run(
        [
            "ffmpeg", "-hide_banner", "-nostdin", "-i", str(video), "-an", "-sn",
            "-vf", "scale=192:-2,signalstats,select='gte(scene,0)',"
            "metadata=print:key=lavfi.scene_score:file=-,metadata=print:key=lavfi.signalstats.YAVG:file=-",
            "-f", "null", "-",
        ]
    )
    times, scenes, lumas = parse_frame_stats(proc.stdout)
    found = [t for t, s in zip(times, scenes) if s > threshold]
    found += luminance_transitions(times, lumas)
    cuts: list[float] = []
    for t in sorted(found):
        if not cuts or t - cuts[-1] >= min_gap:
            cuts.append(round(t, 3))
    return cuts


def parse_frame_stats(text: str) -> tuple[list[float], list[float], list[float]]:
    """Sortie de metadata=print : pour chaque image, son instant, son score de changement et sa luminosité."""
    frames: dict[float, list[float]] = {}
    t = None
    for line in text.splitlines():
        if (match := _PTS_TIME.search(line)) is not None:
            t = float(match.group(1))
            frames.setdefault(t, [0.0, -1.0])
        elif t is not None and (match := _SCENE.search(line)) is not None:
            frames[t][0] = float(match.group(1))
        elif t is not None and (match := _LUMA.search(line)) is not None:
            frames[t][1] = float(match.group(1))
    ordered = sorted((t, s, y) for t, (s, y) in frames.items() if y >= 0)
    return [t for t, _, _ in ordered], [s for _, s, _ in ordered], [y for _, _, y in ordered]


def luminance_transitions(times: list[float], lumas: list[float], rise: float = 50.0, span: float = 0.7) -> list[float]:
    """Sommet d'un flash blanc (ou fond d'un fondu au noir) : la luminosité monte puis redescend nettement
    (de `rise` au moins, sur 0 à 255) en moins de `span` s de chaque côté. Le changement de plan a lieu là."""
    found = []
    n = len(lumas)
    lo = hi = 0
    for i in range(1, n - 1):
        t = times[i]
        while times[lo] < t - span:
            lo += 1
        while hi < n - 1 and times[hi + 1] <= t + span:
            hi += 1
        before, after = lumas[lo:i], lumas[i + 1:hi + 1]
        if not before or not after:
            continue
        y = lumas[i]
        if y >= lumas[i - 1] and y > lumas[i + 1] and y - min(before) >= rise and y - min(after) >= rise:
            found.append(t)  # flash blanc
        elif y <= lumas[i - 1] and y < lumas[i + 1] and y < 40 and max(before) - y >= rise and max(after) - y >= rise:
            found.append(t)  # fondu au noir
    return found


def load_or_detect_cuts(video: Path, cache: Path) -> list[float]:
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    cuts = detect_cuts(video)
    cache.write_text(json.dumps(cuts), encoding="utf-8")
    return cuts
