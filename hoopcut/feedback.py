"""Retouches et avis : ce que tu corriges dans l'aperçu, et ce que hoopcut en apprend.

- Les retouches d'une vidéo (clip retiré, allongé, raccourci, légende corrigée) sont gardées
  dans `retouches.json`, dans son dossier de travail : tout nouveau montage les respecte.
- Chaque avis est ajouté au journal `avis.jsonl` (dossier hoopcut-donnees/avis), avec une
  planche d'images du clip (début, geste, fin). hoopcut en tire des réglages pour les vidéos
  suivantes : jeu gardé avant et après le geste, types d'action favorisés ou évités, noms mal
  écrits. Le journal sert aussi à améliorer les consignes de l'IA ; le modèle lui-même n'est
  pas réentraîné (trop lourd pour un PC).
"""

from __future__ import annotations

import json
import subprocess
from collections import Counter
from dataclasses import dataclass, field, replace
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path

from .models import ACTIONS, Analysis, Moment
from .select import SelectionSettings
from .text_utils import fold

EDITS_FILE = "retouches.json"
JOURNAL_FILE = "avis.jsonl"
STEP = 2.0  # secondes ajoutées ou retirées par « coupé trop tôt », « démarre trop tard », « trop long »
MIN_CLIPS_FOR_TIMING = 5  # clips validés nécessaires avant de toucher aux marges
MIN_OPINIONS_FOR_TYPE = 3  # avis sur un type d'action nécessaires avant de le favoriser ou de l'éviter
USUALLY_KEPT = 0.85  # part des clips proposés qu'on s'attend à voir gardés, avant tout avis

# code -> libellé montré dans l'aperçu
REASONS: dict[str, str] = {
    "rien": "Il ne se passe rien (tir raté, pas d'action)",
    "ennuyeux": "Action sans intérêt",
    "pas_le_jeu": "Ralenti, public ou banc",
    "fin_coupee": "Coupé trop tôt",
    "debut_manque": "Démarre trop tard",
    "trop_long": "Trop long",
    "legende": "Mauvaise légende (action ou joueur)",
    "cri": "Le texte en gros est faux",
    "autre": "Autre raison",
}
# Pour l'accroche (le clip d'ouverture), des raisons à part
TEASER_REASONS: dict[str, str] = {
    "rien": "Pas la bonne action : en prendre une autre",
    "sans_accroche": "Pas d'accroche du tout",
    "cri": "Le texte en gros est faux",
    "autre": "Autre raison",
}
REMOVING = {"rien", "ennuyeux", "pas_le_jeu", "autre"}  # le clip est retiré (et remplacé si possible)


def moment_id(m: Moment) -> str:
    """Identifiant d'un moment dans une analyse : l'instant du geste (il ne change pas tant que
    l'analyse n'est pas refaite)."""
    return f"{m.key:.2f}"


def similar_spelling(a: str, b: str) -> bool:
    """« Wemby Nyama » / « Wembanyama » : même joueur mal écrit. « Harden » / « Harper » : deux joueurs."""
    fa, fb = fold(a), fold(b)
    if not fa or not fb:
        return False
    whole = SequenceMatcher(None, fa, fb).ratio()
    last = SequenceMatcher(None, fa.split()[-1], fb.split()[-1]).ratio()
    return whole >= 0.75 or last >= 0.85


