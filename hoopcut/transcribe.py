"""Transcription des commentaires avec Whisper (whisper.cpp), sur le processeur, en arrière-plan.

Le modèle vidéo local n'entend pas : les paroles des commentateurs (noms des joueurs, « quel dunk ! »)
lui sont données sous forme de texte horodaté. Whisper tourne pendant que la carte graphique analyse
la vidéo ; chaque fenêtre attend seulement que la transcription l'ait dépassée.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import threading
import time
from dataclasses import dataclass
from pathlib import Path

from .engines import LocalPaths
from .ffmpeg_utils import run
from .text_utils import fold

_LINE = re.compile(r"\[(\d+):(\d+):(\d+(?:\.\d+)?)\s*-->\s*(\d+):(\d+):(\d+(?:\.\d+)?)\]\s*(.*)")
# Phrases que Whisper invente sur la musique ou le silence
_NOISE = ("sous-titres", "sous-titrage", "amara.org", "merci d'avoir regarde", "thanks for watching",
          "subtitles by", "abonnez-vous", "like and subscribe")


@dataclass
class Segment:
    start: float
    end: float
    text: str


def _seconds(h: str, m: str, s: str) -> float:
    return int(h) * 3600 + int(m) * 60 + float(s)


def clean(start: float, end: float, text: str) -> Segment | None:
    text = text.strip()
    if not text or text.startswith(("[", "(", "♪", "*")) or any(n in fold(text) for n in _NOISE):
        return None
    return Segment(round(start, 2), round(end, 2), text)


def parse_line(line: str) -> Segment | None:
    match = _LINE.search(line)
    if not match:
        return None
    return clean(_seconds(*match.group(1, 2, 3)), _seconds(*match.group(4, 5, 6)), match.group(7))


def load_whisper_json(path: Path) -> tuple[list[Segment], str | None]:
    """Fichier JSON écrit par whisper-cli (-oj) : segments horodatés en millisecondes."""
    data = json.loads(path.read_text(encoding="utf-8", errors="replace"))
    segments = []
    for item in data.get("transcription", []):
        offsets = item.get("offsets", {})
        segment = clean(offsets.get("from", 0) / 1000, offsets.get("to", 0) / 1000, item.get("text", ""))
        if segment:
            segments.append(segment)
    return drop_loops(segments), data.get("result", {}).get("language")


def drop_loops(segments: list[Segment], repeats: int = 4, within: float = 30.0) -> list[Segment]:
    """Whisper part parfois en boucle sur la musique ou la foule (« What a play. » toutes les secondes).
    Une phrase répétée au moins `repeats` fois en moins de `within` s est inventée : on la retire."""
    looped: set[int] = set()
    for i, segment in enumerate(segments):
        text = fold(segment.text)
        same = [j for j in range(i, len(segments))
                if segments[j].start - segment.start <= within and fold(segments[j].text) == text]
        if len(same) >= repeats:
            looped.update(same)
    return [s for i, s in enumerate(segments) if i not in looped]


class Transcriber:
    """Lance whisper-cli dans un fil d'exécution et lit ses résultats au fur et à mesure."""

    def __init__(self, paths: LocalPaths, video: Path, work_dir: Path, duration: float, hint: str = ""):
        self.paths, self.video, self.duration, self.hint = paths, video, duration, hint
        self.output = work_dir / "transcription"  # whisper-cli y ajoute « .json »
        self.wav = work_dir / "audio_16k.wav"
        self.segments: list[Segment] = []
        self.progress = 0.0  # secondes d'audio déjà transcrites
        self.error: str | None = None
        self.language: str | None = None
        self._done = threading.Event()
        self._process: subprocess.Popen | None = None

    @property
    def cache(self) -> Path:
        return self.output.with_suffix(".json")

    def start(self) -> "Transcriber":
        if self.cache.exists():
            try:
                self.segments, self.language = load_whisper_json(self.cache)
                self.progress = self.duration
                self._done.set()
                return self
            except ValueError:
                self.cache.unlink()
        threading.Thread(target=self._run, name="whisper", daemon=True).start()
        return self

    def _run(self) -> None:
        try:
            if not self.wav.exists():
                run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-i", str(self.video), "-vn", "-ac", "1",
                     "-ar", "16000", "-c:a", "pcm_s16le", str(self.wav)])
            threads = max(2, (os.cpu_count() or 4) // 2)
            # -bs 1 : décodage glouton, 2 fois plus rapide ; -mc 0 : Whisper ne se relit pas, ce qui évite
            # les boucles sur la musique ; -ml 80 -sow : phrases courtes, donc mieux situées dans le temps
            cmd = [str(self.paths.whisper_cli), "-m", str(self.paths.whisper_model), "-f", str(self.wav),
                   "-l", "auto", "-t", str(threads), "-bs", "1", "-mc", "0", "-ml", "80", "-sow", "-np",
                   "-oj", "-of", str(self.output)]
            if self.hint:  # le titre aide Whisper à bien écrire les noms d'équipes et de joueurs
                cmd += ["--prompt", self.hint[:200]]
            flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
            self._process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                                             encoding="utf-8", errors="replace", creationflags=flags)
            stderr_lines: list[str] = []
            reader = threading.Thread(target=lambda: stderr_lines.extend(self._process.stderr), daemon=True)
            reader.start()
            for line in self._process.stdout:
                match = _LINE.search(line)
                if match:
                    self.progress = _seconds(*match.group(4, 5, 6))
                segment = parse_line(line)
                if segment:
                    self.segments.append(segment)
            code = self._process.wait()
            reader.join(timeout=5)
            if code != 0:
                self.error = "\n".join(line.strip() for line in stderr_lines[-5:]) or f"code {code}"
                return
            if self.cache.exists():
                self.segments, self.language = load_whisper_json(self.cache)
            else:
                self.segments = drop_loops(self.segments)
            self.progress = self.duration
        except Exception as exc:  # la transcription est un plus : son échec ne doit pas arrêter l'analyse
            self.error = str(exc)
        finally:
            self._done.set()

    def wait_until(self, t: float, timeout: float) -> bool:
        """Attend que la transcription ait dépassé l'instant t (ou soit finie). Vrai si c'est le cas."""
        deadline = time.monotonic() + timeout
        while not self._done.is_set() and self.progress < t:
            if time.monotonic() > deadline:
                return False
            self._done.wait(0.5)
        return True

    @property
    def done(self) -> bool:
        return self._done.is_set()

    def between(self, a: float, b: float) -> list[Segment]:
        return drop_loops([s for s in self.segments if s.end > a and s.start < b])

    def stop(self) -> None:
        if self._process and self._process.poll() is None:
            self._process.kill()
