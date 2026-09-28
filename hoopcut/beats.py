"""Musique calée sur le rythme : les changements de clip tombent sur les temps de la musique.

La musique est lue par FFmpeg (mono, 11 025 Hz). Chaque attaque (grosse caisse, caisse claire) fait
bondir l'énergie des aigus : le tempo est la période qui revient le plus souvent (autocorrélation),
puis les temps sont suivis un à un par programmation dynamique (méthode d'Ellis, 2007), ce qui suit
les petites variations. Une musique sans tempo net (ambiance, piano libre) n'est pas recalée.

Ensuite, la fin de chaque clip bouge d'au plus 0,3 s pour que le changement de clip tombe sur un
temps : jamais au-delà d'un changement de plan ou d'un ralenti, jamais au point de couper le geste.
"""

from __future__ import annotations

import math
import subprocess
from array import array
from dataclasses import dataclass
from pathlib import Path

from .select import FRAME, EditPlan

RATE = 11025
HOP = 256  # une mesure d'énergie toutes les 23 ms
TEMPO_RANGE = (70.0, 180.0)  # battements par minute
SNAP = 0.3  # recalage maximal d'une fin de clip (s)
MIN_CONFIDENCE = 1.6  # attaque moyenne sur les temps / attaque moyenne : en dessous, tempo trop flou
MIN_ATTACK = 0.25  # attaque moyenne sur les temps (hausse d'énergie en log) : en dessous, pas de percussions


@dataclass
class Beats:
    times: list[float]  # temps de la musique (s)
    period: float  # durée d'un temps (s)
    confidence: float  # netteté du rythme (1 = aucun, 2 et plus = très net)
    loop: float | None = None  # durée du morceau s'il a été analysé en entier (il boucle sous un short plus long)

    def in_short(self, start: float, horizon: float) -> list[float]:
        """Temps de la musique dans le temps du short, quand le short commence à `start` dans la musique.
        Un morceau trop court reprend du début (le montage le fait boucler)."""
        times = [t - start for t in self.times if t >= start]
        if self.loop:
            offset = self.loop - start
            while offset < horizon:
                times += [offset + t for t in self.times]
                offset += self.loop
        return [t for t in times if t <= horizon]

    @property
    def bpm(self) -> float:
        return 60.0 / self.period


def detect_beats(music: Path, limit: float = 180.0) -> Beats | None:
    """Temps de la musique (sur ses `limit` premières secondes), ou None sans rythme net."""
    # Deux bandes : les graves (grosse caisse, sous 150 Hz) et les aigus (caisse claire, charleston,
    # au-dessus de 3 kHz). Le milieu, où tiennent les accords et les voix, brouille les attaques.
    bands = ("[0:a]aformat=channel_layouts=mono,aresample=11025,asplit=2[a][b];"
             "[a]lowpass=f=150,lowpass=f=150[grave];[b]highpass=f=3000,highpass=f=3000[aigu];"
             "[grave][aigu]join=inputs=2:channel_layout=stereo[out]")
    try:
        pcm = subprocess.run(
            ["ffmpeg", "-hide_banner", "-nostdin", "-loglevel", "error", "-t", f"{limit:.1f}", "-i", str(music),
             "-vn", "-filter_complex", bands, "-map", "[out]", "-ar", str(RATE), "-f", "s16le", "-"],
            capture_output=True, check=True,
        ).stdout
    except (OSError, subprocess.CalledProcessError):
        return None
    samples = array("h")
    samples.frombytes(pcm[: len(pcm) - len(pcm) % 4])
    envelope = onset_envelope(samples)
    if len(envelope) < 200:
        return None
    lag = _tempo(envelope)
    frames = _track(envelope, lag)
    frames, lag = _strong_beats(envelope, frames, lag)
    if len(frames) < 8:
        return None
    mean = sum(envelope) / len(envelope) or 1e-9
    on_beats = sum(envelope[f] for f in frames) / len(frames)
    confidence = on_beats / mean
    # Tempo net (les temps ressortent du reste) et vraies attaques (pas de simples ondulations d'un son tenu)
    if confidence < MIN_CONFIDENCE or on_beats < MIN_ATTACK:
        return None
    length = len(samples) / 2 / RATE
    # Une attaque apparaît dans la première fenêtre qui la contient : en moyenne 1,5 mesure après son début
    return Beats([round((f + 1.5) * HOP / RATE, 3) for f in frames], lag * HOP / RATE, round(confidence, 2),
                 loop=round(length, 3) if length < limit - 1 else None)


def onset_envelope(samples: array) -> list[float]:
    """Force des attaques toutes les 23 ms, à partir des deux bandes entrelacées (graves, aigus) :
    hausse de l'énergie, en log, de chaque bande sur une fenêtre de 46 ms (0,7 = énergie doublée)."""
    bands = []
    for channel in (samples[0::2], samples[1::2]):
        power = [v * v for v in channel]
        levels = [math.log1p(sum(power[start:start + 2 * HOP]) / (2 * HOP))
                  for start in range(0, len(power) - 2 * HOP + 1, HOP)]
        rises = [max(0.0, b - a) for a, b in zip(levels[:1] + levels[:-1], levels)]
        # chaque bande pèse autant : une charleston très présente ne doit pas cacher la grosse caisse
        typical = sorted(rises)[int(0.95 * (len(rises) - 1))] if rises else 0.0
        bands.append([r / typical for r in rises] if typical > 0 else rises)
        bands[-1].append(max(rises, default=0.0))  # hausse brute la plus forte, retirée plus bas
    strongest = max(bands[0].pop(), bands[1].pop())
    envelope = [a + b for a, b in zip(*bands)]
    # garde-fou : un son tenu n'a que de petites ondulations, même une fois les bandes égalisées
    return envelope if strongest >= 0.5 else [0.0] * len(envelope)