@dataclass
class Edits:
    """Retouches d'une vidéo, faites dans l'aperçu (moments désignés par moment_id)."""

    removed: set[str] = field(default_factory=set)
    before: dict[str, float] = field(default_factory=dict)  # secondes en plus avant le geste
    after: dict[str, float] = field(default_factory=dict)  # secondes en plus après le geste
    captions: dict[str, dict] = field(default_factory=dict)  # {"action": code, "joueur": nom ou None}
    names: dict[str, str] = field(default_factory=dict)  # nom mal écrit (plié) -> bonne écriture, dans cette vidéo
    title: str | None = None  # titre choisi dans l'aperçu
    hook: bool = True  # accroche en ouverture
    no_teaser: set[str] = field(default_factory=set)  # actions refusées comme accroche
    no_shout: set[str] = field(default_factory=set)  # actions dont le cri affiché était faux

    @classmethod
    def load(cls, work_dir: Path) -> "Edits":
        try:
            data = json.loads((work_dir / EDITS_FILE).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return cls()
        return cls(
            removed=set(data.get("retires", [])),
            before={k: float(v) for k, v in data.get("avant", {}).items()},
            after={k: float(v) for k, v in data.get("apres", {}).items()},
            captions=dict(data.get("legendes", {})),
            names=dict(data.get("noms", {})),
            title=data.get("titre") or None,
            hook=data.get("accroche", True) is not False,
            no_teaser=set(data.get("pas_en_accroche", [])),
            no_shout=set(data.get("sans_cri", [])),
        )

    def save(self, work_dir: Path) -> None:
        data = {
            "retires": sorted(self.removed),
            "avant": self.before,
            "apres": self.after,
            "legendes": self.captions,
            "noms": self.names,
            "titre": self.title,
            "accroche": self.hook,
            "pas_en_accroche": sorted(self.no_teaser),
            "sans_cri": sorted(self.no_shout),
        }
        (work_dir / EDITS_FILE).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def add(self, m: Moment, reason: str, action: str | None = None, player: str | None = None,
            teaser: bool = False) -> None:
        key = moment_id(m)
        if reason == "cri":
            self.no_shout.add(key)
        elif teaser:
            if reason == "sans_accroche":
                self.hook = False
            else:
                self.no_teaser.add(key)
        elif reason in REMOVING:
            self.removed.add(key)
        elif reason == "fin_coupee":
            self.after[key] = self.after.get(key, 0.0) + STEP
        elif reason == "debut_manque":
            self.before[key] = self.before.get(key, 0.0) + STEP
        elif reason == "trop_long":
            self.before[key] = self.before.get(key, 0.0) - STEP
        elif reason == "legende":
            new = (player or "").strip() or None
            self.captions[key] = {"action": action if action in ACTIONS else m.action, "joueur": new}
            if m.player and new and fold(m.player) != fold(new) and similar_spelling(m.player, new):
                # Faute d'orthographe : corrigée partout dans la vidéo. Un tout autre nom, lui, ne vaut
                # que pour ce clip (l'IA a pu nommer le tireur au lieu du contreur).
                self.names[fold(m.player)] = new

    def apply(self, analysis: Analysis) -> Analysis:
        moments = []
        for m in analysis.moments:
            key = moment_id(m)
            if key in self.removed:
                continue
            m = m.model_copy()
            m.extra_before = self.before.get(key, 0.0)
            m.extra_after = self.after.get(key, 0.0)
            if m.player and fold(m.player) in self.names:
                m.player = self.names[fold(m.player)]
            caption = self.captions.get(key)
            if caption:
                if caption.get("action") in ACTIONS:
                    m.action = caption["action"]
                if "joueur" in caption:
                    m.player = (caption["joueur"] or "").strip() or None
            moments.append(m)
        return analysis.model_copy(update={"moments": moments, "title": self.title or analysis.title})


@dataclass
class Learned:
    """Ce que hoopcut a appris des avis, appliqué aux vidéos suivantes."""

    before: float = 0.0  # secondes ajoutées à la marge avant le geste
    after: float = 0.0  # secondes ajoutées après
    type_bonus: dict[str, float] = field(default_factory=dict)  # malus de note des types d'action jugés sans intérêt
    names: dict[str, str] = field(default_factory=dict)  # nom mal écrit (plié) -> bonne écriture
    bad_shouts: set[str] = field(default_factory=set)  # cris refusés au moins deux fois : plus affichés
    opinions: int = 0  # clips jugés : validés ou refusés

    def tune(self, s: SelectionSettings) -> SelectionSettings:
        return replace(
            s,
            pre_roll=max(1.0, s.pre_roll + self.before),
            post_roll=max(0.6, s.post_roll + self.after),
            type_bonus={**s.type_bonus, **self.type_bonus},
        )

    def fix_names(self, analysis: Analysis, context: str) -> Analysis:
        """Corrige les noms déjà corrigés dans d'autres vidéos, si le bon nom figure dans le titre ou
        la description de celle-ci (« Robert » ne remplace pas « Gobert » dans un autre match)."""
        known = fold(context)
        fixes = {wrong: right for wrong, right in self.names.items() if fold(right).split()[-1] in known}
        if not fixes or not any(m.player and fold(m.player) in fixes for m in analysis.moments):
            return analysis
        moments = []
        for m in analysis.moments:
            if m.player and fold(m.player) in fixes:
                m = m.model_copy(update={"player": fixes[fold(m.player)]})
            moments.append(m)
        return analysis.model_copy(update={"moments": moments})

    def summary(self) -> list[str]:
        lines = []
        if self.before:
            lines.append(f"{_seconds(self.before)} de jeu avant l'action")
        if self.after:
            lines.append(f"{_seconds(self.after)} de jeu après l'action")
        ranked = sorted(self.type_bonus.items(), key=lambda item: item[1], reverse=True)
        liked = [ACTIONS.get(t, t).lower() for t, bonus in ranked if bonus > 0]
        avoided = [ACTIONS.get(t, t).lower() for t, bonus in reversed(ranked) if bonus < 0]
        if liked:
            lines.append("favorise : " + ", ".join(liked))
        if avoided:
            lines.append("évite : " + ", ".join(avoided))
        if self.names:
            lines.append(f"{len(self.names)} nom{'s' if len(self.names) > 1 else ''} de joueur corrigé"
                         f"{'s' if len(self.names) > 1 else ''}")
        if self.bad_shouts:
            lines.append("n'affiche plus : " + ", ".join(sorted(self.bad_shouts)))
        return lines


def learn(journal: Path) -> Learned:
    """Réglages tirés du journal des avis.

    - Marges : moyenne des marges des clips validés (réglage appris à ce moment-là + retouche du clip).
      Stable : une fois la bonne marge trouvée, les nouveaux clips validés la confirment.
    - Types d'action : un type plus souvent jugé « sans intérêt » que la moyenne est évité
      (les deux parts partent de USUALLY_KEPT tant qu'il y a peu d'avis).
    - Noms : fautes d'orthographe corrigées dans une légende.
    """
    kept, boring, wrong_shouts = Counter(), Counter(), Counter()
    names: dict[str, str] = {}
    validations: dict[str, dict] = {}
    refused = 0
    for entry in read_journal(journal):
        if entry.get("avis") == "valide":
            validations[str((entry.get("video") or {}).get("id"))] = entry  # la dernière validation d'une vidéo
            continue
        if entry.get("avis") != "pas_bon":
            continue
        refused += 1
        moment = entry.get("moment") or {}
        if entry.get("raison") == "cri" and (entry.get("clip") or {}).get("cri"):
            wrong_shouts[entry["clip"]["cri"]] += 1
        if entry.get("raison") == "ennuyeux" and moment.get("action") and not entry.get("accroche"):
            boring[moment["action"]] += 1
        correction = entry.get("correction") or {}
        old, new = moment.get("player"), (correction.get("joueur") or "").strip()
        if old and new and fold(old) != fold(new) and similar_spelling(old, new):
            names[fold(old)] = new

    befores, afters = [], []
    for entry in validations.values():
        settings = entry.get("reglages") or {}
        for clip in entry.get("clips", []):
            kept[clip.get("action")] += 1
            befores.append(float(settings.get("avant", 0.0)) + float(clip.get("en_plus_avant", 0.0)))
            afters.append(float(settings.get("apres", 0.0)) + float(clip.get("en_plus_apres", 0.0)))

    learned = Learned(names=names, opinions=len(befores) + refused,
                      bad_shouts={text for text, count in wrong_shouts.items() if count >= 2})
    if len(befores) >= MIN_CLIPS_FOR_TIMING:
        learned.before = _clamp(round(sum(befores) / len(befores), 1), -2.0, 3.0)
        learned.after = _clamp(round(sum(afters) / len(afters), 1), -1.0, 3.0)
    # Seuls les refus comptent : un type souvent gardé l'est surtout parce qu'il est souvent proposé
    # (le favoriser pour ça ferait boule de neige).
    total_kept, total_boring = sum(kept.values()), sum(boring.values())
    usually_refused = 1 - USUALLY_KEPT
    overall = (total_boring + 10 * usually_refused) / (total_kept + total_boring + 10)
    for action in boring:
        judged = kept[action] + boring[action]
        if not action or judged < MIN_OPINIONS_FOR_TYPE:
            continue
        refused_rate = (boring[action] + 2 * usually_refused) / (judged + 2)
        malus = _clamp(round(6 * (refused_rate - overall), 1), 0.0, 2.0)
        if malus:
            learned.type_bonus[action] = -malus
    return learned


def record(journal: Path, entry: dict) -> None:
    """Ajoute un avis au journal (une ligne JSON par avis)."""
    journal.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps({"date": datetime.now().isoformat(timespec="seconds"), **entry}, ensure_ascii=False)
    with journal.open("a", encoding="utf-8") as stream:
        stream.write(line + "\n")


def read_journal(journal: Path) -> list[dict]:
    try:
        lines = journal.read_text(encoding="utf-8").splitlines()
    except OSError:
        return []
    entries = []
    for line in lines:
        try:
            entry = json.loads(line)
        except ValueError:
            continue  # ligne abîmée : ignorée
        if isinstance(entry, dict):
            entries.append(entry)
    return entries


def snapshot(video: Path, times: list[float], out: Path, width: int = 320) -> Path | None:
    """Planche de quelques images du clip (début, geste, fin), pour relire l'avis plus tard."""
    cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-y", "-loglevel", "error"]
    for t in times:
        cmd += ["-ss", f"{max(0.0, t):.2f}", "-i", str(video)]
    graph = [f"[{i}:v]scale={width}:-2,setsar=1,trim=end_frame=1,setpts=PTS-STARTPTS[i{i}]" for i in range(len(times))]
    if len(times) > 1:
        graph.append("".join(f"[i{i}]" for i in range(len(times))) + f"hstack=inputs={len(times)}[out]")
    else:
        graph[0] = graph[0].replace("[i0]", "[out]")
    cmd += ["-filter_complex", ";".join(graph), "-map", "[out]", "-frames:v", "1", "-q:v", "4", str(out)]
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except (OSError, subprocess.CalledProcessError):
        return None
    return out


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _seconds(value: float) -> str:
    return f"{value:+.1f} s".replace(".", ",")
