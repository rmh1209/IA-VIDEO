"""Repérage des changements de plan, pour couper les clips proprement."""

from __future__ import annotations

import json
import re
from pathlib import Path

from .ffmpeg_utils import run

_PTS_TIME = re.compile(r"pts_time:\s*([0-9]+(?:\.[0-9]+)?)")


def detect_cuts(video: Path, threshold: float = 0.3, min_gap: float = 0.4) -> list[float]:
    """Instants (en s) où l'image change brutalement de plan."""
    proc = run(
        [
            "ffmpeg", "-hide_banner", "-nostdin", "-i", str(video), "-an", "-sn",
            "-vf", f"scale=192:-2,select='gt(scene,{threshold})',showinfo",
            "-f", "null", "-",
        ]
    )
    cuts: list[float] = []
    for match in _PTS_TIME.finditer(proc.stderr):
        t = float(match.group(1))
        if not cuts or t - cuts[-1] >= min_gap:
            cuts.append(round(t, 3))
    return cuts


def load_or_detect_cuts(video: Path, cache: Path) -> list[float]:
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    cuts = detect_cuts(video)
    cache.write_text(json.dumps(cuts), encoding="utf-8")
    return cuts
