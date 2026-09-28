"""Analyse 100 % locale : Qwen3.5-4B (via llama.cpp) regarde la vidéo, Whisper écoute les commentaires.

Rien ne quitte l'ordinateur. La vidéo est découpée en fenêtres d'environ 30 s, coupées si possible sur un
changement de plan. Chaque fenêtre est donnée au modèle par son entrée vidéo native : les images, dans
l'ordre et horodatées, sont fusionnées deux par deux par son encodeur pour percevoir le mouvement. Il reçoit
aussi ce que disent les commentateurs à ce moment-là, et répond en JSON imposé (liste des actions).
Ses réponses sont ensuite recoupées avec les commentaires (type d'action annoncé, tir raté, enthousiasme)
et avec le bruit du public.

Chaque fenêtre analysée est gardée sur le disque : une analyse interrompue reprend où elle s'était arrêtée.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import shutil
import socket
import subprocess
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Callable

from .analyze import AnalysisError
from .engines import LocalPaths, local_paths
from .ffmpeg_utils import MediaInfo, run
from .heuristic import loudness_curve
from .models import ACTIONS, Analysis, Moment
from .prompts import (
    LOCAL_NAMES_PROMPT,
    LOCAL_OVERVIEW_PROMPT,
    LOCAL_SCORE_PROMPT,
    LOCAL_SHOT_PROMPT,
    LOCAL_SUMMARY_PROMPT,
    LOCAL_VIEW_PROMPT,
    LOCAL_WINDOW_PROMPT,
)
from .text_utils import fold, format_timecode, same_name
from .transcribe import Segment, Transcriber

MODEL_NAME = "Qwen3.5-4B (local)"
SERVER_FPS = 2.0  # images prélevées par seconde d'extrait par le moteur, fusionnées deux par deux
LOCAL_POST_ROLL = 3.0  # secondes gardées après le geste décisif (le modèle le situe à 1 ou 2 s près)
Log = Callable[[str], None]

# Spectacle « typique » de chaque type d'action : tempère les notes d'un petit modèle, parfois fantaisistes
TYPE_PRIOR = {
    "dunk": 8, "alley_oop": 9, "buzzer_beater": 9, "block": 7, "and_one": 7, "three_pointer": 6,
    "fast_break": 6, "crossover": 6, "steal": 5, "assist": 5, "basket": 5, "layup": 4, "mid_range": 4,
    "free_throw": 1, "other": 3,
}
# Types de tir que le petit modèle confond entre eux : affichés seulement si les commentateurs les confirment
UNCERTAIN_SHOTS = {"three_pointer", "layup", "mid_range"}
SHOTS = {"dunk", "alley_oop", "three_pointer", "layup", "mid_range", "free_throw", "fast_break", "buzzer_beater",
         "basket"}
WINDOW_ACTIONS = ["dunk", "alley_oop", "three_pointer", "block", "steal", "fast_break", "layup", "mid_range",
                  "free_throw", "other"]
TOP_CHECKED = 24  # meilleures actions vérifiées image par image (prise de vue, tableau de score)
SCOREBOARD_CROPS = {  # zone (x, y, largeur, hauteur) en fraction de l'image, pour lire le score
    "top_left": (0.0, 0.0, 0.5, 0.34), "top_center": (0.25, 0.0, 0.5, 0.34), "top_right": (0.5, 0.0, 0.5, 0.34),
    "bottom_left": (0.0, 0.66, 0.5, 0.34), "bottom_center": (0.25, 0.66, 0.5, 0.34),
    "bottom_right": (0.5, 0.66, 0.5, 0.34),
}


@dataclass
class LocalSettings:
    # Images par seconde de match regardées, fusionnées deux par deux par l'encodeur vidéo. À 1, une paire
    # couvre 2 s de jeu : deux fois plus rapide qu'à 2, pour des actions repérées presque aussi bien.
    fps: float = 1.0
    width: int = 448  # largeur des images analysées (448 x 252)
    window: float = 30.0  # durée d'une fenêtre d'analyse
    overlap: float = 4.0  # chevauchement entre fenêtres, pour ne pas couper une action en deux
    commentary: bool = True  # transcription des commentaires (Whisper)
    scores: bool = True  # lecture du tableau de score (résumés de match)
    context: int = 12288
    timeout: float = 900.0


@dataclass
class Overview:
    video_type: str = "other"
    team_a: str | None = None
    team_b: str | None = None
    jersey_a: str | None = None
    jersey_b: str | None = None
    competition: str | None = None
    scoreboard: str = "none"

    @property
    def is_match(self) -> bool:
        return self.video_type == "match" and bool(self.team_a and self.team_b)


def analyze_local(
    video: Path,
    info: MediaInfo,
    cuts: list[float],
    title: str,
    channel: str | None,
    work_dir: Path,
    settings: LocalSettings,
    log: Log = print,
    description: str | None = None,
) -> Analysis:
    paths = local_paths()
    use_whisper = settings.commentary and info.has_audio
    missing = paths.missing(with_whisper=use_whisper)
    if missing:
        raise AnalysisError(
            "L'IA locale n'est pas installée (fichiers manquants : "
            + ", ".join(p.name for p in missing)
            + "). Lance installer.bat, ou utilise --ia gemini."
        )
    media = work_dir / "ia_locale"
    media.mkdir(exist_ok=True)
    started = time.monotonic()

    written = description_names(description)  # noms bien orthographiés dans la description YouTube
    hint = f"{title}. {', '.join(written)}" if written else title  # aide Whisper à bien écrire les noms
    transcriber = Transcriber(paths, video, work_dir, info.duration, hint=hint).start() if use_whisper else None
    if transcriber and not transcriber.done:
        log("      Whisper écoute les commentaires en parallèle (sur le processeur)…")
    try:
        with LlamaServer(paths, media, work_dir / "ia_locale.log", settings, log) as server:
            overview = _overview(server, video, info, title, channel, transcriber, media, log)
            windows = plan_windows(info.duration, cuts, settings.window, settings.overlap)
            log(f"      {len(windows)} fenêtres de ~{settings.window:.0f} s à regarder")
            moments: list[Moment] = []
            spent: list[float] = []  # durée des fenêtres réellement calculées (hors reprises)
            for index, (a, b) in enumerate(windows):
                window_started = time.monotonic()
                found = _window(server, video, index, a, b, overview, transcriber, media, settings, log)
                if time.monotonic() - window_started > 2.0:
                    spent.append(time.monotonic() - window_started)
                moments.extend(found)
                _log_progress(index, windows, found, spent, log)
            moments = merge_moments(moments)
            for m in moments:
                # Début et fin donnés par un petit modèle : peu fiables. On laisse de la marge, le choix
                # des clips recadre ensuite autour du geste décisif et sur les changements de plan.
                m.start = round(max(0.0, min(m.start, m.key - 5.0)), 2)
                m.end = round(min(info.duration, max(m.end, m.key + LOCAL_POST_ROLL + 0.5)), 2)
            segments = transcriber.segments if transcriber else []
            raw = {id(m): m.spectacular for m in moments}  # note donnée par le modèle, avant nos ajustements
            curve = loudness_curve(video) if info.has_audio else []
            _rate(moments, raw, curve, segments, {})
            # Vérifications image par image réservées aux meilleures candidates : ce sont elles qui iront
            # dans le short, et chaque image coûte 1 à 2 s à la carte graphique.
            pool = sorted((m for m in moments if not m.replay), key=lambda m: m.spectacular, reverse=True)
            candidates = _check_views(server, video, pool, TOP_CHECKED, media, log)
            _trim_to_live_play(server, video, info, candidates, cuts, media, log)
            baskets: dict[str, tuple[str | None, int]] = {}
            if settings.scores and overview.is_match and overview.scoreboard in SCOREBOARD_CROPS:
                baskets, duplicates = _read_scores(server, video, info, candidates, overview, cuts, media, log)
                moments = [m for m in moments if f"{m.key:.2f}" not in duplicates]
            _rate(moments, raw, curve, segments, baskets)
            for m in moments:
                if not m.player:
                    continue
                m.player = canonical_player(m.player, written)  # « Fuzo Dada » -> « Fodzo Dada »
                if read_on_screen(m.player):
                    continue  # lu dans une incrustation de la chaîne : pas besoin de l'avoir entendu
                # Nom gardé seulement s'il est écrit (titre, description) ou prononcé autour de l'action :
                # un nom entendu ailleurs dans la vidéo a toutes les chances d'être celui d'un autre joueur.
                heard = " ".join(s.text for s in segments if s.end >= m.key - 6.0 and s.start <= m.key + 6.0)
                if not _name_allowed(m.player, fold(f"{title} {description or ''} {heard}")):
                    m.player = None
            _fix_spelling(server, moments, title, overview, written, log)
            summary = _summary(server, title, channel, overview, moments, log, description)
    finally:
        if transcriber:
            transcriber.stop()
    if transcriber and transcriber.error:
        log(f"      (Transcription des commentaires impossible : {transcriber.error})")
    minutes, seconds = divmod(round(time.monotonic() - started), 60)
    log(f"      Analyse locale terminée en {minutes} min {seconds:02d} s")
    return Analysis(
        source_duration=info.duration,
        analyzer="locale",
        model=MODEL_NAME,
        video_type=overview.video_type,
        team_a=overview.team_a if overview.is_match else None,
        team_b=overview.team_b if overview.is_match else None,
        competition=overview.competition,
        source_has_music=bool(description and _MUSIC_CREDIT.search(description)),
        title=short_title(summary.get("title", "")),
        description=summary.get("description", "").strip(),
        hashtags=[_hashtag(h) for h in summary.get("hashtags", []) if _hashtag(h)],
        moments=moments,
    )


# ---------------------------------------------------------------- serveur llama.cpp


class LlamaServer:
    """llama-server lancé en arrière-plan le temps de l'analyse (modèle chargé une seule fois)."""

    def __init__(self, paths: LocalPaths, media_dir: Path, log_file: Path, settings: LocalSettings, log: Log):
        self.paths, self.media_dir, self.log_file, self.settings, self.log = paths, media_dir, log_file, settings, log
        self.process: subprocess.Popen | None = None
        self.url = ""

    def __enter__(self) -> "LlamaServer":
        port = _free_port()
        self.url = f"http://127.0.0.1:{port}"
        cmd = [
            str(self.paths.llama_server), "-m", str(self.paths.model), "--mmproj", str(self.paths.mmproj),
            "-ngl", "99", "-c", str(self.settings.context), "-np", "1", "--host", "127.0.0.1", "--port", str(port),
            "--no-webui", "--reasoning", "off", "--media-path", str(self.media_dir),
            "--video-fps", f"{SERVER_FPS:g}", "--video-timestamp-interval", "1000",
        ]
        ffmpeg = shutil.which("ffmpeg")
        if ffmpeg:
            cmd += ["--video-ffmpeg-dir", str(Path(ffmpeg).parent)]
        # Garde en cache les noyaux CUDA compilés au premier lancement (sinon ~1 min à chaque démarrage)
        env = {**os.environ, "CUDA_CACHE_MAXSIZE": "4294967296"}
        flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        self.log("      Chargement du modèle vidéo local sur la carte graphique…")
        self._log_handle = self.log_file.open("w", encoding="utf-8", errors="replace")
        self.process = subprocess.Popen(cmd, stdout=self._log_handle, stderr=subprocess.STDOUT, env=env,
                                        creationflags=flags)
        try:
            self._wait_ready(timeout=600)
        except BaseException:
            self.__exit__(None, None, None)
            raise
        return self

    def _wait_ready(self, timeout: float) -> None:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                raise AnalysisError(f"Le moteur local s'est arrêté au démarrage :\n{self._log_tail()}")
            try:
                with urllib.request.urlopen(self.url + "/health", timeout=2) as response:
                    if json.loads(response.read()).get("status") == "ok":
                        return
            except (OSError, ValueError):
                pass
            time.sleep(0.5)
        raise AnalysisError(f"Le moteur local ne répond pas après {timeout:.0f} s :\n{self._log_tail()}")

    def _log_tail(self, lines: int = 12) -> str:
        self._log_handle.flush()
        text = self.log_file.read_text(encoding="utf-8", errors="replace").strip().splitlines()
        return "\n".join(text[-lines:])

    def ask(self, content: list[dict], schema: dict, max_tokens: int = 1200) -> dict:
        payload = {
            "messages": [{"role": "user", "content": content}],
            "max_tokens": max_tokens,
            "temperature": 0.1,
            "top_p": 0.8,
            "seed": 7,
            "cache_prompt": False,
            "response_format": {"type": "json_schema", "json_schema": {"name": "reponse", "schema": schema}},
        }
        request = urllib.request.Request(self.url + "/v1/chat/completions", data=json.dumps(payload).encode(),
                                         headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=self.settings.timeout) as response:
                body = json.loads(response.read())
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")[:500]
            raise AnalysisError(f"Le moteur local a refusé la requête ({exc.code}) : {detail}") from exc
        except OSError as exc:
            if self.process.poll() is not None:
                raise AnalysisError(f"Le moteur local s'est arrêté :\n{self._log_tail()}") from exc
            raise AnalysisError(f"Le moteur local ne répond pas : {exc}") from exc
        text = body["choices"][0]["message"].get("content") or ""
        try:
            return json.loads(text)
        except ValueError as exc:
            raise AnalysisError(f"Réponse illisible du modèle local : {text[:300]}") from exc

    def __exit__(self, *exc) -> None:
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.process.kill()
        if getattr(self, "_log_handle", None):
            self._log_handle.close()


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