def _strong_beats(envelope: list[float], frames: list[int], lag: float) -> tuple[list[int], float]:
    """Si un temps sur deux est nettement plus fort (grosse caisse contre charleston), on ne garde que
    les forts : couper sur un contretemps sonne faux."""
    if len(frames) < 16 or 2 * lag * HOP / RATE > 60 / 60:  # pas en dessous de 60 battements/min
        return frames, lag
    even = sum(envelope[f] for f in frames[0::2]) / len(frames[0::2])
    odd = sum(envelope[f] for f in frames[1::2]) / len(frames[1::2])
    if min(even, odd) < 0.6 * max(even, odd):
        return (frames[0::2] if even >= odd else frames[1::2]), 2 * lag
    return frames, lag


def _tempo(envelope: list[float]) -> float:
    """Période des temps (en mesures de 23 ms), préférant les tempos proches de 120 battements/min."""
    seconds = HOP / RATE
    low, high = int(60 / TEMPO_RANGE[1] / seconds), int(math.ceil(60 / TEMPO_RANGE[0] / seconds))
    # Attaques étalées sur quelques mesures : une période tombant entre deux mesures (23,5) reste visible
    kernel = (1, 2, 3, 2, 1)
    padded = [0.0, 0.0, *envelope, 0.0, 0.0]
    smooth = [sum(w * padded[i + j] for j, w in enumerate(kernel)) / 9 for i in range(len(envelope))]
    mean = sum(smooth) / len(smooth)
    centered = [v - mean for v in smooth]
    correlation = {}

    def correlate(lag: int) -> float:
        if lag not in correlation:
            correlation[lag] = (sum(a * b for a, b in zip(centered, centered[lag:])) / (len(centered) - lag)
                                if lag < len(centered) // 2 else 0.0)
        return correlation[lag]

    scores = {}
    for lag in range(low, high + 1):
        # peigne : la vraie période revient aussi à 2, 3 et 4 fois sa durée (écarte les tempos à ×2/3, ×4/3)
        comb = sum(correlate(k * lag) / k for k in range(1, 5))
        bpm = 60 / (lag * seconds)
        scores[lag] = comb * math.exp(-0.5 * (math.log2(bpm / 120) / 0.9) ** 2)
    best = max(scores, key=scores.get)
    # Affinage entre deux mesures (parabole passant par les trois scores voisins)
    left, right = scores.get(best - 1), scores.get(best + 1)
    if left is not None and right is not None:
        curve = left - 2 * scores[best] + right
        if curve < 0:
            return best + 0.5 * (left - right) / curve
    return float(best)


def _track(envelope: list[float], lag: float, tightness: float = 100.0) -> list[int]:
    """Suite de temps qui colle aux attaques en gardant un écart proche de `lag` (Ellis, 2007)."""
    n = len(envelope)
    span = range(max(1, round(lag / 2)), round(2 * lag) + 1)
    penalty = {d: -tightness * math.log(d / lag) ** 2 for d in span}
    peak = max(envelope) or 1.0
    score = [v / peak for v in envelope]
    back = [-1] * n
    for t in range(n):
        best, where = -math.inf, -1
        for d in span:
            if d > t:
                break
            value = score[t - d] + penalty[d]
            if value > best:
                best, where = value, t - d
        if where >= 0 and best > 0:
            score[t] += best
            back[t] = where
    end = max(range(max(0, n - round(lag)), n), key=score.__getitem__)
    frames = []
    while end >= 0:
        frames.append(end)
        end = back[end]
    return frames[::-1]


def sync_to_beats(plan: EditPlan, beats: Beats, limits: list[float], duration: float, max_total: float) -> float:
    """Recale les fins de clips sur les temps ; renvoie l'instant de la musique où le short commence.

    `limits` : changements de plan et débuts de ralentis, que la fin d'un clip ne doit pas franchir."""
    clips = plan.clips
    fade = plan.transition
    if len(clips) < 2:
        return 0.0
    start = beats.times[0]  # la musique démarre sur un temps
    beat_times = beats.in_short(start, plan.total + 2 * SNAP)
    elapsed = 0.0
    for index, clip in enumerate(clips[:-1]):
        elapsed += clip.duration - fade
        cut = elapsed + fade / 2  # milieu du fondu : là où l'œil voit le changement
        if not beat_times or cut > beat_times[-1] + SNAP:  # au-delà des temps connus : on s'arrête là
            break
        after = next((t for t in beat_times if t >= cut), None)
        before = next((t for t in reversed(beat_times) if t <= cut), None)
        options = sorted((t - cut for t in (before, after) if t is not None), key=abs)
        for shift in options:
            if abs(shift) > SNAP or plan.total + shift > max_total:
                continue
            if _can_move_end(clip, shift, limits, duration):
                clip.end = round(clip.end + shift, 3)
                elapsed += shift
                break
    return round(start, 3)


def _can_move_end(clip, shift: float, limits: list[float], duration: float) -> bool:
    end = clip.end + shift
    if shift < 0:
        # on garde le geste et une seconde de réaction, et un clip assez long pour être lu
        return end >= clip.moment.key + 1.0 and end - clip.start >= 2.0
    return end <= duration and not any(clip.end - FRAME < limit <= end + FRAME for limit in limits)
