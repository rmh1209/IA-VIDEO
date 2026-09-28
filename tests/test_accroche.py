"""Shorts plus accrocheurs : cris des commentateurs, accroche en ouverture, vidéo plus grande."""

import shutil

import pytest
from PIL import Image

from hoopcut.feedback import JOURNAL_FILE, Edits, learn, moment_id, record
from hoopcut.ffmpeg_utils import MediaInfo, probe
from hoopcut.fetch import Source
from hoopcut.hook import teaser
from hoopcut.models import Analysis, Moment
from hoopcut.overlay import OverlayContent, draw_overlay, shout_center, shout_image
from hoopcut.pipeline import JobSettings, Prepared, choose
from hoopcut.render import RenderSettings, Shouted, _render_segment, compute_layout
from hoopcut.select import Clip, EditPlan, SelectionSettings
from hoopcut.shouts import detect, find_shout
from hoopcut.transcribe import Segment

from synthetic import make_synthetic_video


def test_known_exclamations_are_shown_clean():
    assert detect("Lyles, three ball, got it! Trey Lyles is on fire!")[0] == "ON FIRE !"
    assert detect("A costly turnover and Fox throws it down")[0] == "THROWS IT DOWN !"
    assert detect("Oh my! Oh my goodness!")[0] == "MY GOODNESS !"
    assert detect("Quel contre de Wembanyama !")[0] == "QUEL CONTRE !"
    assert detect("Quelle défense !")[0] == "QUELLE DÉFENSE !"
    assert detect("C'est magnifique !")[0] == "C'EST MAGNIFIQUE !"
    assert detect("Elle est exceptionnelle.")[0] == "EXCEPTIONNELLE !"
    assert detect("Énorme !")[0] == "ÉNORME !"
    # Pas des cris : description, statistique, garde-fou « and one of »
    assert detect("C'est un dynamique sur le banc, on revoit le magnifique flotteur") is None
    assert detect("20 from downtown this year.") is None
    assert detect("This is the guy who's put his back into the slam dunk competition for next year.") is None
    assert detect("It's his third already and one of the leading rebounders") is None
    assert detect("Il ne se passe rien, Lemon yama remonte la balle") is None


def test_shout_is_placed_when_said_and_stays_readable():
    said = [Segment(10.0, 11.0, "Bonne passe."), Segment(15.6, 17.0, "Oh la la !"), Segment(30.0, 31.0, "Wow!")]
    shout = find_shout(said, start=11.0, end=18.0, key=15.0)
    assert shout.text == "OH LA LA !" and shout.start == pytest.approx(15.6) and shout.end == pytest.approx(17.4)
    # Dit juste après la fin du clip : montré à la fin du clip, assez longtemps pour être lu
    late = find_shout([Segment(18.5, 19.5, "Wow!")], start=11.0, end=18.0, key=15.0)
    assert late.start == pytest.approx(16.8) and late.end == pytest.approx(17.95)
    assert find_shout(said, start=40.0, end=46.0, key=44.0) is None  # rien autour de ce geste


def _clip(start, key, end, value, shout=False):
    moment = Moment(start=start - 1, key=key, end=end + 1, action="dunk", spectacular=int(value))
    clip = Clip(start=start, end=end, moment=moment, value=value)
    if shout:
        clip.shout = find_shout([Segment(key + 0.5, key + 1.5, "What a dunk!")], start, end, key)
    return clip


def test_teaser_takes_the_end_of_the_strongest_clip():
    clips = [_clip(0, 4, 7, 5), _clip(10, 14, 17, 9), _clip(20, 24, 27, 6)]
    opening = teaser(EditPlan(clips, 0.3), cuts=[17.5, 30.0], duration=60.0)
    assert opening.teaser and opening.moment is clips[1].moment
    assert (opening.start, opening.end) == (13.46, 17.46)  # 4 s maximum, jusqu'au plan suivant
    # Un cri des commentateurs l'emporte sur une note un peu plus haute : preuve d'une grosse action
    clips[2] = _clip(20, 24, 27, 8, shout=True)
    assert teaser(EditPlan(clips, 0.3), [], 60.0).moment is clips[2].moment
    # Action refusée comme accroche dans l'aperçu : la suivante
    assert teaser(EditPlan(clips, 0.3), [], 60.0, excluded={"24.00"}).moment is clips[1].moment
    assert teaser(EditPlan(clips[:2], 0.3), [], 60.0) is None  # short trop court


def test_edits_for_the_opening_and_the_shouts(tmp_path):
    moment = Moment(start=1, key=5, end=8)
    edits = Edits()
    edits.add(moment, "rien", teaser=True)
    edits.add(moment, "cri")
    edits.save(tmp_path)
    loaded = Edits.load(tmp_path)
    assert loaded.no_teaser == {"5.00"} and loaded.no_shout == {"5.00"} and loaded.hook
    assert loaded.removed == set()  # refusé en accroche, pas retiré du short
    loaded.add(moment, "sans_accroche", teaser=True)
    loaded.save(tmp_path)
    assert Edits.load(tmp_path).hook is False


