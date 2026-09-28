"""Interface dans le navigateur : coller un lien, regarder les clips choisis, valider.

`python -m hoopcut.interface` (ou un double-clic sur hoopcut.bat) lance un petit serveur web,
joignable seulement depuis ce PC, et ouvre la page dans le navigateur :
- les clips choisis passent tout seuls, l'un après l'autre, habillés comme dans le short ;
- « Pas bon » : on donne la raison ; le clip est retiré (et remplacé), allongé, raccourci ou sa
  légende corrigée, et l'avis est enregistré pour que hoopcut en apprenne (voir feedback.py) ;
- « Valider » lance le montage final.
"""

from __future__ import annotations

import argparse
import io
import json
import mimetypes
import re
import secrets
import subprocess
import sys
import threading
import time
import traceback
import urllib.request
import webbrowser
from collections import deque
from dataclasses import replace
from datetime import datetime
from functools import lru_cache
from http.cookies import CookieError, SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Callable
from urllib.parse import parse_qs, urlparse

from PIL import Image

from .analyze import AnalysisError
from .cli import DEFAULT_MUSIC_DIR, build_parser, job_from_args, load_dotenv
from .feedback import (EDITS_FILE, JOURNAL_FILE, REASONS, REMOVING, TEASER_REASONS, Edits, Learned, learn,
                       moment_id, record, snapshot)
from .fetch import DownloadError
from .ffmpeg_utils import FFmpegError, run
from .models import ACTIONS, Analysis
from .overlay import FONT_PATH, overlay_image, shout_center, shout_image
from .pipeline import (JobSettings, Prepared, analysis_cache, build_overlays, caption_for, choose, prepare,
                       render_short, title_for)
from .render import compute_layout, pick_music
from .select import Clip, EditPlan

PORT = 8765
PAGE = Path(__file__).with_name("interface.html")
COOKIE = "hoopcut"
PREVIEW_SIZE = (540, 960)  # habillage envoyé à la page : moitié de la taille réelle, bien assez pour l'aperçu
CHUNK = 256 * 1024
KNOWN_ERRORS = (AnalysisError, DownloadError, FFmpegError, FileNotFoundError)

WINDOW_LINE = re.compile(r"^\[(\d+)/(\d+)\] \d+:\d\d")  # « [12/31] 05:30.0 → 06:00.0 : dunk — reste ≈ 9 min »
CLIP_LINE = re.compile(r"^Clip (\d+)/(\d+)$")
# vérifications image par image, puis lecture du tableau de score : (motif, début, fin, texte)
CHECK_LINES = [
    (re.compile(r"^Images vérifiées : (\d+)/(\d+)$"), 0.85, 0.88, "Vérification des meilleures actions"),
    (re.compile(r"^Tableau de score lu : (\d+)/(\d+) actions$"), 0.88, 0.94, "Lecture du tableau de score"),
]
TITLE_LINE = re.compile(r"^(.+) \(\d+ min \d+ s\)$")
# début de ligne du journal -> (avancement, texte montré dans la page)
STAGES = [
    ("[1/5]", 0.01, "Récupération de la vidéo…"),
    ("Téléchargement de", 0.01, "Téléchargement de la vidéo…"),
    ("[2/5]", 0.06, "Repérage des changements de plan…"),
    ("[3/5] Analyse déjà faite", 0.95, "Analyse déjà faite : réutilisée"),
    ("[3/5]", 0.08, "L'IA se prépare…"),
    ("Chargement du modèle", 0.09, "Chargement de l'IA sur la carte graphique…"),
    ("Coup d'œil général", 0.10, "Coup d'œil général : équipes, maillots, score…"),
    ("Vérification de la prise de vue", 0.83, "Vérification des meilleures actions…"),
    ("Vérification du jeu", 0.85, "Vérification des meilleures actions…"),
    ("Lecture du tableau de score", 0.88, "Lecture du tableau de score…"),
    ("Analyse locale terminée", 0.95, "Analyse terminée"),
    ("[4/5]", 0.97, "Choix des meilleurs moments…"),
]


class UserError(Exception):
    """Demande impossible : le message est montré tel quel dans la page."""