# ---------------------------------------------------------------- étapes de l'analyse


def _overview(server: LlamaServer, video: Path, info: MediaInfo, title: str, channel: str | None,
              transcriber: Transcriber | None, media: Path, log: Log) -> Overview:
    """Type de vidéo, équipes, couleurs des maillots, compétition, place du tableau de score."""
    cache = media / "apercu.json"
    if cache.exists():
        return Overview(**json.loads(cache.read_text(encoding="utf-8")))
    log("      Coup d'œil général (équipes, maillots, tableau de score)…")
    count = 6
    times = [info.duration * (i + 1) / (count + 1) for i in range(count)]
    images = [_image_part(_frame(video, t, media / f"apercu_{i}.jpg", width=640)) for i, t in enumerate(times)]
    commentary = ""
    if transcriber and transcriber.wait_until(90.0, timeout=120):
        words = " ".join(s.text for s in transcriber.between(0, 90))[:600]
        if words:
            commentary = f"Début des commentaires : « {words} »"
    prompt = LOCAL_OVERVIEW_PROMPT.format(count=count, title=title, channel=f" (chaîne : {channel})" if channel else "",
                                          commentary=commentary)
    nullable = {"type": ["string", "null"]}
    schema = {
        "type": "object",
        "properties": {
            "video_type": {"enum": ["match", "compilation", "other"]},
            "team_a": nullable, "team_b": nullable, "jersey_a": nullable, "jersey_b": nullable,
            "competition": nullable,
            "scoreboard": {"enum": [*SCOREBOARD_CROPS, "none"]},
        },
        "required": ["video_type", "team_a", "team_b", "jersey_a", "jersey_b", "competition", "scoreboard"],
    }
    data = server.ask([*images, {"type": "text", "text": prompt}], schema, max_tokens=200)
    overview = Overview(**{k: (v.strip() if isinstance(v, str) else v) for k, v in data.items() if k in schema["properties"]})
    if overview.video_type != "match":
        overview.team_a = overview.team_b = overview.jersey_a = overview.jersey_b = None
    cache.write_text(json.dumps(overview.__dict__, ensure_ascii=False, indent=2), encoding="utf-8")
    if overview.is_match:
        log(f"      Match : {overview.team_a} ({overview.jersey_a}) contre {overview.team_b} ({overview.jersey_b})")
    else:
        log(f"      Type de vidéo : {overview.video_type}")
    return overview


