"""Choix des clips : les meilleurs moments, pour une durée totale de 60 à 80 secondes.

1. Chaque moment devient un clip centré sur le geste décisif (élan avant, réaction après),
   calé sur les changements de plan et sans jamais déborder sur un ralenti.
2. Chaque clip reçoit une valeur (spectacle, importance, focus, variété).
3. Un « sac à dos » (programmation dynamique) choisit la combinaison de clips la plus forte
   dont la durée totale, fondus compris, tombe dans la fourchette demandée.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Callable

from .models import Analysis, Moment
from .text_utils import fold, matches_any, same_name

FRAME = 0.04  # environ une image de marge autour d'un changement de plan
MAX_ITEMS = 200


@dataclass
class SelectionSettings:
    min_total: float = 60.0
    max_total: float = 80.0
    target: float = 70.0
    min_clip: float = 3.0
    max_clip: float = 9.0
    pre_roll: float = 4.5  # secondes gardées avant le geste décisif
    post_roll: float = 2.0  # secondes gardées après
    transition: float = 0.3  # durée des fondus (les clips se chevauchent d'autant)
    order: str = "auto"  # auto | chrono | crescendo | accroche
    focus_teams: list[str] = field(default_factory=list)
    focus_players: list[str] = field(default_factory=list)
    snap_window: float = 1.2  # distance max pour caler une coupe sur un changement de plan
    cost_per_second: float = 0.55  # un clip n'entre que s'il « vaut » plus que le temps qu'il occupe
    single_shot: bool = False  # clip limité au plan du geste décisif (compilation : un plan = une action)
    min_spectacular: int = 0  # si assez d'actions atteignent cette note, les autres sont laissées de côté

    @property
    def focus(self) -> bool:
        return bool(self.focus_teams or self.focus_players)


@dataclass
class Clip:
    start: float
    end: float
    moment: Moment
    value: float = 0.0
    focus: bool = True

    @property
    def duration(self) -> float:
        return self.end - self.start


@dataclass
class EditPlan:
    clips: list[Clip]
    transition: float
    warnings: list[str] = field(default_factory=list)

    @property
    def total(self) -> float:
        if not self.clips:
            return 0.0
        return sum(c.duration for c in self.clips) - self.transition * (len(self.clips) - 1)


def select_clips(analysis: Analysis, cuts: list[float], settings: SelectionSettings) -> EditPlan:
    warnings: list[str] = []
    cuts = sorted(cuts)
    candidates = _candidates(analysis, cuts, settings, settings.pre_roll, settings.post_roll, slack=0.0)
    chosen, filled = _choose(candidates, settings)
    if chosen is None:
        # Pas assez de matière : clips plus longs (plus d'élan avant, plus de réaction après),
        # quitte à déborder un peu des bornes données par l'IA, sans franchir de changement de plan
        candidates = _candidates(
            analysis, cuts, settings, settings.pre_roll + 2.5, settings.post_roll + 1.5, slack=2.5
        )
        chosen, filled = _choose(candidates, settings)
    if filled:
        warnings.append(
            "Pas assez d'actions du joueur ou de l'équipe choisis : d'autres actions complètent la vidéo."
        )
    if chosen is None:
        chosen = _take_best_within_max(candidates, settings)
        plan = EditPlan(clips=chosen, transition=settings.transition)
        warnings.append(
            f"La vidéo source ne contient pas assez d'actions pour atteindre {settings.min_total:.0f} s "
            f"(durée obtenue : {plan.total:.0f} s)."
        )
    return EditPlan(clips=_order(chosen, analysis, settings), transition=settings.transition, warnings=warnings)


def _candidates(
    analysis: Analysis, cuts: list[float], s: SelectionSettings, pre: float, post: float, slack: float
) -> list[Clip]:
    replays = [m for m in analysis.moments if m.replay]
    clips = []
    for moment in analysis.moments:
        if moment.replay:
            continue
        clip = _window(moment, cuts, replays, analysis.source_duration, s, pre, post, slack)
        if clip is not None:
            clip.focus = _is_focus(moment, s)
            clips.append(clip)
    _score(clips, analysis, s)
    return _dedupe(clips, s)


def _is_focus(m: Moment, s: SelectionSettings) -> bool:
    if not s.focus:
        return True
    if any(same_name(m.team, team) for team in s.focus_teams):
        return True
    return matches_any(m.player, s.focus_players) or matches_any(m.description, s.focus_players)


def _window(
    m: Moment,
    cuts: list[float],
    replays: list[Moment],
    duration: float,
    s: SelectionSettings,
    pre: float,
    post: float,
    slack: float,
) -> Clip | None:
    key = min(max(m.key, m.start), m.end)
    low, high = _bounds(m, cuts, duration, slack)
    shot = _shot(key, cuts, duration) if s.single_shot else None
    if shot:
        low, high = max(low, shot[0]), min(high, shot[1])
    start = max(low, key - pre)
    end = min(high, key + post)
    start = _snap_start(start, key, cuts, s.snap_window)
    end = _snap_end(end, key, cuts, s.snap_window)
    for replay in replays:  # ne jamais déborder sur un ralenti
        if key < replay.start < end:
            end = replay.start - FRAME
        if start < replay.end <= key:
            start = replay.end + FRAME
    if end - start > s.max_clip:
        start = end - s.max_clip
    if end - start < s.min_clip:
        start, end = _widen(start, end, *_bounds(m, cuts, duration, max(slack, 1.5)), s.min_clip)
        if shot:  # même élargi, le clip ne sort pas du plan de l'action
            start, end = max(start, shot[0]), min(end, shot[1])
    if end - start < 0.8 * s.min_clip:
        return None
    return Clip(start=round(start, 2), end=round(end, 2), moment=m)


def _shot(key: float, cuts: list[float], duration: float, shortest: float = 2.4) -> tuple[float, float] | None:
    """Le plan qui contient le geste décisif, s'il dure assez longtemps pour faire un clip à lui seul."""
    begin = max((c for c in cuts if c <= key - 0.2), default=0.0)
    finish = min((c for c in cuts if c >= key + 0.2), default=duration)
    if finish - begin < shortest:
        return None
    return begin + FRAME, finish - FRAME