def test_a_shout_refused_twice_is_no_longer_shown(tmp_path):
    journal = tmp_path / JOURNAL_FILE
    for _ in range(2):
        record(journal, {"avis": "pas_bon", "raison": "cri", "clip": {"cri": "INCREDIBLE !"}, "moment": {}})
    record(journal, {"avis": "pas_bon", "raison": "cri", "clip": {"cri": "WOW !"}, "moment": {}})
    learned = learn(journal)
    assert learned.bad_shouts == {"INCREDIBLE !"}
    assert any("INCREDIBLE" in line for line in learned.summary())


def test_choose_adds_the_opening_and_the_shouts(tmp_path):
    moments = [Moment(start=i * 12 + 1, key=i * 12 + 6, end=i * 12 + 8, action="dunk", spectacular=5 + i % 4,
                      importance=5) for i in range(12)]
    analysis = Analysis(source_duration=150.0, video_type="compilation", moments=moments)
    (tmp_path / "transcription.json").write_text(
        '{"transcription": [{"offsets": {"from": 42500, "to": 43500}, "text": " Oh my goodness!"}]}', encoding="utf-8")
    source = Source(path=tmp_path / "v.mp4", work_dir=tmp_path, slug="v", title="v", uploader=None, url=None,
                    info=MediaInfo(150.0, 1280, 720, 30.0, True))
    prepared = Prepared(source=source, proxy=source.path, cuts=[], analysis=analysis)
    job = JobSettings(selection=SelectionSettings(min_total=20, max_total=30, target=25))
    _, plan = choose(prepared, job, log=lambda _: None)
    assert plan.clips[0].teaser and not any(c.teaser for c in plan.clips[1:])
    assert 20 <= plan.total <= 30
    shouted = [c for c in plan.clips if c.shout]
    assert all(c.shout.text == "MY GOODNESS !" and c.start <= 42.5 <= c.end + 1.5 for c in shouted)

    _, plain = choose(prepared, JobSettings(selection=job.selection, hook=False, shouts=False), log=lambda _: None)
    assert not any(c.teaser or c.shout for c in plain.clips) and 20 <= plain.total <= 30


def test_shout_picture_and_position():
    image = shout_image("Are you kidding me ?!")
    assert image.mode == "RGBA" and 300 < image.width <= 1000 and image.height < 400
    assert image.getchannel("A").getbbox() is not None
    layout = compute_layout(MediaInfo(60, 1920, 1080, 30, True), RenderSettings())
    assert layout.video_height > 700  # vidéo plus grande qu'avant (608 px)
    assert layout.top < shout_center(layout.top, layout.video_height) < layout.top + layout.video_height / 2


def test_compact_score_panel_leaves_room_for_a_bigger_video(tmp_path):
    layout = compute_layout(MediaInfo(60, 1920, 1080, 30, True), RenderSettings())
    content = OverlayContent(title="Un titre sur deux lignes pour voir la place qu'il prend", tag="EuroLeague",
                             team_a="LDLC ASVEL", team_b="MACCABI", score_a=88, score_b=85,
                             caption="ALLEY-OOP · Theo Maledon")
    alpha = Image.open(draw_overlay(tmp_path / "h.png", content, video_top=layout.top,
                                    video_bottom=layout.bottom)).getchannel("A")
    assert alpha.crop((0, layout.top, 1080, layout.bottom)).getbbox() is None  # rien sur la vidéo
    assert alpha.crop((0, 1640, 1080, 1920)).getbbox() is None  # ni sur les boutons des applis
    assert alpha.crop((0, layout.bottom, 1080, 1640)).getbbox() is not None


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="FFmpeg absent")
def test_render_segment_with_an_animated_shout(tmp_path):
    video = make_synthetic_video(tmp_path / "v.mp4", [(3.0, 0.3)], size="640x360")
    info = probe(video)
    rs = RenderSettings(preset="ultrafast")
    layout = compute_layout(info, rs)
    png = draw_overlay(tmp_path / "h.png", OverlayContent(title="Essai"), video_top=layout.top,
                       video_bottom=layout.bottom)
    shout_image("Quel dunk !").save(tmp_path / "cri.png")
    out = tmp_path / "clip.mp4"
    _render_segment(video, info, 0.0, 2.5, png, out, layout, rs,
                    Shouted(tmp_path / "cri.png", 0.8, 2.0, shout_center(layout.top, layout.video_height)))
    rendered = probe(out)
    assert (rendered.width, rendered.height) == (1080, 1920) and rendered.duration == pytest.approx(2.5, abs=0.1)