def plan_windows(duration: float, cuts: list[float], length: float, overlap: float) -> list[tuple[float, float]]:
    """Fenêtres d'environ `length` s, coupées si possible sur un changement de plan : le modèle voit alors
    des actions entières. Sans changement de plan à proximité, deux fenêtres se chevauchent de `overlap` s
    pour qu'aucune action ne soit coupée en deux."""
    windows: list[tuple[float, float]] = []
    start = 0.0
    while start < duration - 1.0:
        target = start + length
        near = [c for c in cuts if start + 0.6 * length <= c <= start + 1.25 * length]
        if duration - target < 0.35 * length:  # pas de petite fenêtre finale : on allonge la dernière
            end = duration
        elif near:
            end = min(near, key=lambda c: abs(c - target))
        else:
            end = target
        windows.append((round(start, 2), round(end, 2)))
        if end >= duration:
            break
        start = end if near else end - overlap
    return windows


def _window(server: LlamaServer, video: Path, index: int, a: float, b: float, overview: Overview,
            transcriber: Transcriber | None, media: Path, settings: LocalSettings, log: Log) -> list[Moment]:
    # La consigne et les réglages font partie du nom : si on les modifie, la fenêtre est regardée à nouveau
    tag = hashlib.sha1(f"{LOCAL_WINDOW_PROMPT}|{settings.fps:g}|{settings.width}".encode()).hexdigest()[:8]
    cache = media / f"fenetre_{index:03d}_{a:.1f}_{b:.1f}_{tag}.json"
    if cache.exists():
        return [Moment(**m) for m in json.loads(cache.read_text(encoding="utf-8"))]
    clip = media / f"fenetre_{index:03d}.mp4"
    height = round(settings.width * 9 / 16 / 2) * 2
    # Le moteur prélève 2 images par seconde de l'extrait et les fusionne par paires ; le calcul dépend du
    # nombre de paires. Pour regarder `fps` images par seconde de match, l'extrait est accéléré d'un facteur
    # 2 / fps : à 1 image/s, une paire couvre 2 s de jeu et la fenêtre est analysée deux fois plus vite.
    # Le modèle ne voit que le temps de l'extrait ; ses réponses sont remises à l'échelle du match.
    speed = SERVER_FPS / settings.fps
    scale = f"scale={settings.width}:{height}" + (f",setpts=PTS/{speed:g}" if speed != 1 else "")
    run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", str(video),
         "-an", "-vf", scale, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", str(clip)])
    commentary = ""
    if transcriber:
        transcriber.wait_until(b, timeout=900)
        lines = [f"[{max(0.0, s.start - a) / speed:.1f} s] {s.text}" for s in transcriber.between(a, b)]
        if lines:
            commentary = "Paroles des commentateurs pendant l'extrait :\n" + "\n".join(lines)[:1500]
    if overview.is_match:
        context = (f"match {overview.team_a} (maillots {overview.jersey_a}) contre {overview.team_b} "
                   f"(maillots {overview.jersey_b})")
        teams = (f"{overview.team_a} (maillots {overview.jersey_a}), {overview.team_b} "
                 f"(maillots {overview.jersey_b}), ou null si tu ne sais pas")
        team_schema: dict = {"enum": [overview.team_a, overview.team_b, None]}
    else:
        context = "compilation d'actions" if overview.video_type == "compilation" else "vidéo de basket"
        teams = "nom de l'équipe si tu la reconnais (maillot, commentaires), sinon null"
        team_schema = {"type": ["string", "null"]}
    prompt = LOCAL_WINDOW_PROMPT.format(duration=round((b - a) / speed), context=context, fps=SERVER_FPS,
                                        commentary=commentary, teams=teams)
    schema = {
        "type": "object",
        "properties": {
            "actions": {
                "type": "array",
                "maxItems": 12,
                "items": {
                    "type": "object",
                    "properties": {
                        "key": {"type": "number"}, "start": {"type": "number"}, "end": {"type": "number"},
                        "action": {"enum": WINDOW_ACTIONS},
                        "team": team_schema,
                        "player": {"type": ["string", "null"]},
                        "scored": {"type": "boolean"}, "replay": {"type": "boolean"},
                        "spectacular": {"type": "integer", "minimum": 1, "maximum": 10},
                        "description": {"type": "string"},
                    },
                    "required": ["key", "start", "end", "action", "team", "player", "scored", "replay",
                                 "spectacular", "description"],
                },
            }
        },
        "required": ["actions"],
    }
    video_part = {"type": "input_video", "input_video": {"url": f"file://{clip.name}"}}
    data = server.ask([video_part, {"type": "text", "text": prompt}], schema)
    clip.unlink(missing_ok=True)
    moments = window_moments(data.get("actions", []), a, b, overview, time_scale=speed)
    cache.write_text(json.dumps([m.model_dump() for m in moments], ensure_ascii=False, indent=1), encoding="utf-8")
    return moments


