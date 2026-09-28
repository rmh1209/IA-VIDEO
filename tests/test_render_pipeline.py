"""Tests de bout en bout : vraie vidéo (synthétique), vrai FFmpeg, analyse IA simulée."""

import json
import shutil
import subprocess
import sys

import pytest
from PIL import Image

from hoopcut.cli import build_parser, job_from_args
from hoopcut.fetch import fetch
from hoopcut.ffmpeg_utils import probe
from hoopcut.models import Analysis
from hoopcut.overlay import SAFE_BOTTOM, OverlayContent, draw_overlay
from hoopcut.pipeline import JobSettings, analysis_cache, run_job
from hoopcut.render import RenderSettings
from hoopcut.select import SelectionSettings

from fake_ai import fake_ai_analysis
from synthetic import make_synthetic_video

needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="FFmpeg absent")

SCENES = [(3.0 + i % 3, 0.6 if i % 4 == 1 else 0.1) for i in range(12)]  # environ 48 s


@pytest.fixture(scope="module")
def source_video(tmp_path_factory):
    return make_synthetic_video(tmp_path_factory.mktemp("source") / "match.mp4", SCENES, size="640x360")


def _job(tmp_path, selection=None, render=None, **options):
    """Short de 12 à 18 s (au lieu de 60 à 80) pour des tests rapides."""
    return JobSettings(
        work_root=tmp_path / "travail",
        out_root=tmp_path / "sorties",
        selection=SelectionSettings(min_total=12, max_total=18, target=15, **(selection or {})),
        render=RenderSettings(preset="ultrafast", **(render or {})),
        **options,
    )


def _seed_ai_analysis(job, video):
    """Met en cache une analyse IA : le pipeline la réutilise sans lancer de modèle."""
    source = fetch(str(video), job.work_root)
    analysis = Analysis.from_ai(fake_ai_analysis(SCENES), duration=source.info.duration, model="faux")
    analysis_cache(source.work_dir, job).write_text(analysis.model_dump_json(), encoding="utf-8")


@needs_ffmpeg
def test_ai_path_produces_a_vertical_short(tmp_path, source_video):
    job = _job(tmp_path)
    _seed_ai_analysis(job, source_video)
    out = run_job(str(source_video), job, log=lambda _: None)

    info = probe(out)
    assert (info.width, info.height) == (1080, 1920)
    assert 12.0 <= info.duration <= 18.1
    assert info.has_audio
    publication = out.with_suffix(".txt").read_text(encoding="utf-8")
    assert "La première européenne de Parker" in publication
    assert "#EuroLeague" in publication


@needs_ffmpeg
def test_music_black_background_zoom_and_hard_cuts(tmp_path, source_video):
    music = tmp_path / "beat.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", "sine=f=220:d=5", str(music)], check=True)
    job = _job(
        tmp_path,
        selection={"transition": 0.0},
        render={"music": music, "transition": "none", "background": "noir", "zoom": 1.3},
    )
    _seed_ai_analysis(job, source_video)
    out = run_job(str(source_video), job, log=lambda _: None)
    info = probe(out)
    assert (info.width, info.height) == (1080, 1920)
    assert 12.0 <= info.duration <= 18.1


@needs_ffmpeg
def test_no_ai_mode(tmp_path, source_video):
    out = run_job(str(source_video), _job(tmp_path, use_ai=False), log=lambda _: None)
    assert 12.0 <= probe(out).duration <= 18.1


@needs_ffmpeg
def test_youtube_video_already_downloaded_is_reused_offline(tmp_path, source_video, monkeypatch):
    work_dir = tmp_path / "travail" / "ojd-nbzx9va"
    work_dir.mkdir(parents=True)
    shutil.copy(source_video, work_dir / "source.mp4")
    (work_dir / "source.json").write_text(json.dumps({
        "id": "oJd_NbZx9VA", "title": "ASVEL - Maccabi", "uploader": "beIN",
        "url": "https://www.youtube.com/watch?v=oJd_NbZx9VA", "description": "Tony Parker"}), encoding="utf-8")
    monkeypatch.setitem(sys.modules, "yt_dlp", None)  # l'importer échouerait : aucun accès à Internet
    for link in ("https://youtu.be/oJd_NbZx9VA?si=partage", "https://www.youtube.com/watch?v=oJd_NbZx9VA&t=12s"):
        source = fetch(link, tmp_path / "travail")
        assert source.work_dir == work_dir and source.title == "ASVEL - Maccabi"
        assert source.description == "Tony Parker" and source.info.duration > 40


def test_overlay_stays_out_of_the_video_and_app_buttons(tmp_path):
    content = OverlayContent(
        title="Un titre beaucoup trop long pour tenir sur une seule ligne, il doit se replier proprement",
        tag="EuroLeague",
        team_a="ASVEL",
        team_b="MACCABI PLAYTIKA TEL AVIV",
        score_a=88,
        score_b=85,
        score_label="SCORE FINAL",
        caption="DUNK · Tony Parker",
    )
    image = Image.open(draw_overlay(tmp_path / "habillage.png", content, video_top=656, video_bottom=1264))
    assert image.size == (1080, 1920) and image.mode == "RGBA"
    alpha = image.getchannel("A")
    assert alpha.crop((0, 656, 1080, 1264)).getbbox() is None  # rien sur la vidéo
    assert alpha.crop((0, SAFE_BOTTOM + 40, 1080, 1920)).getbbox() is None  # zone des boutons des applis
    assert alpha.crop((0, 0, 1080, 656)).getbbox() is not None  # titre
    assert alpha.crop((0, 1264, 1080, SAFE_BOTTOM)).getbbox() is not None  # score et légende


def test_overlay_drops_characters_the_font_cannot_draw(tmp_path):
    content = OverlayContent(title="🔥 Quel match ! 🏀", caption="DUNK · Nikola Jokić")
    image = Image.open(draw_overlay(tmp_path / "habillage.png", content, video_top=656, video_bottom=1264))
    assert image.getchannel("A").getbbox() is not None
    from hoopcut.overlay import _printable

    assert _printable(content.title) == "Quel match !"
    assert _printable(content.caption) == "DUNK · Nikola Jokić"


def test_command_line_options(tmp_path):
    args = build_parser().parse_args(
        ["video.mp4", "--focus-joueur", "Parker, De Colo", "--transition", "aucune", "--sans-musique",
         "--duree-min", "65", "--duree-max", "75", "--ordre", "accroche", "--mode-video", "agentique"]
    )
    job = job_from_args(args)
    assert job.selection.focus_players == ["Parker", "De Colo"]
    assert job.selection.transition == 0.0 and job.render.transition == "none"
    assert (job.selection.min_total, job.selection.max_total) == (65, 75)
    assert job.selection.order == "accroche"
    assert job.render.music is None
    assert job.gemini.processing == "agentic"
    assert job.ai == "locale" and job.local.commentary and job.local.fps == 1.0

    assert job.hook and job.shouts and job.render.zoom == 1.25
    gemini = job_from_args(build_parser().parse_args(["video.mp4", "--ia", "gemini", "--sans-commentaires",
                                                      "--sans-accroche", "--sans-cris", "--zoom", "1"]))
    assert gemini.ai == "gemini" and not gemini.local.commentary
    assert not gemini.hook and not gemini.shouts and gemini.render.zoom == 1.0
    assert analysis_cache(tmp_path, gemini).name == "analyse_gemini.json"
