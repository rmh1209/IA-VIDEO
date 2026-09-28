"""Enchaînement complet : vidéo source -> analyse -> choix des moments -> short vertical."""

from __future__ import annotations

import json
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Callable

from .analyze import AnalysisError, GeminiSettings, analyze_with_gemini, make_analysis_proxy
from .analyze_local import LOCAL_POST_ROLL, LocalSettings, analyze_local
from .beats import Beats, detect_beats, sync_to_beats
from .feedback import JOURNAL_FILE, Edits, Learned, learn, moment_id
from .fetch import Source, fetch
from .ffmpeg_utils import probe, require_ffmpeg
from .heuristic import analyze_heuristic
from .hook import RESERVE_MAX, RESERVE_MIN, RESERVE_TARGET, teaser
from .models import Analysis
from .overlay import OverlayContent
from .render import RenderSettings, render_plan
from .select import EditPlan, SelectionSettings, select_clips
from .shots import load_or_detect_cuts
from .shouts import commentary, find_shout
from .text_utils import format_timecode, slugify

Log = Callable[[str], None]


@dataclass
class JobSettings:
    work_root: Path = Path("travail")
    out_root: Path = Path("sorties")
    use_ai: bool = True
    ai: str = "locale"  # locale (sur ce PC) | gemini (en ligne, clé nécessaire)
    reanalyze: bool = False
    analyze_only: bool = False
    cookies_browser: str | None = None
    title: str | None = None
    show_score: bool = True
    local: LocalSettings = field(default_factory=LocalSettings)
    gemini: GeminiSettings = field(default_factory=GeminiSettings)
    selection: SelectionSettings = field(default_factory=SelectionSettings)
    render: RenderSettings = field(default_factory=RenderSettings)
    avis_dir: Path | None = None  # journal des avis donnés dans l'aperçu (None : on n'en tient pas compte)
    hook: bool = True  # la plus belle action en ouverture (hook.py)
    shouts: bool = True  # cris des commentateurs en gros (shouts.py)
    beat_sync: bool = True  # changements de clip sur les temps de la musique (beats.py)


@dataclass
class Prepared:
    """Vidéo prête à monter : source récupérée, plans repérés, analyse faite (ou relue)."""

    source: Source
    proxy: Path  # copie allégée (720p, H.264), même chronologie que la source
    cuts: list[float]
    analysis: Analysis  # telle que sortie de l'IA, avant retouches


def run_job(source_arg: str, job: JobSettings, log: Log = print) -> Path | None:
    prepared = prepare(source_arg, job, log)
    if job.analyze_only:
        return None
    if prepared.analysis.source_has_music and job.render.music and job.render.original_volume > 0.5:
        log("      Conseil : la vidéo source a déjà une musique. Pour éviter deux musiques en même temps, "
            "ajoute --volume-original 0.3 ou --sans-musique.")
    analysis, plan = choose(prepared, job, log)
    return render_short(prepared, analysis, plan, job, log)


def prepare(source_arg: str, job: JobSettings, log: Log = print,
            progress: Callable[[float], None] | None = None) -> Prepared:
    """Étapes 1 à 3 : récupération, changements de plan, analyse. `progress` suit le téléchargement."""
    require_ffmpeg()
    log("[1/5] Récupération de la vidéo")
    source = fetch(source_arg, job.work_root, cookies_browser=job.cookies_browser, log=log, progress=progress)
    log(f"      {source.title} ({_minutes(source.info.duration)})")
    proxy = make_analysis_proxy(source.path, source.work_dir / "analyse_720p.mp4")

    log("[2/5] Repérage des changements de plan")
    cuts = load_or_detect_cuts(proxy, source.work_dir / "plans.json")
    log(f"      {len(cuts)} changements de plan")

    analysis = _analysis(source, proxy, cuts, job, log)
    _log_moments(analysis, log)
    return Prepared(source, proxy, cuts, analysis)