def window_moments(items: list[dict], a: float, b: float, overview: Overview, time_scale: float = 1.0) -> list[Moment]:
    """Réponse du modèle (temps relatifs à l'extrait) -> moments (temps absolus du match), bornes vérifiées."""
    span = b - a
    moments = []
    for item in items:
        try:
            key, start, end = (float(item[k]) * time_scale for k in ("key", "start", "end"))
        except (KeyError, TypeError, ValueError):
            continue
        key = min(max(key, 0.0), span)
        start = min(max(start, 0.0), key)
        end = min(max(end, key), span)
        action = item.get("action") if item.get("action") in ACTIONS else "other"
        spectacular = int(min(max(item.get("spectacular") or 5, 1), 10))
        if action in SHOTS and item.get("scored") is False:
            continue  # tir raté : ce n'est pas un moment fort
        team = item.get("team")
        if overview.is_match:
            team = next((t for t in (overview.team_a, overview.team_b) if same_name(t, team)), None)
        moments.append(
            Moment(
                start=round(a + start, 2),
                key=round(a + key, 2),
                end=round(a + end, 2),
                action=action,
                description=str(item.get("description") or "").strip(),
                team=(team or "").strip() or None,
                player=(item.get("player") or "").strip() or None,
                spectacular=spectacular,
                importance=5,
                replay=bool(item.get("replay")),
            )
        )
    return moments


def merge_moments(moments: list[Moment], gap: float = 3.0) -> list[Moment]:
    """Une même action vue dans deux fenêtres qui se chevauchent n'est gardée qu'une fois."""
    kept: list[Moment] = []
    for m in sorted(moments, key=lambda m: m.key):
        twin = next((k for k in reversed(kept) if abs(k.key - m.key) < gap and k.replay == m.replay), None)
        if twin is None:
            kept.append(m)
            continue
        best, other = (m, twin) if m.spectacular > twin.spectacular else (twin, m)
        best.player = best.player or other.player
        best.team = best.team or other.team
        best.start, best.end = min(best.start, other.start), max(best.end, other.end)
        kept[kept.index(twin)] = best
    return kept


def _rate(moments: list[Moment], raw: dict[int, int], curve: list[tuple[float, float]], segments: list[Segment],
          baskets: dict[str, tuple[str | None, int]]) -> None:
    """Note finale : avis du modèle, type d'action, tableau de score, réaction du public et des commentateurs."""
    levels = sorted(level for _, level in curve)
    loud = levels[int(0.8 * (len(levels) - 1))] if levels else None
    for m in moments:
        team, points = baskets.get(f"{m.key:.2f}", (None, None))
        if not m.replay:
            m.action = settle_action(m.action, segments, m.key, points)
        if team:
            m.team = team  # le tableau sait mieux que le modèle quelle équipe a marqué
        # Équipe affichée sous le clip seulement si le tableau de score l'a confirmée : le modèle se trompe
        # souvent (sur un contre, il donne l'équipe du tireur). Sa supposition sert quand même au focus.
        m.team_sure = bool(team)
        # La note du modèle varie beaucoup d'une fenêtre à l'autre : le type d'action pèse davantage
        # (un dunk, un alley-oop ou un contre font plus d'effet qu'un panier ordinaire).
        value = 0.45 * raw.get(id(m), m.spectacular) + 0.55 * TYPE_PRIOR.get(m.action, 3)
        if commentary_type(segments, m.key) in ("dunk", "alley_oop", "block") and not m.replay:
            value += 1.0  # geste spectaculaire annoncé par les commentateurs eux-mêmes
        if loud is not None:
            reaction = [level for t, level in curve if m.key <= t <= m.key + 3.0]
            if reaction and max(reaction) >= loud:
                value += 1.0  # le public ou le commentateur s'enflamme
        value += commentary_reaction(segments, m.key)
        m.spectacular = int(min(10, max(1, round(value))))
        # Importance laissée neutre (5) : un petit modèle ne sait pas juger le poids d'une action dans le match,
        # et un bonus « fin de match » pour tout le monde remplirait le short des dernières minutes.


# Réactions des commentateurs (français et anglais), cherchées dans le texte sans accents
_EXCITED = re.compile(
    r"\b(bim|boum|waouh|wow|enorme|incroyable|magnifique|superbe|splendide|sublime|fantastique|exceptionnel\w*"
    r"|spectaculaire|phenomenal\w*|monstrueu\w*|quelle? (action|panier|dunk|contre|shoot|tir|passe|geste)"
    r"|dunk\w*|smash\w*|claquette|a deux mains|alley|poster\w*|buzzer|sirene|bingo|ficelle|and one|what a"
    r"|oh my|holy|huge|slam\w*|jam|throws it down|hammer\w*|facial|nasty|filthy|vicious|ferocious|thunderous"
    r"|monster|rejected|swat\w*|downtown|splash|bang|unbelievable|incredible|no regard)\b"
)
_MISSED = re.compile(
    r"\b(oh non|ratee?s?|manquee?s?|a cote|il faut les mettre|ne rentre pas|pas dedans|loupee?s?|trop court"
    r"|trop long|miss(es|ed)?|no good|off the rim|rims? out|airball|turnover)\b"
)


