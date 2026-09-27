"""Enchaînement complet : vidéo source -> analyse -> choix des moments -> short vertical."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from .analyze import AnalysisError, GeminiSettings, analyze_with_gemini, make_analysis_proxy
from .fetch import Source, fetch
from .ffmpeg_utils import probe, require_ffmpeg
from .heuristic import analyze_heuristic
from .models import Analysis
from .overlay import OverlayContent
from .render import RenderSettings, render_plan
from .select import EditPlan, SelectionSettings, select_clips
from .shots import load_or_detect_cuts
from .text_utils import format_timecode, slugify

Log = Callable[[str], None]


@dataclass
class JobSettings:
    work_root: Path = Path("travail")
    out_root: Path = Path("sorties")
    use_ai: bool = True
    reanalyze: bool = False
    analyze_only: bool = False
    cookies_browser: str | None = None
    title: str | None = None
    show_score: bool = True
    gemini: GeminiSettings = field(default_factory=GeminiSettings)
    selection: SelectionSettings = field(default_factory=SelectionSettings)
    render: RenderSettings = field(default_factory=RenderSettings)


def run_job(source_arg: str, job: JobSettings, log: Log = print) -> Path | None:
    require_ffmpeg()
    log("[1/5] Récupération de la vidéo")
    source = fetch(source_arg, job.work_root, cookies_browser=job.cookies_browser, log=log)
    log(f"      {source.title} ({_minutes(source.info.duration)})")
    proxy = make_analysis_proxy(source.path, source.work_dir / "analyse_720p.mp4")

    log("[2/5] Repérage des changements de plan")
    cuts = load_or_detect_cuts(proxy, source.work_dir / "plans.json")
    log(f"      {len(cuts)} changements de plan")

    analysis = _analysis(source, proxy, cuts, job, log)
    _log_moments(analysis, log)
    if job.analyze_only:
        return None
    if analysis.source_has_music and job.render.music and job.render.original_volume > 0.5:
        log("      Conseil : la vidéo source a déjà une musique. Pour éviter deux musiques en même temps, "
            "ajoute --volume-original 0.3 ou --sans-musique.")

    log("[4/5] Choix des meilleurs moments")
    plan = select_clips(analysis, cuts, job.selection)
    if not plan.clips:
        raise AnalysisError("Aucune action exploitable dans cette vidéo.")
    for warning in plan.warnings:
        log(f"      Attention : {warning}")
    _log_plan(plan, log)

    log("[5/5] Montage vertical")
    title = job.title or analysis.title or source.title
    out = job.out_root / f"{_output_name(source, job)}.mp4"
    render_plan(plan, source.path, source.info, build_overlays(plan, analysis, title, job), out,
                source.work_dir, job.render, log)
    final = probe(out)
    log(f"      Durée finale : {final.duration:.1f} s, {final.width}x{final.height}")
    write_publication(out.with_suffix(".txt"), analysis, plan, source, title)
    (source.work_dir / "montage.json").write_text(_plan_json(plan), encoding="utf-8")
    return out


def _analysis(source: Source, proxy: Path, cuts: list[float], job: JobSettings, log: Log) -> Analysis:
    cache = source.work_dir / ("analyse_ia.json" if job.use_ai else "analyse_sans_ia.json")
    if cache.exists() and not job.reanalyze:
        log(f"[3/5] Analyse déjà faite, réutilisée ({cache}) — option --reanalyser pour la refaire")
        try:
            return Analysis.model_validate_json(cache.read_text(encoding="utf-8"))
        except ValueError as exc:
            raise AnalysisError(f"Le fichier {cache} est invalide (corrige-le ou supprime-le) : {exc}") from exc
    if job.use_ai:
        log("[3/5] Analyse par l'IA vidéo (Gemini) : elle regarde toute la vidéo, avec le son")
        analysis = analyze_with_gemini(proxy, source.info.duration, job.gemini, work_dir=source.work_dir, log=log)
    else:
        log("[3/5] Analyse sans IA (volume sonore) — mode test, peu fiable")
        analysis = analyze_heuristic(proxy, source.info, cuts, source.title)
    cache.write_text(analysis.model_dump_json(indent=2), encoding="utf-8")
    return analysis


def build_overlays(plan: EditPlan, analysis: Analysis, title: str, job: JobSettings) -> list[OverlayContent]:
    """Habillage de chaque clip : titre, étiquette, score (match) et légende de l'action."""
    tag = _tag(analysis, job)
    latest = max(plan.clips, key=lambda c: c.start) if plan.clips else None
    with_score = job.show_score and analysis.video_type == "match" and analysis.team_a and analysis.team_b
    overlays = []
    for index, clip in enumerate(plan.clips):
        m = clip.moment
        content = OverlayContent(title=title, tag=tag, caption=_caption(m, analysis))
        if with_score:
            content.team_a, content.team_b = analysis.team_a, analysis.team_b
            if index == len(plan.clips) - 1 and clip is latest and analysis.has_final_score:
                content.score_a, content.score_b = analysis.final_score_a, analysis.final_score_b
                content.score_label = "SCORE FINAL"
            else:
                content.score_a, content.score_b = m.score_a, m.score_b
        overlays.append(content)
    return overlays