def choose(prepared: Prepared, job: JobSettings, log: Log = print,
           learned: Learned | None = None) -> tuple[Analysis, EditPlan]:
    """Étape 4 : les clips du short, en tenant compte des retouches faites dans l'aperçu et de ce
    qui a été appris des avis. Renvoie l'analyse retouchée (légendes corrigées…) et les clips."""
    log("[4/5] Choix des meilleurs moments")
    if learned is None:
        learned = learn(job.avis_dir / JOURNAL_FILE) if job.avis_dir else Learned()
    source = prepared.source
    edits = Edits.load(source.work_dir)
    analysis = learned.fix_names(prepared.analysis, f"{source.title} {source.description or ''}")
    analysis = edits.apply(analysis)
    selection = job.selection
    hook = job.hook and edits.hook
    if hook:  # place gardée pour l'accroche, dont la durée n'est connue qu'après le choix des clips
        selection = replace(selection, min_total=selection.min_total - RESERVE_MIN,
                            max_total=selection.max_total - RESERVE_MAX, target=selection.target - RESERVE_TARGET)
    if analysis.analyzer == "locale" and selection.post_roll < LOCAL_POST_ROLL:
        # L'IA locale situe le geste décisif à 1 ou 2 s près : on garde un peu plus de jeu après
        selection = replace(selection, post_roll=LOCAL_POST_ROLL)
    if analysis.video_type == "compilation":
        # Dans une compilation, chaque plan vient d'un autre match : un clip ne doit pas en déborder.
        # Les clips sont alors courts : on n'y met que des actions très spectaculaires s'il y en a assez.
        selection = replace(selection, single_shot=True, min_spectacular=max(selection.min_spectacular, 7))
    selection = learned.tune(selection)
    if learned.summary():
        log("      Appris de tes avis : " + " ; ".join(learned.summary()))
    plan = select_clips(analysis, prepared.cuts, selection)
    if not plan.clips:
        raise AnalysisError("Aucune action exploitable dans cette vidéo.")
    segments = commentary(source.work_dir) if job.shouts else []

    def shout(clip):
        if moment_id(clip.moment) in edits.no_shout:
            return None
        found = find_shout(segments, clip.start, clip.end, clip.moment.key)
        return None if found is None or found.text in learned.bad_shouts else found

    for clip in plan.clips:
        clip.shout = shout(clip)
    # ni l'accroche ni un recalage sur la musique ne débordent sur un autre plan ou un ralenti
    limits = sorted(prepared.cuts + [m.start for m in analysis.moments if m.replay])
    if hook:
        opening = teaser(plan, limits, source.info.duration, edits.no_teaser)
        if opening:
            opening.shout = shout(opening)
            plan.clips.insert(0, opening)
    if job.beat_sync and job.render.music:
        beats = music_beats(job.render.music)
        if beats:
            plan.music_start = sync_to_beats(plan, beats, limits, source.info.duration, job.selection.max_total)
            log(f"      Musique « {job.render.music.name} » : changements de clip calés sur ses temps "
                f"({beats.bpm:.0f} battements/min)")
    for warning in plan.warnings:
        log(f"      Attention : {warning}")
    _log_plan(plan, log)
    return analysis, plan


def render_short(prepared: Prepared, analysis: Analysis, plan: EditPlan, job: JobSettings,
                 log: Log = print) -> Path:
    """Étape 5 : le short vertical, et le texte prêt à coller pour la publication."""
    log("[5/5] Montage vertical")
    source = prepared.source
    title = title_for(source, analysis, job)
    out = job.out_root / f"{_output_name(source, job)}.mp4"
    render_plan(plan, source.path, source.info, build_overlays(plan, analysis, title, job), out,
                source.work_dir, job.render, log)
    final = probe(out)
    log(f"      Durée finale : {final.duration:.1f} s, {final.width}x{final.height}")
    write_publication(out.with_suffix(".txt"), analysis, plan, source, title)
    (source.work_dir / "montage.json").write_text(_plan_json(plan), encoding="utf-8")
    return out


def title_for(source: Source, analysis: Analysis, job: JobSettings) -> str:
    return job.title or analysis.title or source.title


_BEATS: dict[tuple[str, float], Beats | None] = {}


def music_beats(music: Path) -> Beats | None:
    """Temps de la musique, gardés en mémoire (chaque avis dans l'aperçu refait le choix des clips)."""
    try:
        key = (str(music.resolve()), music.stat().st_mtime)
    except OSError:
        return None
    if key not in _BEATS:
        _BEATS[key] = detect_beats(music)
    return _BEATS[key]


def analysis_cache(work_dir: Path, job: JobSettings) -> Path:
    return work_dir / (f"analyse_{job.ai}.json" if job.use_ai else "analyse_sans_ia.json")