# Mots des commentateurs qui disent sans ambiguïté le type d'action (texte en minuscules, accents gardés :
# « contré » est un contre, « contre » seul peut vouloir dire « face à »). Du plus précis au plus général.
_TYPE_WORDS = [
    ("alley_oop", re.compile(r"\balley[- ]?oop\b|\balley\b")),
    ("dunk", re.compile(r"\b(dunk\w*|smash\w*|à deux mains|claquette|slam\w*|jam|throws? it down|posteri\w*"
                        r"|tomahawk|windmill|moulin à vent)\b")),
    ("block", re.compile(r"\b(contrée?s?|contré|(un|le|gros|quel|énorme|superbe|magnifique) contre|blocked"
                         r"|block|rejected|swat\w*|denied)\b")),
    ("steal", re.compile(r"\b(interception|intercept\w*|vol de balle|chipe|steals?|picked off)\b")),
    ("three_pointer", re.compile(r"\b(à ?3 points|à trois points|3 points|trois points|primé|derrière l'arc"
                                 r"|from downtown|from deep|three-?pointers?|3-pointers?|for three|from three"
                                 r"|a three(?![- ]on)|the three(?![- ]on))\b")),
    ("layup", re.compile(r"\b(lay-?up|double[- ]pas|finger roll)\b")),
    ("free_throw", re.compile(r"\b(lancers? francs?|free throws?)\b")),
]


def commentary_type(segments: list[Segment], key: float) -> str | None:
    """Type d'action annoncé par les commentateurs juste autour de l'instant clé, s'il est clair.
    Un petit modèle confond souvent les tirs ; les commentateurs, eux, disent « à deux mains », « contré »…"""
    nearby = sorted((s for s in segments if s.end >= key - 2.0 and s.start <= key + 3.0),
                    key=lambda s: abs((s.start + s.end) / 2 - key))
    for segment in nearby:
        text = segment.text.lower()
        for action, pattern in _TYPE_WORDS:
            if pattern.search(text):
                return action
    return None


def settle_action(action: str, segments: list[Segment], key: float, points: int | None = None) -> str:
    """Type d'action affiché, du plus sûr au moins sûr :
    1. le tableau de score : +3 points, c'est un tir à 3 points ; +1, un lancer franc ;
    2. les commentateurs (« à deux mains », « contré »…) ;
    3. le modèle, sauf pour les tirs qu'il confond (3 points, lay-up, mi-distance) : on écrit alors « PANIER »."""
    announced = commentary_type(segments, key)
    if points in (3, 4):
        return "three_pointer"
    if points == 1:
        return "free_throw"
    if announced == "three_pointer" and (points == 2 or action in ("dunk", "alley_oop")):
        announced = None  # un dunk vu à l'image ne devient pas un tir à 3 points sur un seul mot entendu
    if announced:
        return announced
    return "basket" if action in UNCERTAIN_SHOTS else action


def commentary_reaction(segments: list[Segment], key: float) -> float:
    """Bonus si les commentateurs s'enflamment juste autour de l'action, malus s'ils la disent ratée."""
    text = fold(" ".join(s.text for s in segments if s.end >= key - 2.5 and s.start <= key + 3.5))
    words = " ".join(re.sub(r"[^\w]+", " ", text).split())
    excited = len(_EXCITED.findall(words))
    if _MISSED.search(words):
        return 0.0 if excited else -2.0
    return min(1.5, 0.5 * excited + (0.5 if text.count("!") >= 2 else 0.0))


def score_times(key: float, cuts: list[float], duration: float) -> tuple[float, float]:
    """Instants où lire le tableau de score avant et après une action. Avant : au début de son plan.
    Après : 5,5 s après le geste, car le tableau d'une chaîne TV se met à jour plusieurs secondes après
    le panier ; si le plan se termine avant, juste au début du plan suivant."""
    before = [c for c in cuts if key - 8.0 <= c <= key - 0.5]
    t_before = before[-1] + 0.3 if before else max(0.0, key - 5.0)
    t_after = key + 5.5
    next_cut = next((c for c in cuts if key + 0.3 <= c < t_after), None)
    if next_cut is not None:
        t_after = next_cut + 1.0
    return round(t_before, 2), round(min(t_after, duration - 0.1), 2)


def _views(server: LlamaServer, video: Path, frames: dict[str, float], media: Path,
           prompt: str = LOCAL_VIEW_PROMPT, width: int = 448) -> dict[str, str]:
    """Prise de vue (large, gros_plan, ralenti, autre) des images demandées {nom: instant}, gardée en cache."""
    tag = hashlib.sha1((prompt if width == 448 else f"{prompt}|{width}").encode()).hexdigest()[:8]
    cache = media / f"vues_{tag}.json"
    known = json.loads(cache.read_text(encoding="utf-8")) if cache.exists() else {}
    todo = [(name, t) for name, t in frames.items() if name not in known]
    for start in range(0, len(todo), 6):
        batch = todo[start:start + 6]
        images = [_image_part(_frame(video, t, media / f"vue_{i}.jpg", width=width)) for i, (_, t) in enumerate(batch)]
        schema = {"type": "object", "properties": {"views": {
            "type": "array", "minItems": len(batch), "maxItems": len(batch),
            "items": {"enum": ["large", "gros_plan", "ralenti", "autre"]}}}, "required": ["views"]}
        data = server.ask([*images, {"type": "text", "text": prompt}], schema, max_tokens=120)
        for (name, _), view in zip(batch, data.get("views", [])):
            known[name] = view
        cache.write_text(json.dumps(known), encoding="utf-8")
    return known


TRIM_OFFSETS = (-4.5, -3.0, -1.5, 0.0, 1.5, 3.0)  # images regardées autour du geste (s), 0 = le geste


