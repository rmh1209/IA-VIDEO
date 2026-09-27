"""Fabrique une fausse vidéo de « match » (plans très différents, volume sonore variable) pour les tests."""

from __future__ import annotations

import subprocess
from pathlib import Path

PATTERNS = [
    "testsrc2=s={size}:r=30",
    "smptehdbars=s={size}:r=30",
    "mandelbrot=s={size}:r=30",
    "rgbtestsrc=s={size}:r=30",
    "color=c=0x1d4ed8:s={size}:r=30,noise=alls=40:allf=t",
    "color=c=0xb91c1c:s={size}:r=30,noise=alls=40:allf=t",
]


def make_synthetic_video(path: Path, scenes: list[tuple[float, float]], size: str = "1280x720") -> Path:
    """scenes : liste de (durée en s, volume du « public » entre 0 et 1)."""
    cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-y", "-loglevel", "error"]
    for index, (duration, _) in enumerate(scenes):
        pattern = PATTERNS[index % len(PATTERNS)].format(size=size)
        cmd += ["-f", "lavfi", "-t", f"{duration}", "-i", pattern]
    for duration, level in scenes:
        cmd += ["-f", "lavfi", "-t", f"{duration}", "-i", f"anoisesrc=c=pink:a={level}:r=48000"]
    count = len(scenes)
    graph = [f"[{i}:v]scale={size.replace('x', ':')},format=yuv420p,setsar=1[v{i}]" for i in range(count)]
    graph += [f"[{count + i}:a]aformat=channel_layouts=stereo[a{i}]" for i in range(count)]
    graph.append("".join(f"[v{i}][a{i}]" for i in range(count)) + f"concat=n={count}:v=1:a=1[v][a]")
    cmd += [
        "-filter_complex", ";".join(graph), "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-c:a", "aac", "-b:a", "96k", str(path),
    ]
    subprocess.run(cmd, check=True)
    return path


def default_scenes() -> list[tuple[float, float]]:
    """~3 min : 24 plans de 5 à 9 s, avec quelques « explosions » du public."""
    scenes = []
    for i in range(24):
        duration = 5 + (i * 7) % 5
        level = 0.6 if i % 4 == 1 else 0.08 + 0.02 * (i % 3)
        scenes.append((float(duration), level))
    return scenes