def _tag(analysis: Analysis, job: JobSettings) -> str | None:
    selection = job.selection
    if selection.focus_players:
        return f"FOCUS {selection.focus_players[0]}"
    if selection.focus_teams:
        return f"FOCUS {selection.focus_teams[0]}"
    if analysis.competition:
        return analysis.competition
    return {"match": "RÉSUMÉ DU MATCH", "compilation": "COMPILATION"}.get(analysis.video_type)


def _caption(m, analysis: Analysis) -> str | None:
    if analysis.analyzer != "gemini":
        return None
    if m.player:
        return f"{m.label} · {m.player}"
    if m.team and analysis.video_type == "match":
        return f"{m.label} · {m.team}"
    return m.label


def write_publication(path: Path, analysis: Analysis, plan: EditPlan, source: Source, title: str) -> None:
    """Texte prêt à coller au moment de publier : titre, description, hashtags, crédits."""
    lines = ["TITRE", title, ""]
    if analysis.description:
        lines += ["DESCRIPTION", analysis.description, ""]
    if analysis.hashtags:
        lines += ["HASHTAGS", " ".join(analysis.hashtags), ""]
    if source.url:
        lines += ["SOURCE DES IMAGES", f"{source.uploader or ''} — {source.url}".strip(" —"), ""]
    lines.append("CLIPS UTILISÉS (temps dans la vidéo source)")
    for index, clip in enumerate(plan.clips, start=1):
        m = clip.moment
        lines.append(f"{index:2d}. {format_timecode(clip.start)} -> {format_timecode(clip.end)}  {m.label}  {m.description}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _log_moments(analysis: Analysis, log: Log) -> None:
    moments = analysis.moments
    replays = sum(m.replay for m in moments)
    log(f"      {len(moments)} actions repérées ({replays} ralentis écartés)")
    if analysis.analyzer != "gemini":
        return
    if analysis.team_a and analysis.team_b:
        final = (f" — score final {analysis.final_score_a}-{analysis.final_score_b}"
                 if analysis.has_final_score else "")
        log(f"      Match : {analysis.team_a} contre {analysis.team_b}{final}")
    for m in moments:
        if m.replay:
            continue
        who = m.player or m.team or ""
        log(f"      {format_timecode(m.key)}  {m.label:<18} spectacle {m.spectacular:>2}/10  {who}")


def _log_plan(plan: EditPlan, log: Log) -> None:
    log(f"      {len(plan.clips)} clips retenus, durée totale {plan.total:.1f} s :")
    for clip in plan.clips:
        m = clip.moment
        log(f"      {format_timecode(clip.start)} ({clip.duration:4.1f} s)  {m.label:<18} {m.player or m.team or ''}")


def _output_name(source: Source, job: JobSettings) -> str:
    focus = job.selection.focus_players or job.selection.focus_teams
    suffix = f"-focus-{slugify(focus[0], 30)}" if focus else ""
    return f"{slugify(source.slug, 50)}{suffix}-short"


def _plan_json(plan: EditPlan) -> str:
    clips = [
        {"debut": c.start, "fin": c.end, "valeur": round(c.value, 2), "moment": c.moment.model_dump()}
        for c in plan.clips
    ]
    return json.dumps({"duree_totale": round(plan.total, 2), "clips": clips}, ensure_ascii=False, indent=2)


def _minutes(seconds: float) -> str:
    minutes, sec = divmod(round(seconds), 60)
    return f"{minutes} min {sec:02d} s"