def _trim_to_live_play(server: LlamaServer, video: Path, info: MediaInfo, moments: list[Moment],
                       cuts: list[float], media: Path, log: Log) -> None:
    """Les chaînes passent souvent au public, au banc ou à un ralenti juste avant ou après l'action, par une
    coupe franche ou par un fondu que le repérage des plans ne voit pas. On regarde donc une image toutes les
    1,5 s autour du geste décisif, et le clip ne s'étend que sur le jeu filmé en vue large qui l'entoure.
    Si le geste tombe sur un plan du public juste après du jeu, c'est que le panier a eu lieu avant : l'instant
    clé est ramené sur le jeu. S'il n'y a pas de jeu autour, l'action est écartée."""
    def samples(m: Moment) -> list[float]:
        return [round(min(max(m.key + offset, 0.0), info.duration - 0.1), 1) for offset in TRIM_OFFSETS]

    frames = {f"t_{t:.1f}": t for m in moments for t in samples(m)}
    if not frames:
        return
    log(f"      Vérification du jeu autour des meilleures actions ({len(frames)} images)…")
    known = _views(server, video, frames, media, prompt=LOCAL_SHOT_PROMPT, width=320)
    for m in moments:
        times = samples(m)
        wide = [known.get(f"t_{t:.1f}", "large") == "large" for t in times]
        k = TRIM_OFFSETS.index(0.0)
        if not wide[k]:
            before = [i for i in range(k) if wide[i]]
            if not before or k - before[-1] > 2:
                m.replay = True  # pas de jeu en vue large autour du geste : rien à montrer
                continue
            k = before[-1]
            m.key = times[k]
        first = last = k
        while first > 0 and wide[first - 1]:
            first -= 1
        while last < len(times) - 1 and wide[last + 1]:
            last += 1
        if first > 0:
            m.start = max(m.start, _transition(times[first - 1], times[first], cuts, entering=True))
        if last < len(times) - 1:
            m.end = min(m.end, _transition(times[last], times[last + 1], cuts, entering=False))
        m.start, m.end = round(min(m.start, m.key), 2), round(max(m.end, m.key), 2)


def _transition(a: float, b: float, cuts: list[float], entering: bool) -> float:
    """Frontière entre une image hors jeu (a ou b) et une image de jeu : le changement de plan repéré entre
    les deux s'il y en a un, sinon le milieu (fondu enchaîné)."""
    inside = [c for c in cuts if a < c < b]
    if inside:
        return inside[-1] + 0.04 if entering else inside[0] - 0.04
    return (a + b) / 2


def _check_views(server: LlamaServer, video: Path, pool: list[Moment], wanted: int, media: Path,
                 log: Log) -> list[Moment]:
    """Regarde l'image du geste décisif des meilleures actions (dans l'ordre de `pool`) jusqu'à en trouver
    `wanted` filmées en vue large par la caméra principale. Les autres (ralenti, gros plan, public…) sont
    écartées comme des ralentis : les chaînes gardent souvent le tableau de score pendant les ralentis,
    lui ne suffit donc pas à les reconnaître. Renvoie les actions retenues."""
    checked: list[Moment] = []
    wide: list[Moment] = []
    for start in range(0, len(pool), 6):
        if len(wide) >= wanted:
            break
        batch = pool[start:start + 6]
        if not checked:
            log("      Vérification de la prise de vue des meilleures actions (écarte ralentis et gros plans)…")
        known = _views(server, video, {f"{m.key:.2f}": m.key for m in batch}, media)
        for m in batch:
            checked.append(m)
            if known.get(f"{m.key:.2f}", "large") == "large":
                wide.append(m)
    if len(wide) < 0.5 * len(checked):  # vidéo qui n'est pas filmée « comme à la télé » : on ne juge pas
        return checked[:wanted]
    wide_ids = {id(m) for m in wide}
    for m in checked:
        if id(m) not in wide_ids:
            m.replay = True
    rejected = len(checked) - len(wide)
    if rejected:
        log(f"      {rejected} ralentis ou gros plans écartés")
    return wide[:wanted]


def basket_from_scores(before: list | None, after: list | None, team_a: str, team_b: str) -> tuple[str | None, int] | None:
    """Ce que dit le tableau entre avant et après l'action : (équipe qui a marqué, points).
    (None, 0) si rien n'a changé (tir raté ?) ; None si les lectures ne permettent pas de conclure."""
    if not before or not after or None in (*before, *after):
        return None
    gained_a, gained_b = after[0] - before[0], after[1] - before[1]
    if gained_a == gained_b == 0:
        return None, 0
    if gained_b == 0 and 1 <= gained_a <= 4:
        return team_a, gained_a
    if gained_a == 0 and 1 <= gained_b <= 4:
        return team_b, gained_b
    return None  # lecture douteuse ou plusieurs paniers dans le même plan


def _read_scores(server: LlamaServer, video: Path, info: MediaInfo, moments: list[Moment], overview: Overview,
                 cuts: list[float], media: Path, log: Log) -> tuple[dict[str, tuple[str | None, int]], set[str]]:
    """Lit le tableau de score avant et après chaque action (gros plan sur le tableau).
    Renvoie, par action, ce que l'écart entre les deux lectures révèle (qui a marqué et combien de points),
    et les actions en double : deux actions aux lectures identiques sont le même panier vu deux fois."""
    tag = hashlib.sha1(f"{LOCAL_SCORE_PROMPT}|v5".encode()).hexdigest()[:8]
    cache = media / f"tableau_score_{tag}.json"
    known = json.loads(cache.read_text(encoding="utf-8")) if cache.exists() else {}
    targets = [m for m in moments if not m.replay and f"{m.key:.2f}" not in known]
    if targets:
        log(f"      Lecture du tableau de score avant et après {len(targets)} actions…")
    x, y, w, h = SCOREBOARD_CROPS[overview.scoreboard]
    crop = f"crop=iw*{w}:ih*{h}:iw*{x}:ih*{y},scale=640:-2"
    prompt = LOCAL_SCORE_PROMPT.format(team_a=overview.team_a, team_b=overview.team_b)
    nullable_int = {"type": ["integer", "null"], "minimum": 0, "maximum": 250}
    for batch_start in range(0, len(targets), 4):
        batch = targets[batch_start:batch_start + 4]
        images = []
        for i, m in enumerate(batch):
            for j, t in enumerate(score_times(m.key, cuts, info.duration)):
                images.append(_image_part(_frame(video, t, media / f"score_{i}_{j}.jpg", vf=crop)))
        count = len(images)
        schema = {
            "type": "object",
            "properties": {"scores": {"type": "array", "minItems": count, "maxItems": count, "items": {
                "type": "object", "properties": {"score_a": nullable_int, "score_b": nullable_int},
                "required": ["score_a", "score_b"]}}},
            "required": ["scores"],
        }
        data = server.ask([*images, {"type": "text", "text": prompt}], schema, max_tokens=400)
        readings = [[s.get("score_a"), s.get("score_b")] for s in data.get("scores", [])]
        for i, m in enumerate(batch):
            known[f"{m.key:.2f}"] = {"avant": readings[2 * i] if 2 * i < len(readings) else None,
                                     "apres": readings[2 * i + 1] if 2 * i + 1 < len(readings) else None}
        cache.write_text(json.dumps(known), encoding="utf-8")

    live = [m for m in moments if not m.replay and f"{m.key:.2f}" in known]
    for m in live:
        entry = known[f"{m.key:.2f}"]
        m.score_a, m.score_b = shown_score(entry.get("avant"), entry.get("apres"))
    _drop_inconsistent_scores(moments)
    baskets: dict[str, tuple[str | None, int]] = {}
    same_basket: set[str] = set()
    duplicates: set[str] = set()
    for m in sorted(live, key=lambda m: m.spectacular, reverse=True):
        key = f"{m.key:.2f}"
        entry = known[key]
        found = basket_from_scores(entry.get("avant"), entry.get("apres"), overview.team_a, overview.team_b)
        if found is None or not found[1]:
            continue  # « rien n'a bougé » ne prouve rien : le tableau a souvent plusieurs secondes de retard
        signature = json.dumps([entry.get("avant"), entry.get("apres")])
        if signature in same_basket:
            duplicates.add(key)  # même panier que celui d'une action mieux notée
            continue
        same_basket.add(signature)
        baskets[key] = found
    return baskets, duplicates