def _bounds(m: Moment, cuts: list[float], duration: float, slack: float) -> tuple[float, float]:
    """Bornes de l'action données par l'IA, élargies de `slack` s sans franchir de changement de plan."""
    low, high = max(0.0, m.start - slack), min(duration, m.end + slack)
    if slack > 0:
        before = [c for c in cuts if low < c <= m.start]
        after = [c for c in cuts if m.end <= c < high]
        if before:
            low = before[-1] + FRAME
        if after:
            high = after[0] - FRAME
    return min(low, max(0.0, m.start)), max(high, min(duration, m.end))


def _snap_start(start: float, key: float, cuts: list[float], window: float) -> float:
    """Un changement de plan juste après le début : on démarre sur le nouveau plan."""
    limit = min(start + window, key - 1.0)
    for cut in cuts:
        if start < cut <= limit:
            return cut + FRAME
    return start


def _snap_end(end: float, key: float, cuts: list[float], window: float) -> float:
    """Un changement de plan juste avant la fin : on s'arrête avant pour ne pas montrer l'action suivante."""
    floor = max(end - window, key + 0.6)
    inside = [cut for cut in cuts if floor <= cut < end]
    return inside[-1] - FRAME if inside else end


def _widen(start: float, end: float, low: float, high: float, target: float) -> tuple[float, float]:
    end = min(high, end + 0.4 * (target - (end - start)))
    start = max(low, start - (target - (end - start)))
    end = min(high, end + max(0.0, target - (end - start)))
    return start, end


def _score(clips: list[Clip], analysis: Analysis, s: SelectionSettings) -> None:
    for clip in clips:
        m = clip.moment
        value = 0.65 * m.spectacular + 0.35 * m.importance
        if analysis.video_type == "match" and m.start >= 0.85 * analysis.source_duration and m.importance >= 7:
            value += 1.5  # le dénouement du match
        if not clip.focus:
            value *= 0.5
        clip.value = value
    if not s.focus_players:
        _diminish(clips, lambda c: fold(c.moment.player), 0.85)
    _diminish(clips, lambda c: "" if c.moment.action == "other" else c.moment.action, 0.93)
    if analysis.video_type == "match" and not s.focus:
        _diminish(clips, lambda c: fold(c.moment.team), 0.97)


def _diminish(clips: list[Clip], group_of: Callable[[Clip], str], factor: float) -> None:
    """Rendements décroissants : la 2e action d'un même joueur (ou type) compte un peu moins, etc."""
    groups: dict[str, list[Clip]] = {}
    for clip in clips:
        group = group_of(clip)
        if group:
            groups.setdefault(group, []).append(clip)
    for members in groups.values():
        members.sort(key=lambda c: c.value, reverse=True)
        for rank, clip in enumerate(members):
            clip.value *= factor**rank


