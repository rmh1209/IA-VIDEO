"""Appels à FFmpeg / FFprobe."""

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path


class FFmpegError(RuntimeError):
    pass


def require_ffmpeg() -> None:
    missing = [tool for tool in ("ffmpeg", "ffprobe") if shutil.which(tool) is None]
    if missing:
        raise FFmpegError(
            f"FFmpeg est introuvable ({', '.join(missing)}). Installe-le : "
            "Windows « winget install Gyan.FFmpeg », Mac « brew install ffmpeg », "
            "puis rouvre le terminal."
        )


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    """Lance une commande et lève FFmpegError avec la fin du journal si elle échoue."""
    proc = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        tail = "\n".join(proc.stderr.strip().splitlines()[-15:])
        raise FFmpegError(f"Échec de {Path(cmd[0]).name} :\n{tail}")
    return proc


@dataclass
class MediaInfo:
    duration: float
    width: int
    height: int
    fps: float
    has_audio: bool

    @property
    def aspect(self) -> float:
        return self.width / self.height


def probe(path: Path) -> MediaInfo:
    proc = run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)]
    )
    data = json.loads(proc.stdout)
    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    if video is None:
        raise FFmpegError(f"Aucune piste vidéo dans {path}")

    width, height = int(video["width"]), int(video["height"])
    sar = _parse_ratio(video.get("sample_aspect_ratio"), default=1.0)
    if sar > 0:
        width = round(width * sar)
    rotation = 0
    for side_data in video.get("side_data_list") or []:
        if "rotation" in side_data:
            rotation = int(float(side_data["rotation"]))
    if abs(rotation) % 180 == 90:
        width, height = height, width

    duration = float(data.get("format", {}).get("duration") or video.get("duration") or 0.0)
    fps = _parse_ratio(video.get("avg_frame_rate"), default=0.0) or _parse_ratio(
        video.get("r_frame_rate"), default=30.0
    )
    return MediaInfo(
        duration=duration,
        width=width,
        height=height,
        fps=fps,
        has_audio=any(s.get("codec_type") == "audio" for s in streams),
    )


def _parse_ratio(value: str | None, default: float) -> float:
    if not value:
        return default
    num, _, den = value.replace(":", "/").partition("/")
    try:
        result = float(num) / float(den or 1)
    except (ValueError, ZeroDivisionError):
        return default
    return result if result > 0 else default
