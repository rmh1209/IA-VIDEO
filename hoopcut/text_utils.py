"""Petits outils texte : comparaison de noms, noms de fichiers, timecodes."""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable


def fold(text: str | None) -> str:
    """Minuscules sans accents, pour comparer des noms (« Élan » == « elan »)."""
    normalized = unicodedata.normalize("NFKD", text or "")
    return "".join(c for c in normalized if not unicodedata.combining(c)).casefold().strip()


def matches_any(text: str | None, needles: Iterable[str]) -> bool:
    """Vrai si l'un des noms recherchés apparaît dans le texte (sans tenir compte des accents)."""
    haystack = fold(text)
    return bool(haystack) and any(fold(n) and fold(n) in haystack for n in needles)


def same_name(a: str | None, b: str | None) -> bool:
    """« ASVEL » et « LDLC ASVEL » désignent la même équipe (inclusion dans un sens ou l'autre)."""
    fa, fb = fold(a), fold(b)
    if len(fa) < 3 or len(fb) < 3:
        return bool(fa) and fa == fb
    return fa in fb or fb in fa


def slugify(text: str, max_len: int = 60) -> str:
    """« Résumé : ASVEL vs Maccabi ! » -> « resume-asvel-vs-maccabi »."""
    slug = re.sub(r"[^a-z0-9]+", "-", fold(text)).strip("-")
    return slug[:max_len].rstrip("-") or "video"


def parse_timecode(value: str | float | int) -> float:
    """Convertit « 01:15.5 », « 1:02:03 », « 75.5 » ou 75.5 en secondes."""
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().lower().replace(",", ".").rstrip("s").strip()
    parts = text.split(":")
    if not text or len(parts) > 3:
        raise ValueError(f"Timecode invalide : {value!r}")
    seconds = 0.0
    for part in parts:
        seconds = seconds * 60 + float(part)
    if seconds < 0:
        raise ValueError(f"Timecode négatif : {value!r}")
    return seconds


def format_timecode(seconds: float) -> str:
    """75.5 -> « 01:15.5 »."""
    minutes, sec = divmod(max(0.0, seconds), 60)
    return f"{int(minutes):02d}:{sec:04.1f}"