class Studio:
    """Une vidéo à la fois : analyse, aperçu, avis, montage. Les travaux longs tournent en arrière-plan."""

    def __init__(self, job: JobSettings, music: Path | None = None):
        self.job = job
        self.music = music  # fichier ou dossier : un morceau est tiré au hasard pour chaque short
        self.lock = threading.RLock()
        self.step = "accueil"  # accueil | analyse | apercu | montage | termine | erreur
        self.lines: deque[str] = deque(maxlen=400)
        self.progress = 0.0
        self.detail = ""
        self.error = ""
        self.started = 0.0
        self.video_title = ""
        self.runs = 0  # numéro de la vidéo en cours (adresse de la vidéo dans la page)
        self.version = 0  # numéro du plan de montage (adresse des habillages)
        # Les numéros repartent de zéro à chaque lancement : ce préfixe évite au navigateur de ressortir
        # les images d'une séance précédente, gardées dans son cache.
        self.session = secrets.token_hex(4)
        self.resume = 0  # clip à rejouer après un avis
        self.current = job  # réglages du short en cours (musique tirée au sort)
        self.learned = Learned()
        self.prepared: Prepared | None = None
        self.analysis: Analysis | None = None
        self.plan: EditPlan | None = None
        self.preview_video: Path | None = None
        self.output: Path | None = None
        self.overlays: dict[tuple[int, int], bytes] = {}

    @property
    def journal(self) -> Path | None:
        return self.job.avis_dir / JOURNAL_FILE if self.job.avis_dir else None

    @property
    def busy(self) -> bool:
        return self.step in ("analyse", "montage")

    # --- demandes de la page -------------------------------------------------------------------

    def analyze(self, source: str) -> None:
        source = source.strip().strip('"').strip()
        if not source:
            raise UserError("Colle d'abord le lien d'une vidéo YouTube (ou le chemin d'un fichier vidéo).")
        with self.lock:
            if self.busy:
                raise UserError("Une vidéo est déjà en cours de traitement.")
            self._clear("analyse")
            self.detail = "Démarrage…"
            self.runs += 1
            self.current = self.job
            if self.music:
                self.current = replace(self.job, render=replace(self.job.render, music=pick_music(self.music)))
            self.learned = learn(self.journal) if self.journal else Learned()
        self._start(self._analyze, source)

    def feedback(self, clip_id: str, reason: str, text: str = "", action: str | None = None,
                 player: str | None = None) -> dict:
        with self.lock:
            if self.step != "apercu" or self.plan is None or self.prepared is None:
                raise UserError("Aucun aperçu en cours.")
            position = next((i for i, c in enumerate(self.plan.clips) if _clip_id(c) == clip_id), None)
            if position is None:
                raise UserError("Ce clip n'est plus dans le short : recharge la page.")
            clip = self.plan.clips[position]
            if reason not in (TEASER_REASONS if clip.teaser else REASONS):
                raise UserError("Raison inconnue.")
            work_dir = self.prepared.source.work_dir
            saved = (work_dir / EDITS_FILE).read_bytes() if (work_dir / EDITS_FILE).exists() else None
            edits = Edits.load(work_dir)
            edits.add(clip.moment, reason, action, player, teaser=clip.teaser)
            edits.save(work_dir)
            try:
                analysis, plan = choose(self.prepared, self.current, self._log, self.learned)
            except AnalysisError as exc:
                _restore(work_dir / EDITS_FILE, saved)
                raise UserError("Impossible : il ne resterait plus aucune action à montrer.") from exc
            self._record_opinion(clip, reason, text, action, player)
            message, resume = _explain(self.plan, plan, position, clip, reason, analysis)
            self.analysis, self.plan = analysis, plan
            self._new_version(resume)
            return {"message": message, "apercu": self._preview_json()}

    def set_title(self, title: str, clip: int = 0) -> dict:
        title = " ".join((title or "").split())
        if not title:
            raise UserError("Écris un titre.")
        if len(title) > 80:
            raise UserError("Titre trop long : 80 caractères au plus (60 pour qu'il reste bien lisible).")
        with self.lock:
            if self.step != "apercu" or self.plan is None or self.prepared is None:
                raise UserError("Aucun aperçu en cours.")
            work_dir = self.prepared.source.work_dir
            old = title_for(self.prepared.source, self.analysis, self.current)
            edits = Edits.load(work_dir)
            edits.title = title
            edits.save(work_dir)
            if self.journal:  # les titres choisis à la main montrent ce qui plaît
                record(self.journal, {"avis": "titre", "video": self._video_info(), "ancien": old, "nouveau": title})
            self.analysis, self.plan = choose(self.prepared, self.current, self._log, self.learned)
            self._new_version(max(0, min(clip, len(self.plan.clips) - 1)))
            return {"message": "Titre changé.", "apercu": self._preview_json()}

    def validate(self) -> None:
        with self.lock:
            if self.step != "apercu" or self.plan is None:
                raise UserError("Aucun aperçu à valider.")
            if self.journal:
                opening = next((c for c in self.plan.clips if c.teaser), None)
                record(self.journal, {
                    "avis": "valide",
                    "video": self._video_info(),
                    "reglages": {"avant": self.learned.before, "apres": self.learned.after},
                    "clips": [_clip_info(c) for c in self.plan.clips if not c.teaser],
                    "accroche": _clip_info(opening) if opening else None,
                })
            self.step, self.progress, self.detail, self.error = "montage", 0.0, "Préparation du montage…", ""
            self.lines.clear()
            self.started = time.monotonic()
        self._start(self._render)

    def back(self) -> None:
        """Après une erreur de montage : retour à l'aperçu (ou à l'accueil s'il n'y en a pas)."""
        with self.lock:
            if self.busy:
                raise UserError("Attends la fin du travail en cours.")
            if self.plan is not None and self.prepared is not None:
                self.step, self.error = "apercu", ""
            else:
                self._clear("accueil")

    def reset(self) -> None:
        with self.lock:
            if self.busy:
                raise UserError("Attends la fin du travail en cours.")
            self._clear("accueil")

    def open_output(self) -> None:
        with self.lock:
            out = self.output
        if out is None or not out.exists():
            raise UserError("Aucun short à montrer.")
        if sys.platform == "win32":
            subprocess.Popen(f'explorer /select,"{out.resolve()}"')
        else:
            webbrowser.open(out.resolve().parent.as_uri())

    def status(self) -> dict:
        with self.lock:
            data = {
                "etape": self.step,
                "progression": round(self.progress, 3),
                "detail": self.detail,
                "journal": list(self.lines)[-8:],
                "erreur": self.error,
                "ecoule": round(time.monotonic() - self.started) if self.busy else 0,
                "video_titre": self.video_title,
                "peut_revenir": self.plan is not None,
            }
            if self.step == "apercu" and self.plan is not None:
                data["apercu"] = self._preview_json()
            if self.step == "termine" and self.output is not None:
                data["sortie"] = self._output_json()
        if data["etape"] == "accueil":
            learned = learn(self.journal) if self.journal else Learned()
            data["appris"] = {"avis": learned.opinions, "lignes": learned.summary()}
            data["recents"] = recent_videos(self.job)
        return data

    def overlay_png(self, version: int, index: int) -> bytes | None:
        """Habillage d'un clip (titre, score, légende), tel qu'il sera posé sur le short."""
        with self.lock:
            if version != self.version or self.plan is None or not 0 <= index < len(self.plan.clips):
                return None
            cached = self.overlays.get((version, index))
            if cached:
                return cached
            prepared, analysis, plan, job = self.prepared, self.analysis, self.plan, self.current
        render = job.render
        layout = compute_layout(prepared.source.info, render)
        content = build_overlays(plan, analysis, title_for(prepared.source, analysis, job), job)[index]
        image = overlay_image(content, video_top=layout.top, video_bottom=layout.bottom, accent=render.accent,
                              size=(render.width, render.height)).resize(PREVIEW_SIZE, Image.LANCZOS)
        data = _png(image)
        with self.lock:
            if version == self.version:
                self.overlays[(version, index)] = data
        return data

    def shout_png(self, version: int, index: int) -> bytes | None:
        """Cri affiché en gros sur un clip, à la taille réelle du short (la page le réduit)."""
        with self.lock:
            if version != self.version or self.plan is None or not 0 <= index < len(self.plan.clips):
                return None
            shout = self.plan.clips[index].shout
        return _png(shout_image(shout.text)) if shout else None

    def media(self, name: str, copy: bool = False) -> tuple[Path | None, str]:
        with self.lock:
            if name == "video":
                if copy and self.prepared:
                    return self.prepared.proxy, "video/mp4"
                return self.preview_video, "video/mp4"
            if name == "musique":
                music = self.current.render.music
                return music, (mimetypes.guess_type(music.name)[0] if music else None) or "audio/mpeg"
            if name == "sortie":
                return self.output, "video/mp4"
        return None, ""

    # --- travaux en arrière-plan -----------------------------------------------------------------

    def _start(self, work: Callable, *args) -> None:
        threading.Thread(target=self._guarded, args=(work, *args), daemon=True).start()

    def _guarded(self, work: Callable, *args) -> None:
        try:
            work(*args)
        except Exception as exc:  # montré dans la page ; le détail technique reste dans la console
            if not isinstance(exc, KNOWN_ERRORS):
                traceback.print_exc()
            with self.lock:
                self.step = "erreur"
                self.error = str(exc) or exc.__class__.__name__

    def _analyze(self, source: str) -> None:
        prepared = prepare(source, self.current, self._log, progress=self._downloading)
        analysis, plan = choose(prepared, self.current, self._log, self.learned)
        preview = playable_video(prepared)
        with self.lock:
            self.prepared, self.analysis, self.plan, self.preview_video = prepared, analysis, plan, preview
            self.video_title = prepared.source.title
            self._new_version(0)
            self.step, self.progress, self.detail = "apercu", 1.0, ""

    def _render(self) -> None:
        with self.lock:
            prepared, analysis, plan, job = self.prepared, self.analysis, self.plan, self.current
        out = render_short(prepared, analysis, plan, job, self._log)
        with self.lock:
            self.output = out
            self.step, self.progress, self.detail = "termine", 1.0, ""

    def _log(self, line: str) -> None:
        print(line, flush=True)  # la console garde tout le détail
        text = line.strip()
        with self.lock:
            self.lines.append(text)
            if self.step == "analyse" and not self.video_title:
                title = TITLE_LINE.match(text)
                if title:
                    self.video_title = title[1]
            stage = _stage(text, self.step)
            if stage:
                progress, detail = stage
                self.progress = max(self.progress, progress)
                self.detail = detail

    def _downloading(self, fraction: float) -> None:
        with self.lock:
            self.progress = max(self.progress, 0.01 + 0.04 * fraction)
            self.detail = f"Téléchargement de la vidéo… {round(100 * fraction)} %"

    # --- outils ------------------------------------------------------------------------------------

    def _clear(self, step: str) -> None:
        self.step, self.progress, self.detail, self.error = step, 0.0, "", ""
        self.lines.clear()
        self.started = time.monotonic()
        self.video_title = ""
        self.prepared = self.analysis = self.plan = self.preview_video = self.output = None
        self.overlays.clear()

    def _new_version(self, resume: int) -> None:
        self.version += 1
        self.resume = resume
        self.overlays.clear()
        threading.Thread(target=self._prerender, args=(self.version, resume), daemon=True).start()

    def _prerender(self, version: int, first: int) -> None:
        """Prépare les habillages dans l'ordre où la page va les montrer."""
        with self.lock:
            count = len(self.plan.clips) if self.plan else 0
        for index in [*range(first, count), *range(first)]:
            if version != self.version:
                return
            self.overlay_png(version, index)

    def _video_info(self) -> dict:
        source, analysis = self.prepared.source, self.analysis
        return {"id": source.work_dir.name, "titre": source.title, "lien": source.url,
                "type": analysis.video_type, "analyse": analysis.analyzer, "modele": analysis.model}

    def _record_opinion(self, clip: Clip, reason: str, text: str, action: str | None, player: str | None) -> None:
        if not self.journal:
            return
        m = clip.moment
        image = f"images/{datetime.now():%Y%m%d-%H%M%S}-{self.prepared.source.work_dir.name}-{m.key:.0f}.jpg"
        record(self.journal, {
            "avis": "pas_bon",
            "raison": reason,
            "raison_texte": (TEASER_REASONS if clip.teaser else REASONS)[reason],
            "texte": (text or "").strip(),
            "accroche": clip.teaser,
            "video": self._video_info(),
            "clip": {"debut": clip.start, "fin": clip.end, "geste": m.key, "legende": caption_for(m, self.analysis),
                     "cri": clip.shout.text if clip.shout else None},
            "moment": m.model_dump(),
            "correction": {"action": action, "joueur": (player or "").strip() or None} if reason == "legende" else None,
            "reglages": {"avant": self.learned.before, "apres": self.learned.after},
            "image": image,
        })
        times = [clip.start + 0.3, m.key, clip.end - 0.3]
        threading.Thread(target=snapshot, args=(self.prepared.proxy, times, self.journal.parent / image),
                         daemon=True).start()

    def _preview_json(self) -> dict:
        prepared, analysis, plan, job = self.prepared, self.analysis, self.plan, self.current
        render = job.render
        layout = compute_layout(prepared.source.info, render)
        shout_y = 100 * shout_center(layout.top, layout.video_height) / render.height
        clips = []
        elapsed = 0.0  # début de chaque clip dans le short (pour garder la musique calée sur les coupes)
        for index, clip in enumerate(plan.clips):
            m = clip.moment
            shout = clip.shout
            clips.append({
                "id": _clip_id(clip),
                "accroche": clip.teaser,
                "au_montage": round(elapsed, 3),
                "debut": clip.start,
                "fin": clip.end,
                "geste": m.key,
                "legende": caption_for(m, analysis) or "",
                "action": m.action,
                "joueur": m.player or "",
                "habillage": f"/media/habillage/{self.session}/{self.version}/{index}.png",
                "cri": {
                    "texte": shout.text,
                    "image": f"/media/cri/{self.session}/{self.version}/{index}.png",
                    "debut": shout.start,
                    "fin": shout.end,
                    "centre": shout_y,
                    "largeur": 100 * _shout_width(shout.text) / render.width,
                } if shout else None,
            })
            elapsed += clip.duration - plan.transition
        return {
            "version": self.version,
            "reprendre": self.resume,
            "video": f"/media/video?n={self.session}-{self.runs}",
            "cadre": {
                "gauche": 50 * (render.width - layout.video_width) / render.width,
                "haut": 100 * layout.top / render.height,
                "largeur": 100 * layout.video_width / render.width,
                "hauteur": 100 * layout.video_height / render.height,
            },
            "fond": render.background,
            "titre": title_for(prepared.source, analysis, job),
            "source": prepared.source.title,
            "duree": round(plan.total, 1),
            "clips": clips,
            "musique": f"/media/musique?n={self.session}-{self.runs}" if render.music else None,
            "musique_debut": plan.music_start,
            "volume_musique": render.music_volume,
            "volume_original": render.original_volume,
            "avertissements": plan.warnings,
        }

    def _output_json(self) -> dict:
        try:
            publication = self.output.with_suffix(".txt").read_text(encoding="utf-8")
        except OSError:
            publication = ""
        return {"video": f"/media/sortie?n={self.session}-{self.runs}-{self.version}", "nom": self.output.name,
                "publication": publication}