def _analysis(source: Source, proxy: Path, cuts: list[float], job: JobSettings, log: Log) -> Analysis:
    cache = analysis_cache(source.work_dir, job)
    if cache.exists() and not job.reanalyze:
        log(f"[3/5] Analyse déjà faite, réutilisée ({cache}) — option --reanalyser pour la refaire")
        try:
            return Analysis.model_validate_json(cache.read_text(encoding="utf-8"))
        except ValueError as exc:
            raise AnalysisError(f"Le fichier {cache} est invalide (corrige-le ou supprime-le) : {exc}") from exc
    if job.use_ai and job.ai == "gemini":
        log("[3/5] Analyse par l'IA vidéo (Gemini) : elle regarde toute la vidéo, avec le son")
        analysis = analyze_with_gemini(proxy, source.info.duration, job.gemini, work_dir=source.work_dir, log=log)
    elif job.use_ai:
        log("[3/5] Analyse par l'IA vidéo locale : elle regarde toute la vidéo et écoute les commentaires")
        if job.reanalyze:
            _forget_local_analysis(source.work_dir)
        analysis = analyze_local(proxy, source.info, cuts, source.title, source.uploader, source.work_dir,
                                 job.local, log, description=source.description)
    else:
        log("[3/5] Analyse sans IA (volume sonore) — mode test, peu fiable")
        analysis = analyze_heuristic(proxy, source.info, cuts, source.title)
    cache.write_text(analysis.model_dump_json(indent=2), encoding="utf-8")
    return analysis


def _forget_local_analysis(work_dir: Path) -> None:
    """--reanalyser : on oublie les fenêtres déjà regardées (la transcription, elle, reste valable)."""
    folder = work_dir / "ia_locale"
    if folder.is_dir():
        for path in folder.iterdir():
            if path.is_file():
                path.unlink()


def build_overlays(plan: EditPlan, analysis: Analysis, title: str, job: JobSettings) -> list[OverlayContent]:
    """Habillage de chaque clip : titre, étiquette, score (match) et légende de l'action."""
    tag = _tag(analysis, job)
    story = [c for c in plan.clips if not c.teaser]
    latest = max(story, key=lambda c: c.start) if story else None
    with_score = job.show_score and analysis.video_type == "match" and analysis.team_a and analysis.team_b
    overlays = []
    for index, clip in enumerate(plan.clips):
        m = clip.moment
        content = OverlayContent(title=title, tag=tag, caption=caption_for(m, analysis))
        if with_score and not clip.teaser:  # l'accroche, hors du récit, n'affiche pas de score
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


def caption_for(m, analysis: Analysis) -> str | None:
    if analysis.analyzer == "heuristique":
        return None
    if m.player:
        return f"{m.label} · {m.player}"
    if m.team and m.team_sure and analysis.video_type == "match":
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
        what = "ACCROCHE (extrait d'un clip suivant)" if clip.teaser else f"{m.label}  {m.description}"
        lines.append(f"{index:2d}. {format_timecode(clip.start)} -> {format_timecode(clip.end)}  {what}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _log_moments(analysis: Analysis, log: Log) -> None:
    moments = analysis.moments
    replays = sum(m.replay for m in moments)
    log(f"      {len(moments)} actions repérées ({replays} ralentis écartés)")
    if analysis.analyzer == "heuristique":
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
        extra = "  (accroche)" if clip.teaser else ""
        extra += f"  « {clip.shout.text} »" if clip.shout else ""
        log(f"      {format_timecode(clip.start)} ({clip.duration:4.1f} s)  {m.label:<18} {m.player or m.team or ''}{extra}")


def _output_name(source: Source, job: JobSettings) -> str:
    focus = job.selection.focus_players or job.selection.focus_teams
    suffix = f"-focus-{slugify(focus[0], 30)}" if focus else ""
    return f"{slugify(source.slug, 50)}{suffix}-short"


def _plan_json(plan: EditPlan) -> str:
    clips = [
        {"debut": c.start, "fin": c.end, "valeur": round(c.value, 2), "accroche": c.teaser,
         "cri": c.shout.text if c.shout else None, "moment": c.moment.model_dump()}
        for c in plan.clips
    ]
    return json.dumps({"duree_totale": round(plan.total, 2), "fondu": plan.transition,
                       "musique_debut": plan.music_start, "clips": clips}, ensure_ascii=False, indent=2)


def _minutes(seconds: float) -> str:
    minutes, sec = divmod(round(seconds), 60)
    return f"{minutes} min {sec:02d} s"
