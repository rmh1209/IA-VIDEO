"""Analyse de la vidéo par une IA vidéo native (Gemini) : elle regarde le flux, image ET son.

La vidéo est envoyée entière (version allégée en 720p) : Gemini la parcourt dans l'ordre,
avec ses horodatages, et renvoie la liste des actions au format JSON (voir models.AIAnalysis).
"""

from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from .ffmpeg_utils import run
from .models import AIAnalysis, Analysis
from .prompts import JSON_ONLY_SUFFIX, build_prompt

DEFAULT_MODEL = "gemini-3.8-flash"

# Prix indicatifs en $ par million de jetons (entrée, sortie), septembre 2026.
# À vérifier : https://ai.google.dev/gemini-api/docs/pricing
PRICES = {
    "gemini-3.8-flash": (0.75, 3.75),
    "gemini-3.7-flash": (0.75, 3.75),
    "gemini-3.5-flash": (1.50, 9.00),
    "gemini-3.1-pro-preview": (2.00, 12.00),
}

Log = Callable[[str], None]


class AnalysisError(RuntimeError):
    pass


@dataclass
class GeminiSettings:
    model: str = DEFAULT_MODEL
    fps: float | None = None  # images analysées par seconde ; None = automatique
    resolution: str = "medium"  # low | medium | high
    processing: str = "static"  # static (toute la vidéo) | agentic (le modèle navigue lui-même)
    timeout: float = 900.0


def auto_fps(duration: float) -> float:
    """Plus la vidéo est courte, plus on peut regarder finement (les actions durent ~1 s)."""
    if duration <= 12 * 60:
        return 2.0
    if duration <= 30 * 60:
        return 1.0
    return 0.5


def make_analysis_proxy(src: Path, dst: Path) -> Path:
    """Copie allégée (720p, 15 i/s) pour un envoi rapide ; même chronologie que l'original."""
    if dst.exists() and dst.stat().st_size > 0:
        return dst
    tmp = dst.with_name(dst.stem + ".tmp.mp4")
    run(
        [
            "ffmpeg", "-hide_banner", "-nostdin", "-y", "-i", str(src),
            "-map", "0:v:0", "-map", "0:a:0?",
            "-vf", "scale=-2:'min(720,ih)',fps=15",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "30", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-ac", "1", "-b:a", "64k",
            "-movflags", "+faststart", str(tmp),
        ]
    )
    tmp.replace(dst)
    return dst


def analyze_with_gemini(
    video: Path, duration: float, settings: GeminiSettings, *, work_dir: Path, log: Log = print
) -> Analysis:
    try:
        from google import genai
    except ImportError as exc:
        raise AnalysisError("Le module google-genai manque : pip install google-genai") from exc

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise AnalysisError(
            "Clé Gemini absente : crée un fichier .env contenant GEMINI_API_KEY=ta_clé "
            "(clé gratuite sur https://aistudio.google.com/apikey), ou lance avec --sans-ia pour un test."
        )
    client = genai.Client(api_key=api_key)

    log("      Envoi de la vidéo à Gemini…")
    try:
        uploaded = client.files.upload(file=str(video), config={"mime_type": "video/mp4"})
    except Exception as exc:
        if "api key" in str(exc).lower() or "api_key" in str(exc).lower() or _status_code(exc) in (401, 403):
            raise AnalysisError("Clé Gemini refusée : vérifie GEMINI_API_KEY dans le fichier .env.") from exc
        raise AnalysisError(f"Envoi de la vidéo à Gemini impossible : {exc}") from exc
    try:
        uploaded = _wait_until_active(client, uploaded)
        fps = settings.fps or auto_fps(duration)
        mode = "agentique" if settings.processing == "agentic" else f"{fps:g} image(s)/s"
        log(f"      Gemini regarde la vidéo ({settings.model}, {mode}, son compris)… 1 à 3 min en général.")
        interaction = _create_interaction(client, uploaded, duration, settings, fps, log)
    finally:
        try:
            client.files.delete(name=uploaded.name)
        except Exception:  # le fichier expire de toute façon après 48 h
            pass

    text = interaction.output_text or ""
    (work_dir / "gemini_reponse_brute.json").write_text(text, encoding="utf-8")
    try:
        ai = AIAnalysis.model_validate(parse_json_loose(text))
    except ValueError as exc:
        raise AnalysisError(
            f"Réponse de Gemini inexploitable (copie dans {work_dir / 'gemini_reponse_brute.json'}) : {exc}"
        ) from exc
    _log_usage(interaction, settings.model, log)
    return Analysis.from_ai(ai, duration=duration, model=settings.model)


