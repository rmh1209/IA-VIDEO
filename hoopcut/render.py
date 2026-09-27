"""Montage final avec FFmpeg : 1080x1920, vidéo centrée sur fond flouté, habillage, fondus, musique.

Étape 1 : chaque clip est rendu séparément au format vertical, avec son habillage PNG.
Étape 2 : les clips sont enchaînés avec des fondus, la musique est mixée sous le son
d'origine et le volume est normalisé pour les réseaux sociaux (-14 LUFS).
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from .ffmpeg_utils import MediaInfo, probe, run
from .overlay import OverlayContent, draw_overlay
from .select import EditPlan

# Nom de l'option -> transition FFmpeg (filtre xfade)
TRANSITIONS = {"fondu": "fade", "flash": "fadewhite", "glisse": "slideleft", "aucune": "none"}
AUDIO_EXTENSIONS = {".mp3", ".m4a", ".aac", ".wav", ".ogg", ".flac", ".opus"}


@dataclass
class RenderSettings:
    width: int = 1080
    height: int = 1920
    fps: int = 30
    zoom: float = 1.0  # > 1 : rogne les côtés de la vidéo pour agrandir l'action
    background: str = "flou"  # flou | noir
    transition: str = "fade"  # transition xfade, ou "none"
    music: Path | None = None
    music_volume: float = 0.35
    original_volume: float = 1.0
    accent: str = "#FF7A00"
    crf: int = 19
    preset: str = "medium"
    max_video_height: int = 1150  # garde de la place pour le titre et le score


@dataclass
class Layout:
    video_width: int
    video_height: int
    top: int

    @property
    def bottom(self) -> int:
        return self.top + self.video_height


def compute_layout(info: MediaInfo, rs: RenderSettings) -> Layout:
    """Taille et position de la vidéo, centrée sans remplir tout l'écran vertical."""
    aspect = info.aspect / max(rs.zoom, 1.0)
    width = rs.width
    height = round(width / aspect)
    if height > rs.max_video_height:
        height = rs.max_video_height
        width = round(height * aspect)
    width -= width % 2
    height -= height % 2
    top = (rs.height - height) // 2
    return Layout(width, height, top - top % 2)


def pick_music(path: Path | None) -> Path | None:
    """Un fichier audio, ou un morceau tiré au hasard dans un dossier."""
    if path is None:
        return None
    if path.is_dir():
        tracks = sorted(p for p in path.iterdir() if p.suffix.lower() in AUDIO_EXTENSIONS)
        return random.choice(tracks) if tracks else None
    return path if path.is_file() else None


def render_plan(
    plan: EditPlan,
    source: Path,
    info: MediaInfo,
    overlays: list[OverlayContent],
    out: Path,
    work_dir: Path,
    rs: RenderSettings,
    log: Callable = print,
) -> Path:
    layout = compute_layout(info, rs)
    segment_dir = work_dir / "segments"
    segment_dir.mkdir(parents=True, exist_ok=True)
    for old in segment_dir.glob("*"):
        old.unlink()

    segments, durations = [], []
    for index, (clip, content) in enumerate(zip(plan.clips, overlays), start=1):
        log(f"      Clip {index}/{len(plan.clips)}")
        png = draw_overlay(
            segment_dir / f"habillage_{index:02d}.png",
            content,
            video_top=layout.top,
            video_bottom=layout.bottom,
            accent=rs.accent,
            size=(rs.width, rs.height),
        )
        segment = segment_dir / f"clip_{index:02d}.mp4"
        _render_segment(source, info, clip.start, clip.duration, png, segment, layout, rs)
        segments.append(segment)
        durations.append(probe(segment).duration)

    log("      Assemblage, fondus et musique…")
    out.parent.mkdir(parents=True, exist_ok=True)
    _assemble(segments, durations, out, rs, plan.transition)
    return out