def shown_score(before: list | None, after: list | None) -> tuple[int | None, int | None]:
    """Score affiché sous le clip : celui d'après l'action s'il est plausible (0 à 4 points de plus par
    équipe), sinon celui d'avant. Un « 24 » soudain, c'est le décompte des tirs lu à la place du score."""
    ok = [r for r in (before, after) if r and None not in r]
    if before in ok and after in ok:
        if all(0 <= a - b <= 4 for a, b in zip(after, before)):
            return after[0], after[1]
        return before[0], before[1]
    return (ok[0][0], ok[0][1]) if ok else (None, None)


def _drop_inconsistent_scores(moments: list[Moment]) -> None:
    """Un score ne baisse jamais au fil du match : on garde la plus longue suite de lectures cohérentes
    (les deux scores croissants) et on écarte les autres, sans doute mal lues."""
    readings = [m for m in sorted(moments, key=lambda m: m.key) if m.score_a is not None and m.score_b is not None]
    length = [1] * len(readings)
    previous = [-1] * len(readings)
    for j, later in enumerate(readings):
        for i in range(j):
            earlier = readings[i]
            if earlier.score_a <= later.score_a and earlier.score_b <= later.score_b and length[i] + 1 > length[j]:
                length[j], previous[j] = length[i] + 1, i
    kept = set()
    j = max(range(len(readings)), key=length.__getitem__, default=-1)
    while j >= 0:
        kept.add(j)
        j = previous[j]
    for index, m in enumerate(readings):
        if index not in kept:
            m.score_a = m.score_b = None


def _summary(server: LlamaServer, title: str, channel: str | None, overview: Overview, moments: list[Moment],
             log: Log, description: str | None = None) -> dict:
    best = sorted((m for m in moments if not m.replay), key=lambda m: m.spectacular, reverse=True)[:8]
    # Seulement le type d'action et les noms vérifiés : les descriptions du modèle citent parfois des noms mal
    # entendus, qui se retrouveraient dans le titre.
    actions = "\n".join(
        f"- {ACTIONS.get(m.action, 'ACTION')}{f' de {m.player}' if m.player else ''}"
        f"{f' ({m.team})' if m.team and not m.player else ''}" for m in best
    ) or "- (aucune)"
    if overview.is_match:
        context = f"Match {overview.team_a} contre {overview.team_b}" + (
            f" ({overview.competition})." if overview.competition else ".")
    else:
        context = "Compilation d'actions." if overview.video_type == "compilation" else ""
    about = " ".join(re.sub(r"https?://\S+", "", description or "").split())[:400]
    if about:
        context += f"\nDescription de la vidéo YouTube : « {about} »"
    prompt = LOCAL_SUMMARY_PROMPT.format(title=title, channel=f" ({channel})" if channel else "", context=context,
                                         actions=actions)
    schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string", "maxLength": 80},
            "description": {"type": "string"},
            "hashtags": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 8},
        },
        "required": ["title", "description", "hashtags"],
    }
    try:
        return server.ask([{"type": "text", "text": prompt}], schema, max_tokens=300)
    except AnalysisError as exc:
        log(f"      (Titre automatique impossible : {exc})")
        return {}


# ---------------------------------------------------------------- utilitaires


def _frame(video: Path, t: float, out: Path, width: int = 640, vf: str | None = None) -> Path:
    run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-ss", f"{t:.3f}", "-i", str(video), "-frames:v", "1",
         "-vf", vf or f"scale={width}:-2", "-q:v", "3", str(out)])
    return out