def _dedupe(clips: list[Clip], s: SelectionSettings) -> list[Clip]:
    """Supprime les doublons (même action listée deux fois) et rogne les chevauchements."""
    kept: list[Clip] = []
    for clip in sorted(clips, key=lambda c: c.value, reverse=True):
        duplicate = False
        for other in kept:
            overlap = min(clip.end, other.end) - max(clip.start, other.start)
            if overlap <= 0:
                continue
            if overlap >= 0.4 * min(clip.duration, other.duration):
                duplicate = True
                break
            if clip.start < other.start:
                clip.end = other.start - FRAME
            else:
                clip.start = other.end + FRAME
        key_inside = clip.start + 0.5 <= clip.moment.key <= clip.end - 0.2
        if not duplicate and key_inside and clip.duration >= 0.8 * s.min_clip:
            kept.append(clip)
    return kept


def _choose(candidates: list[Clip], s: SelectionSettings) -> tuple[list[Clip] | None, bool]:
    """Renvoie (clips choisis ou None, vrai si des actions hors focus ont servi de complément).
    Avec `min_spectacular`, on essaie d'abord de remplir le short avec les seules actions assez spectaculaires."""
    pools = [candidates]
    strong = [c for c in candidates if c.moment.spectacular >= s.min_spectacular]
    if s.min_spectacular and strong and len(strong) < len(candidates):
        pools.insert(0, strong)
    for pool in pools:
        chosen = _knapsack([c for c in pool if c.focus], s)
        if chosen is not None:
            return chosen, False
    if s.focus:
        for pool in pools:
            chosen = _knapsack(pool, s)
            if chosen is not None:
                return chosen, True
    return None, False


def _knapsack(items: list[Clip], s: SelectionSettings) -> list[Clip] | None:
    """Meilleure combinaison de clips dont la durée totale tombe entre min_total et max_total."""
    if not items:
        return None
    items = sorted(items, key=lambda c: c.value, reverse=True)[:MAX_ITEMS]
    unit, fade = 0.1, s.transition
    # total = somme des (durée - fondu) + fondu ; petite marge pour les arrondis à l'image près
    low = max(0, math.ceil((s.min_total + 0.3 - fade) / unit))
    high = math.floor((s.max_total - 0.3 - fade) / unit)
    if high < low:
        return None
    weights = [max(1, round((c.duration - fade) / unit)) for c in items]
    gains = [c.value - s.cost_per_second * c.duration for c in items]

    unreachable = float("-inf")
    best = [unreachable] * (high + 1)
    best[0] = 0.0
    took = [bytearray(high + 1) for _ in items]
    for i, (weight, gain) in enumerate(zip(weights, gains)):
        row = took[i]
        for cap in range(high, weight - 1, -1):
            previous = best[cap - weight]
            if previous != unreachable and previous + gain > best[cap]:
                best[cap] = previous + gain
                row[cap] = 1

    feasible = [cap for cap in range(low, high + 1) if best[cap] != unreachable]
    if not feasible:
        return None
    target = (s.target - fade) / unit
    cap = max(feasible, key=lambda c: (round(best[c], 6), -abs(c - target)))
    chosen = []
    for i in range(len(items) - 1, -1, -1):
        if took[i][cap]:
            chosen.append(items[i])
            cap -= weights[i]
    return chosen


def _take_best_within_max(candidates: list[Clip], s: SelectionSettings) -> list[Clip]:
    chosen: list[Clip] = []
    total = 0.0
    for clip in sorted(candidates, key=lambda c: c.value, reverse=True):
        added = clip.duration - (s.transition if chosen else 0.0)
        if total + added <= s.max_total:
            chosen.append(clip)
            total += added
    return chosen


def _order(chosen: list[Clip], analysis: Analysis, s: SelectionSettings) -> list[Clip]:
    order = s.order
    if order == "auto":
        order = "chrono" if analysis.video_type == "match" else "crescendo"
    by_time = sorted(chosen, key=lambda c: c.start)
    if order == "crescendo":  # le meilleur à la fin
        return sorted(chosen, key=lambda c: (c.value, c.start))
    if order == "accroche" and by_time:  # le meilleur d'abord pour accrocher, puis la chronologie
        best = max(by_time, key=lambda c: c.value)
        return [best] + [c for c in by_time if c is not best]
    return by_time