def _stage(text: str, step: str) -> tuple[float, str] | None:
    """Avancement (0 à 1) et texte à montrer, d'après une ligne du journal."""
    if step == "montage":
        clip = CLIP_LINE.match(text)
        if clip:
            done, total = int(clip[1]), int(clip[2])
            return 0.9 * (done - 1) / total, f"Montage du clip {done} sur {total}…"
        if text.startswith("Assemblage"):
            return 0.9, "Assemblage, fondus et son…"
        return None
    window = WINDOW_LINE.match(text)
    if window:
        done, total = int(window[1]), int(window[2])
        detail = f"L'IA regarde la vidéo : passage {done} sur {total}"
        eta = re.search(r"reste ≈ (\d+) min", text)
        if eta:
            detail += f" (encore ≈ {eta[1]} min)"
        return 0.12 + 0.70 * done / total, detail
    for pattern, low, high, label in CHECK_LINES:
        check = pattern.match(text)
        if check:
            done, total = int(check[1]), int(check[2])
            return low + (high - low) * done / total, f"{label} ({done} sur {total})…"
    for prefix, progress, detail in STAGES:
        if text.startswith(prefix):
            return progress, detail
    return None


def _explain(before: EditPlan, after: EditPlan, position: int, clip: Clip, reason: str,
             analysis: Analysis) -> tuple[str, int]:
    """Ce qui a changé après un avis, et le clip à rejouer."""
    target = moment_id(clip.moment)
    old_ids = {moment_id(c.moment) for c in before.clips if not c.teaser}
    new_ids = [None if c.teaser else moment_id(c.moment) for c in after.clips]
    added = [i for i, key in enumerate(new_ids) if key and key not in old_ids]
    dropped = len([key for key in old_ids if key != target and key not in new_ids])
    here = new_ids.index(target) if target in new_ids else None
    opening = next((i for i, c in enumerate(after.clips) if c.teaser), None)

    def label(index: int) -> str:
        m = after.clips[index].moment
        return caption_for(m, analysis) or m.label

    if reason == "cri":
        message = "Texte retiré. Merci !"
        resume = 0 if clip.teaser else (here if here is not None else min(position, len(after.clips) - 1))
    elif clip.teaser:
        if opening is None:
            message = "Plus d'accroche : le short commence directement par la première action."
        else:
            message = f"Nouvelle accroche : {label(opening)}."
        resume = 0
    elif reason in REMOVING:
        message = "Clip retiré, merci !"
        if added:
            message += " À la place : " + ", ".join(label(i) for i in added) + "."
        resume = added[0] if added else min(position, len(after.clips) - 1)
    elif here is None:
        message = "Ce clip ne tenait plus dans le short : une autre action le remplace."
        resume = added[0] if added else min(position, len(after.clips) - 1)
    elif reason == "legende":
        message = f"Légende corrigée : {label(here)}. Merci !"
        resume = here
    else:
        change = after.clips[here].duration - clip.duration
        if abs(change) < 0.2:
            message = ("Impossible de changer ce clip : un changement de plan ou une autre action le borne. "
                       "Ton avis est quand même noté.")
        else:
            message = f"Clip {'allongé' if change > 0 else 'raccourci'} de {abs(change):.1f} s.".replace(".", ",", 1)
        resume = here
    if dropped:
        message += (" Pour tenir en 80 s, " + ("un autre clip a été retiré." if dropped == 1
                                                else f"{dropped} autres clips ont été retirés."))
    return message, max(0, resume)