def _render_segment(
    source: Path, info: MediaInfo, start: float, duration: float, png: Path, out: Path, layout: Layout,
    rs: RenderSettings,
) -> None:
    zoom = max(rs.zoom, 1.0)
    crop = f"crop=trunc(iw/{zoom:.4f}/2)*2:ih," if zoom > 1.0 else ""
    head = f"[0:v]scale=trunc(iw*sar/2)*2:ih,setsar=1,fps={rs.fps}"
    foreground = f"[fgsrc]{crop}scale={layout.video_width}:{layout.video_height}:flags=lanczos,setsar=1[fg]"
    if rs.background == "flou":
        graph = [
            f"{head},split=2[bgsrc][fgsrc]",
            "[bgsrc]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,gblur=sigma=10,"
            f"eq=brightness=-0.12:saturation=1.2,scale={rs.width}:{rs.height}:flags=bicubic,setsar=1[bg]",
            foreground,
        ]
    else:
        graph = [
            f"{head}[fgsrc]",
            f"color=c=0x0E0E12:s={rs.width}x{rs.height}:r={rs.fps}:d={duration:.3f}[bg]",
            foreground,
        ]
    graph += [
        f"[bg][fg]overlay=x=(W-w)/2:y={layout.top}:shortest=1[base]",
        "[base][1:v]overlay=0:0:eof_action=repeat,format=yuv420p[v]",
    ]
    fade = min(0.06, duration / 4)
    if info.has_audio:
        graph.append(
            "[0:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,"
            f"afade=t=in:st=0:d={fade:.3f},afade=t=out:st={duration - fade:.3f}:d={fade:.3f}[a]"
        )
    else:
        graph.append(f"anullsrc=r=48000:cl=stereo,atrim=0:{duration:.3f}[a]")

    run(
        [
            "ffmpeg", "-hide_banner", "-nostdin", "-y",
            "-ss", f"{start:.3f}", "-t", f"{duration:.3f}", "-i", str(source),
            # l'habillage est fixe : une image par seconde suffit, le filtre overlay la répète
            "-loop", "1", "-framerate", "1", "-t", f"{duration:.3f}", "-i", str(png),
            "-filter_complex", ";".join(graph),
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", "-r", str(rs.fps),
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
            "-t", f"{duration:.3f}", str(out),
        ]
    )


def _assemble(segments: list[Path], durations: list[float], out: Path, rs: RenderSettings, fade: float) -> None:
    count = len(segments)
    use_xfade = rs.transition != "none" and count > 1 and fade > 0
    overlap = fade if use_xfade else 0.0
    total = sum(durations) - overlap * (count - 1)

    cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-y"]
    for segment in segments:
        cmd += ["-i", str(segment)]
    graph = []
    for i in range(count):
        graph.append(f"[{i}:v]settb=AVTB,setpts=PTS-STARTPTS,fps={rs.fps},format=yuv420p[v{i}]")
        graph.append(f"[{i}:a]asetpts=PTS-STARTPTS[a{i}]")

    video, audio = "v0", "a0"
    if count > 1 and not use_xfade:
        graph.append("".join(f"[v{i}][a{i}]" for i in range(count)) + f"concat=n={count}:v=1:a=1[vcat][acat]")
        video, audio = "vcat", "acat"
    elif use_xfade:
        offset = 0.0
        for i in range(1, count):
            offset += durations[i - 1] - overlap
            graph.append(
                f"[{video}][v{i}]xfade=transition={rs.transition}:duration={overlap:.3f}:offset={offset:.3f}[vx{i}]"
            )
            graph.append(f"[{audio}][a{i}]acrossfade=d={overlap:.3f}:c1=tri:c2=tri[ax{i}]")
            video, audio = f"vx{i}", f"ax{i}"

    ending = min(0.5, total / 10)
    graph.append(f"[{video}]fade=t=out:st={total - ending:.3f}:d={ending:.3f}[vout]")
    graph.append(f"[{audio}]volume={rs.original_volume:.3f}[orig]")
    mix = "orig"
    if rs.music:
        cmd += ["-stream_loop", "-1", "-i", str(rs.music)]
        graph.append(
            f"[{count}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,"
            f"atrim=0:{total:.3f},asetpts=PTS-STARTPTS,volume={rs.music_volume:.3f},"
            f"afade=t=in:st=0:d=1,afade=t=out:st={max(0.0, total - 2.5):.3f}:d=2.5[music]"
        )
        graph.append("[orig][music]amix=inputs=2:duration=first:dropout_transition=0[mix]")
        mix = "mix"
    graph.append(
        f"[{mix}]afade=t=out:st={total - ending:.3f}:d={ending:.3f},"
        "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]"
    )

    cmd += [
        "-filter_complex", ";".join(graph),
        "-map", "[vout]", "-map", "[aout]",
        "-c:v", "libx264", "-preset", rs.preset, "-crf", str(rs.crf), "-profile:v", "high",
        "-pix_fmt", "yuv420p", "-r", str(rs.fps),
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-movflags", "+faststart", "-t", f"{total:.3f}", str(out),
    ]
    run(cmd)
