"""Cris des commentateurs, affichés en gros pendant le clip (« QUEL DUNK ! », « ON FIRE ! »).

Whisper se trompe souvent sur les noms (« Lemon yama ») et invente parfois des phrases : son texte
n'est jamais affiché tel quel. On y cherche des exclamations connues, et on affiche leur forme propre
au moment où elles sont dites. Environ un clip sur quatre en a une : juste assez pour marquer les
temps forts.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from .text_utils import fold
from .transcribe import Segment, load_whisper_json

SHOW = 1.8  # secondes à l'écran
EARLIEST = 1.5  # un cri compte s'il est dit au plus tôt 1,5 s avant le geste…
LATEST = 1.5  # … et au plus tard 1,5 s après la fin du clip (la réaction suit souvent l'action)

# Mots dont l'accent disparaît dans le texte plié : rendus avec leur orthographe à l'écran
_WORDS = {"defense": "DÉFENSE", "enorme": "ÉNORME", "stratospherique": "STRATOSPHÉRIQUE"}


def _word(match: re.Match) -> str:
    return _WORDS.get(match[1], match[1].upper())


# (motif cherché dans le texte plié, texte affiché, mot courant ?), du plus précis au plus général.
# Un mot courant (« incroyable », « slam ») ne compte que dans une vraie exclamation : phrase courte ou
# avec « ! », sans chiffres (« 20 from downtown this year » est une statistique, pas un cri).
SHOUTS: list[tuple[re.Pattern, object, bool]] = [(re.compile(pattern), shown, common) for pattern, shown, common in [
    # français
    (r"\bquel (dunk|smash|panier|contre|shoot|tir|missile|poster|geste)\b", lambda m: f"QUEL {_word(m)} !", False),
    (r"\bquelle (passe|action|claquette|defense|interception)\b", lambda m: f"QUELLE {_word(m)} !", False),
    (r"\bc'?est magnifique\b", "C'EST MAGNIFIQUE !", False),
    (r"\bet ca rentre\b", "ET ÇA RENTRE !", False),
    (r"\bdans (?:sa|ta|la) face\b", "DANS SA FACE !", False),
    (r"\bil s'envole\b", "IL S'ENVOLE !", False),
    (r"\bil est en feu\b", "IL EST EN FEU !", False),
    (r"\boh la la\b|\bohlala\b", "OH LA LA !", False),
    (r"\b(?:waouh|wouah|whaou|waou)\b", "WAOUH !", False),
    (r"\b(magnifique|incroyable|enorme|extraordinaire|spectaculaire|splendide|superbe|fantastique|"
     r"stratospherique|sensationnelle?|exceptionnelle?|monstrueux|monstrueuse)\b", lambda m: f"{_word(m)} !", True),
    # anglais
    (r"\bwhat a (shot|play|pass|dunk|block|move|finish|bucket|steal)\b", lambda m: f"WHAT A {_word(m)} !", False),
    (r"\bmonster (dunk|jam|slam|block)\b", lambda m: f"MONSTER {_word(m)} !", False),
    (r"\bthrows? it down\b|\bthrew it down\b", "THROWS IT DOWN !", False),
    (r"\b(?:are )?you(?:'re| are)? kidding me\b", "ARE YOU KIDDING ME ?!", False),
    (r"\bmy goodness\b", "MY GOODNESS !", False),
    (r"\bon fire\b", "ON FIRE !", False),
    (r"\bget (?:out of|outta) here\b", "GET OUTTA HERE !", False),
    (r"\bnothing but net\b", "NOTHING BUT NET !", False),
    (r"\b(?:at|beats) the buzzer\b", "AT THE BUZZER !", False),
    (r"\bposteri[sz]ed\b|\bon a poster\b", "POSTERIZED !", False),
    (r"\bhe can'?t miss\b", "HE CAN'T MISS !", False),
    (r"\bcount it\b", "COUNT IT !", False),
    (r"\band one\s*(?:[!.,]|$)", "AND ONE !", False),  # pas « and one of the leading rebounders »
    (r"\boh my\b", "OH MY !", False),
    (r"\b(wow|bang|boom)\b", lambda m: f"{_word(m)} !", False),
    (r"\bfrom (?:way )?downtown\b", "FROM DOWNTOWN !", True),
    (r"\b(rejected|denied|unbelievable|incredible)\b", lambda m: f"{_word(m)} !", True),
    (r"\bslam\b", "SLAM !", True),
    (r"\bsplash\b", "SPLASH !", True),
]]


@dataclass
class Shout:
    text: str  # texte affiché
    start: float  # temps dans la vidéo source
    end: float


def commentary(work_dir: Path) -> list[Segment]:
    """Commentaires transcrits pendant l'analyse locale (aucun avec Gemini ou sans IA)."""
    path = work_dir / "transcription.json"
    if not path.is_file():
        return []
    try:
        return load_whisper_json(path)[0]
    except ValueError:
        return []


def detect(text: str) -> tuple[str, int] | None:
    """Exclamation reconnue dans une phrase : (texte affiché, position dans la phrase)."""
    folded = fold(text).replace("’", "'").replace("-", " ")
    exclaimed = ("!" in text or len(folded.split()) <= 6) and not any(ch.isdigit() for ch in folded)
    for pattern, shown, common in SHOUTS:
        match = pattern.search(folded)
        if match and (exclaimed or not common):
            return (shown(match) if callable(shown) else shown), match.start()
    return None


def find_shout(segments: list[Segment], start: float, end: float, key: float) -> Shout | None:
    """Le premier cri dit autour du geste d'un clip [start, end], calé pour rester lisible dans le clip."""
    for segment in segments:
        if segment.end < key - EARLIEST or segment.start > end + LATEST:
            continue
        found = detect(segment.text)
        if not found:
            continue
        text, position = found
        said = segment.start + (segment.end - segment.start) * position / max(1, len(segment.text))
        if said < key - EARLIEST:
            continue
        shown_from = max(start + 0.25, min(said, end - 1.2))
        shown_to = min(shown_from + SHOW, end - 0.05)
        if shown_to - shown_from >= 0.9:
            return Shout(text, round(shown_from, 2), round(shown_to, 2))
    return None