def _image_part(path: Path) -> dict:
    data = base64.b64encode(path.read_bytes()).decode()
    return {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{data}"}}


_FULL_NAME = re.compile(r"\b[A-ZÀ-Ý][\w'’-]+(?: [A-ZÀ-Ý][\w'’-]+){1,2}\b")  # « Tony Parker », « LeBron James »
_MUSIC_CREDIT = re.compile(r"music (provided|by)|musique|epidemic sound|artlist|soundstripe|no copyright music|🎵|🎶",
                           re.IGNORECASE)


def description_names(description: str | None) -> list[str]:
    """Noms propres de deux ou trois mots écrits dans la description (joueurs, en général bien orthographiés)."""
    names: list[str] = []
    for match in _FULL_NAME.finditer(description or ""):
        if match.group(0) not in names:
            names.append(match.group(0))
    return names[:40]


def canonical_player(player: str, written: list[str]) -> str:
    """Nom entendu par Whisper (« Fuzo Dada », « M. FORTO DADA ») -> nom écrit dans la description
    (« Fodzo Dada ») quand le nom de famille est le même ou presque."""
    words = fold(player).replace(".", " ").split()
    if not words or not written:
        return player
    best, score = player, 0.0
    for name in written:
        ratio = SequenceMatcher(None, words[-1], fold(name).split()[-1]).ratio()
        if ratio > score:
            best, score = name, ratio
    return best if score >= 0.8 else player


def _name_allowed(player: str, allowed: str) -> bool:
    words = [w for w in fold(player).replace("-", " ").split() if len(w) >= 3]
    return bool(words) and words[-1] in allowed


def _fix_spelling(server: LlamaServer, moments: list[Moment], title: str, overview: Overview, written: list[str],
                  log: Log) -> None:
    """Whisper écrit les noms comme il les entend (« Lemon yama », « Fabrice le François »). On n'affiche que
    les noms sûrs : écrits dans le titre ou la description, ou reconnus par le modèle comme de vrais joueurs
    (il propose alors la bonne orthographe, retenue seulement si elle ressemble à ce qui a été entendu, pour ne
    jamais remplacer un joueur par un autre). Les autres sont retirés : la légende montrera l'équipe."""
    on_screen = {m.player for m in moments if m.player and read_on_screen(m.player)}
    heard = sorted({m.player for m in moments if m.player and m.player not in written and m.player not in on_screen})
    verdicts: dict[str, str | None] = {name: display_name(name) for name in on_screen}
    if heard:
        context = f", match {overview.team_a} contre {overview.team_b}" if overview.is_match else ""
        if overview.competition:
            context += f" ({overview.competition})"
        prompt = LOCAL_NAMES_PROMPT.format(title=title, context=context, names="\n".join(f"- {n}" for n in heard))
        text = {"type": "string", "maxLength": 40}
        item = {"type": "object", "properties": {"heard": {"enum": heard}, "name": text, "known": {"type": "boolean"}},
                "required": ["heard", "name", "known"]}
        schema = {"type": "object", "properties": {"names": {
            "type": "array", "minItems": len(heard), "maxItems": len(heard), "items": item}}, "required": ["names"]}
        try:
            answer = server.ask([{"type": "text", "text": prompt}], schema, max_tokens=70 * len(heard) + 50)
        except AnalysisError as exc:
            log(f"      (Vérification des noms impossible : {exc})")
            answer = {}
        replies = {a.get("heard"): a for a in answer.get("names", [])}
        for name in heard:  # nom sans réponse : pas sûr, retiré
            reply = replies.get(name, {})
            verdicts[name] = trusted_name(name, str(reply.get("name", "")), bool(reply.get("known")))
    # Un même joueur sous deux formes (« Vezenkov », « Tasha Vezenkov ») : la plus courte, donc la plus prudente
    variants: dict[str, list[str]] = {}
    for name in {v for v in verdicts.values() if v}:
        variants.setdefault(fold(name).split()[-1], []).append(name)
    for names in variants.values():
        shortest = min(names, key=lambda n: (len(n.split()), len(n)))
        for heard_name, verdict in verdicts.items():
            if verdict in names:
                verdicts[heard_name] = shortest
    for m in moments:
        if m.player in verdicts:
            m.player = verdicts[m.player]


def read_on_screen(player: str) -> bool:
    """Nom écrit en capitales par le modèle (« DYLAN HARPER », « P. MILLS ») : il l'a lu dans une incrustation
    de la chaîne, pas entendu. C'est la source la plus sûre."""
    letters = [c for c in player if c.isalpha()]
    return len(letters) >= 4 and all(c.isupper() for c in letters)


def display_name(player: str) -> str:
    """« P. MILLS » -> « P. Mills », « PAUL O'REILLY » -> « Paul O'Reilly »."""
    return re.sub(r"[^\W\d_]+", lambda word: word.group(0).capitalize(), player)


def trusted_name(heard: str, proposed: str, known: bool) -> str | None:
    """Nom à afficher d'après la réponse du modèle, ou None s'il n'est pas sûr."""
    if not known:
        return None
    if fold(proposed) == fold(heard):
        return heard  # joueur reconnu, déjà bien écrit
    if not plausible_fix(heard, proposed):
        return None
    old, new = heard.split(), proposed.split()
    if len(old) >= 2 and len(new) >= 2 and fold(old[0]) == fold(new[0]) and fold(old[-1]) != fold(new[-1]):
        return new[-1]  # seul le nom de famille est corrigé : le prénom n'est que ce qui a été entendu
    return proposed.strip()  # joueur reconnu, orthographe corrigée


def plausible_fix(heard: str, fixed: str) -> bool:
    """Vrai si « fixed » est une autre orthographe crédible de « heard », et pas un autre joueur :
    - même nom de famille : on peut ajouter le prénom, mais pas remplacer un prénom entendu par un autre ;
    - nom de famille différent : seulement pour un nom long, très proche à l'oreille (« Lemon yama » ->
      « Wembanyama ») ; un nom court à une lettre près (Harper / Harden) est sans doute un autre joueur."""
    a, b = fold(heard).replace(".", " ").split(), fold(fixed).replace(".", " ").split()
    if not a or not b or a == b:
        return False
    if a[-1] == b[-1]:
        return len(a) == 1 or SequenceMatcher(None, a[0], b[0]).ratio() >= 0.7
    squeezed = "".join(a)
    if len(squeezed) < 7:
        return False
    return max(SequenceMatcher(None, squeezed, b[-1]).ratio(), SequenceMatcher(None, a[-1], b[-1]).ratio()) >= 0.7


def short_title(title: str, limit: int = 60) -> str:
    """Titre coupé entre deux mots (jamais au milieu d'un mot), sans petit mot ni ponctuation qui traîne."""
    title = " ".join(title.split())
    if len(title) <= limit:
        return title
    cut = title[:limit + 1].rsplit(" ", 1)[0]
    words = cut.split()
    while words and (fold(words[-1]) in {"et", "de", "du", "des", "la", "le", "les", "en", "au", "aux", "a", "pour",
                                         "sur", "avec", "un", "une", "the", "and", "of", "vs"}
                     or not any(ch.isalnum() for ch in words[-1])):
        words.pop()
    return " ".join(words).rstrip(" :,;-–—") or title[:limit]


def _hashtag(tag: str) -> str:
    tag = "".join(str(tag).split()).lstrip("#")
    return f"#{tag}" if tag else ""


def _log_progress(index: int, windows: list[tuple[float, float]], found: list[Moment], spent: list[float],
                  log: Log) -> None:
    a, b = windows[index]
    done = index + 1
    kinds = ", ".join(ACTIONS.get(m.action, "ACTION").lower() for m in found if not m.replay) or "rien de notable"
    eta = ""
    if spent and done < len(windows):
        remaining = sum(spent) / len(spent) * (len(windows) - done)
        eta = f" — reste ≈ {max(1, round(remaining / 60))} min"
    log(f"      [{done}/{len(windows)}] {format_timecode(a)} → {format_timecode(b)} : {kinds}{eta}")