def _wait_until_active(client, uploaded, timeout: float = 1200.0):
    started = time.monotonic()
    while True:
        state = getattr(getattr(uploaded, "state", None), "name", None) or str(getattr(uploaded, "state", ""))
        if state == "ACTIVE":
            return uploaded
        if state == "FAILED":
            raise AnalysisError("Gemini n'a pas réussi à lire la vidéo envoyée.")
        if time.monotonic() - started > timeout:
            raise AnalysisError("Délai dépassé pendant la préparation de la vidéo chez Gemini.")
        time.sleep(5)
        uploaded = client.files.get(name=uploaded.name)


def _create_interaction(client, uploaded, duration: float, settings: GeminiSettings, fps: float, log: Log):
    """Appelle Gemini ; si l'API refuse un réglage (erreur 400), réessaie avec une requête plus simple."""
    schema = AIAnalysis.model_json_schema()
    prompt = build_prompt(duration)
    processing = "agentic" if settings.processing == "agentic" else {"type": "static", "fps": fps}
    base_video = {"type": "video", "uri": uploaded.uri, "mime_type": uploaded.mime_type or "video/mp4"}
    json_format = {"type": "text", "mime_type": "application/json", "schema": schema}

    variants = [
        ({**base_video, "processing": processing, "resolution": settings.resolution}, prompt, json_format),
        ({**base_video, "processing": processing}, prompt, json_format),
        (base_video, prompt + JSON_ONLY_SUFFIX.format(schema=json.dumps(schema, ensure_ascii=False)), None),
    ]
    last_error: Exception | None = None
    for index, (video_block, text, response_format) in enumerate(variants):
        if index:
            log("      Réglage refusé par l'API, nouvel essai avec une requête simplifiée…")
        request = {
            "model": settings.model,
            "input": [video_block, {"type": "text", "text": text}],
            "timeout": settings.timeout,
        }
        if response_format:
            request["response_format"] = response_format
        for attempt in range(4):
            try:
                interaction = client.interactions.create(**request)
            except Exception as exc:
                last_error = exc
                code = _status_code(exc)
                if code in (401, 403):
                    raise AnalysisError(f"Clé Gemini refusée ({code}). Vérifie GEMINI_API_KEY dans .env.") from exc
                if code == 404:
                    raise AnalysisError(
                        f"Modèle « {settings.model} » introuvable. Essaie --modele {DEFAULT_MODEL}."
                    ) from exc
                if code == 400:
                    break  # variante suivante
                if attempt == 3:
                    raise AnalysisError(f"Gemini ne répond pas : {exc}") from exc
                wait = 10 * 2**attempt
                log(f"      Gemini indisponible ({code or exc.__class__.__name__}), nouvel essai dans {wait} s…")
                time.sleep(wait)
                continue
            status = str(getattr(interaction, "status", "completed"))
            if interaction.output_text and status in ("completed", "incomplete"):
                return interaction
            last_error = AnalysisError(f"statut « {status} » sans réponse exploitable")
            break
    raise AnalysisError(f"L'analyse Gemini a échoué : {last_error}")


def _status_code(exc: Exception) -> int | None:
    for attr in ("status_code", "code", "status"):
        value = getattr(exc, attr, None)
        if isinstance(value, int):
            return value
    match = re.search(r"\b([45]\d\d)\b", str(exc))
    return int(match.group(1)) if match else None


def parse_json_loose(text: str) -> dict:
    """Extrait l'objet JSON d'une réponse, même entourée de ```json … ``` ou de texte."""
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fenced:
        text = fenced.group(1)
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("aucun objet JSON trouvé")
    return json.loads(text[start : end + 1])


def _log_usage(interaction, model: str, log: Log) -> None:
    usage = getattr(interaction, "usage", None)
    if usage is None:
        return
    tokens_in = usage.total_input_tokens or 0
    tokens_out = (usage.total_output_tokens or 0) + (usage.total_thought_tokens or 0)
    message = f"      Jetons : {tokens_in:,} en entrée, {tokens_out:,} en sortie".replace(",", " ")
    if model in PRICES:
        price_in, price_out = PRICES[model]
        cost = (tokens_in * price_in + tokens_out * price_out) / 1_000_000
        message += f" — coût estimé ≈ {cost:.2f} $"
    log(message)