def _clip_info(clip: Clip) -> dict:
    m = clip.moment
    return {"id": moment_id(m), "action": m.action, "joueur": m.player, "spectacular": m.spectacular,
            "debut": clip.start, "fin": clip.end, "geste": m.key,
            "en_plus_avant": m.extra_before, "en_plus_apres": m.extra_after,
            "cri": clip.shout.text if clip.shout else None}


def _clip_id(clip: Clip) -> str:
    """Identifiant d'un clip dans la page : l'accroche reprend l'action d'un autre clip, elle a le sien."""
    return "accroche" if clip.teaser else moment_id(clip.moment)


def _png(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, "PNG")
    return buffer.getvalue()


@lru_cache(maxsize=64)
def _shout_width(text: str) -> int:
    return shout_image(text).width


def _restore(path: Path, saved: bytes | None) -> None:
    if saved is None:
        path.unlink(missing_ok=True)
    else:
        path.write_bytes(saved)


def playable_video(prepared: Prepared) -> Path:
    """La source si le navigateur sait la lire (MP4 en H.264, image fluide), sinon la copie allégée."""
    source = prepared.source.path
    if source.suffix.lower() != ".mp4":
        return prepared.proxy
    try:
        codec = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name",
                     "-of", "csv=p=0", str(source)]).stdout.strip()
    except FFmpegError:
        return prepared.proxy
    return source if codec == "h264" else prepared.proxy


def recent_videos(job: JobSettings, limit: int = 5) -> list[dict]:
    """Vidéos YouTube déjà récupérées, la plus récente d'abord (celles déjà analysées sont immédiates)."""
    if not job.work_root.is_dir():
        return []
    items = []
    for folder in job.work_root.iterdir():
        meta = folder / "source.json"
        try:
            data = json.loads(meta.read_text(encoding="utf-8"))
            when = meta.stat().st_mtime
        except (OSError, ValueError):
            continue
        if isinstance(data, dict) and data.get("url"):
            items.append((when, {"titre": data.get("title") or folder.name, "lien": data["url"],
                                 "analysee": analysis_cache(folder, job).exists()}))
    items.sort(key=lambda item: item[0], reverse=True)
    return [item for _, item in items[:limit]]


class Handler(BaseHTTPRequestHandler):
    server_version = "hoopcut"
    protocol_version = "HTTP/1.1"

    @property
    def studio(self) -> Studio:
        return self.server.studio  # type: ignore[attr-defined]

    def log_message(self, format: str, *args) -> None:  # pas de journal des requêtes dans la console
        pass

    def do_GET(self) -> None:
        try:
            self._get()
        except (ConnectionError, TimeoutError):
            pass  # page fermée ou vidéo déplacée pendant l'envoi

    def do_POST(self) -> None:
        try:
            self._post()
        except (ConnectionError, TimeoutError):
            pass

    def _get(self) -> None:
        url = urlparse(self.path)
        path = url.path
        if not self._host_ok():
            return self._error(403, "Accès refusé.")
        if path == "/ping":
            return self._send(b"hoopcut", "text/plain; charset=utf-8")
        if path == "/":
            return self._page()
        if path == "/police.ttf":
            return self._file(FONT_PATH, "font/ttf", cache=True)
        if not self._cookie_ok():
            return self._error(403, "Session expirée : recharge la page.")
        if path == "/api/etat":
            return self._json(self.studio.status())
        media = re.fullmatch(r"/media/(video|musique|sortie)", path)
        if media:
            copy = parse_qs(url.query).get("copie") == ["1"]
            return self._file(*self.studio.media(media[1], copy))
        picture = re.fullmatch(r"/media/(habillage|cri)/(\w+)/(\d+)/(\d+)\.png", path)
        if picture:
            draw = self.studio.overlay_png if picture[1] == "habillage" else self.studio.shout_png
            data = draw(int(picture[3]), int(picture[4])) if picture[2] == self.studio.session else None
            if data is None:
                return self._error(404, "Image périmée.")
            return self._send(data, "image/png", cache=True)
        self._error(404, "Page introuvable.")

    def _post(self) -> None:
        path = urlparse(self.path).path
        if not (self._host_ok() and self._cookie_ok() and self._origin_ok()):
            return self._error(403, "Accès refusé : recharge la page.")
        if "application/json" not in (self.headers.get("Content-Type") or ""):
            return self._error(415, "Requête refusée.")
        length = int(self.headers.get("Content-Length") or 0)
        if length > 100_000:
            return self._error(413, "Requête trop grosse.")
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            return self._error(400, "Requête illisible.")
        if not isinstance(body, dict):
            return self._error(400, "Requête illisible.")
        studio, result = self.studio, {}
        try:
            if path == "/api/analyser":
                studio.analyze(str(body.get("source") or ""))
            elif path == "/api/avis":
                result = studio.feedback(str(body.get("id") or ""), str(body.get("raison") or ""),
                                         str(body.get("texte") or ""), body.get("action"), body.get("joueur"))
            elif path == "/api/titre":
                clip = body.get("clip")
                result = studio.set_title(str(body.get("titre") or ""), clip if isinstance(clip, int) else 0)
            elif path == "/api/valider":
                studio.validate()
            elif path == "/api/retour":
                studio.back()
            elif path == "/api/nouveau":
                studio.reset()
            elif path == "/api/ouvrir":
                studio.open_output()
            else:
                return self._error(404, "Action inconnue.")
        except UserError as exc:
            return self._error(400, str(exc))
        self._json(result)

    # --- sécurité : seulement cette page, sur ce PC ------------------------------------------------

    def _host_ok(self) -> bool:
        return (self.headers.get("Host") or "") in self.server.hosts  # type: ignore[attr-defined]

    def _origin_ok(self) -> bool:
        origin = self.headers.get("Origin")
        return origin is None or origin.removeprefix("http://") in self.server.hosts  # type: ignore[attr-defined]

    def _cookie_ok(self) -> bool:
        try:
            cookie = SimpleCookie(self.headers.get("Cookie") or "")
        except CookieError:
            return False
        morsel = cookie.get(COOKIE)
        return morsel is not None and secrets.compare_digest(morsel.value, self.server.token)  # type: ignore[attr-defined]

    # --- réponses ----------------------------------------------------------------------------------

    def _page(self) -> None:
        config = {"raisons": list(REASONS.items()), "raisons_accroche": list(TEASER_REASONS.items()),
                  "actions": list(ACTIONS.items())}
        data = PAGE.read_text(encoding="utf-8").replace(
            "{{CONFIG}}", json.dumps(config, ensure_ascii=False).replace("</", "<\\/")
        ).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Set-Cookie", f"{COOKIE}={self.server.token}; Path=/; SameSite=Strict; HttpOnly")  # type: ignore[attr-defined]
        self.end_headers()
        self.wfile.write(data)

    def _json(self, data: dict, status: int = 200) -> None:
        self._send(json.dumps(data, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8", status)

    def _error(self, status: int, message: str) -> None:
        self._json({"erreur": message}, status)

    def _send(self, data: bytes, content_type: str, status: int = 200, cache: bool = False) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "max-age=3600" if cache else "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _file(self, path: Path | None, content_type: str, cache: bool = False) -> None:
        """Envoie un fichier, par morceaux si le navigateur le demande (lecture vidéo, avance rapide)."""
        if path is None or not path.is_file():
            return self._error(404, "Fichier introuvable.")
        size = path.stat().st_size
        start, end, status = 0, size - 1, 200
        wanted = re.fullmatch(r"bytes=(\d*)-(\d*)", (self.headers.get("Range") or "").strip())
        if wanted and (wanted[1] or wanted[2]):
            if wanted[1]:
                start = int(wanted[1])
                end = min(int(wanted[2]), size - 1) if wanted[2] else size - 1
            else:  # « bytes=-500 » : les 500 derniers octets
                start = max(0, size - int(wanted[2]))
            if start > end:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            status = 206
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Cache-Control", "max-age=3600" if cache else "no-cache")
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        with path.open("rb") as stream:
            stream.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                chunk = stream.read(min(CHUNK, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = False  # sous Windows, cette option laisserait deux hoopcut écouter le même port

    def __init__(self, address: tuple[str, int], studio: Studio):
        super().__init__(address, Handler)
        self.studio = studio
        self.token = secrets.token_urlsafe(24)
        port = self.server_address[1]
        self.hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.server_address[1]}/"

    def handle_error(self, request, client_address) -> None:
        if isinstance(sys.exc_info()[1], (ConnectionError, TimeoutError)):
            return  # le navigateur a fermé une connexion (avance dans la vidéo, page fermée) : rien d'anormal
        super().handle_error(request, client_address)


def serve(studio: Studio, port: int = PORT, open_browser: bool = True) -> int:
    try:
        server = Server(("127.0.0.1", port), studio)
    except OSError:
        if _already_running(port):
            print("hoopcut est déjà ouvert : je l'affiche dans le navigateur.")
            if open_browser:
                webbrowser.open(f"http://127.0.0.1:{port}/")
            return 0
        server = Server(("127.0.0.1", 0), studio)
    print()
    print("=== hoopcut : un short basket de 60 à 80 secondes ===")
    print()
    print(f"La page s'ouvre dans ton navigateur : {server.url}")
    print("Laisse cette fenêtre ouverte pendant que tu utilises hoopcut ; ferme-la pour l'arrêter.")
    print()
    if open_browser:
        threading.Timer(0.4, webbrowser.open, args=(server.url,)).start()
    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        print("\nhoopcut arrêté.")
    finally:
        server.server_close()
    return 0


def _already_running(port: int) -> bool:
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/ping", timeout=2) as reply:
            return reply.read() == b"hoopcut"
    except OSError:
        return False


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):  # accents corrects dans le terminal Windows
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    load_dotenv(Path.cwd() / ".env")
    parser = argparse.ArgumentParser(
        prog="hoopcut-interface",
        description="hoopcut dans le navigateur. Les autres options sont celles de la ligne de commande "
        "(--musique, --ia gemini, --duree-max…).",
    )
    parser.add_argument("--port", type=int, default=PORT)
    parser.add_argument("--sans-navigateur", action="store_true", help="ne pas ouvrir le navigateur")
    args, rest = parser.parse_known_args(argv)
    options = build_parser().parse_args(["-", *rest])  # mêmes réglages que la ligne de commande
    try:
        job = job_from_args(options)
    except FileNotFoundError as exc:
        print(f"Erreur : {exc}", file=sys.stderr)
        return 1
    music = None if options.sans_musique else (options.musique or DEFAULT_MUSIC_DIR)
    return serve(Studio(job, music), args.port, open_browser=not args.sans_navigateur)


if __name__ == "__main__":
    sys.exit(main())
