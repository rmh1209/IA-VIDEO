"""Retouches faites dans l'aperçu et apprentissage à partir des avis."""

import json
import shutil

import pytest
from PIL import Image

from hoopcut.feedback import (JOURNAL_FILE, STEP, Edits, Learned, learn, moment_id, record, similar_spelling,
                              snapshot)
from hoopcut.ffmpeg_utils import MediaInfo
from hoopcut.fetch import Source
from hoopcut.models import Analysis, Moment
from hoopcut.pipeline import JobSettings, Prepared, choose
from hoopcut.select import SelectionSettings, select_clips

from synthetic import make_synthetic_video


def _analysis(count=12, spacing=12.0, spectacular=None):
    moments = [
        Moment(start=i * spacing + 1.0, key=i * spacing + 6.0, end=i * spacing + 8.0,
               action=["dunk", "free_throw", "block"][i % 3], team="ASVEL", player=["Parker", "Mahinmi", None][i % 3],
               spectacular=spectacular or 4 + i % 5, importance=5)
        for i in range(count)
    ]
    return Analysis(source_duration=count * spacing + 5.0, video_type="match", team_a="ASVEL", team_b="MACCABI",
                    moments=moments)


def test_edits_remove_extend_shorten_and_fix_captions(tmp_path):
    analysis = _analysis()
    first, second, third, fourth = analysis.moments[:4]
    edits = Edits()
    edits.add(first, "ennuyeux")
    edits.add(second, "fin_coupee")
    edits.add(second, "fin_coupee")
    edits.add(third, "trop_long")
    edits.add(fourth, "legende", action="layup", player="Tony Parker")  # « Parker » -> « Tony Parker » : orthographe
    edits.save(tmp_path)

    edited = Edits.load(tmp_path).apply(analysis)
    by_id = {moment_id(m): m for m in edited.moments}
    assert moment_id(first) not in by_id
    assert by_id[moment_id(second)].extra_after == 2 * STEP
    assert by_id[moment_id(third)].extra_before == -STEP
    assert (by_id[moment_id(fourth)].action, by_id[moment_id(fourth)].player) == ("layup", "Tony Parker")
    # une faute d'orthographe est corrigée partout dans la vidéo
    assert all(m.player != "Parker" for m in edited.moments)
    assert analysis.moments[0].player == "Parker"  # l'analyse d'origine n'est pas touchée


def test_a_different_player_is_only_fixed_on_that_clip():
    analysis = _analysis()
    parker = analysis.moments[3]
    edits = Edits()
    edits.add(parker, "legende", action=parker.action, player="Nando De Colo")  # l'IA a nommé le mauvais joueur
    edited = edits.apply(analysis)
    players = [m.player for m in edited.moments]
    assert players[3] == "Nando De Colo"
    assert players[0] == players[6] == "Parker"
    assert edits.names == {}


def test_similar_spelling():
    assert similar_spelling("Wemby Nyama", "Wembanyama")
    assert similar_spelling("Tasha Vezenkov", "Sasha Vezenkov")
    assert not similar_spelling("Harden", "Harper")
    assert not similar_spelling("Jalen Green", "Jalen Brunson")


def test_extra_seconds_move_the_clip_bounds():
    settings = SelectionSettings(min_total=1, max_total=30, target=10)

    def clip(**extra):
        moment = Moment(start=10.0, key=15.0, end=17.0, action="dunk", spectacular=6, **extra)
        return select_clips(Analysis(source_duration=40.0, moments=[moment]), [], settings).clips[0]

    base, longer, shorter = clip(), clip(extra_before=2.0, extra_after=2.0), clip(extra_before=-2.0)
    assert (base.start, base.end) == (10.5, 17.0)
    assert (longer.start, longer.end) == (8.5, 19.0)  # au-delà des bornes données par l'IA, et plus de 9 s
    assert (shorter.start, shorter.end) == (12.5, 17.0)


def _validation(video, clips, before=0.0, after=0.0):
    return {"avis": "valide", "video": {"id": video}, "reglages": {"avant": before, "apres": after}, "clips": clips}


def test_learning_margins_types_and_names(tmp_path):
    journal = tmp_path / JOURNAL_FILE
    assert learn(journal) == Learned()

    clips = [{"action": "dunk", "en_plus_avant": 0.0, "en_plus_apres": 2.0 if i < 3 else 0.0} for i in range(10)]
    record(journal, _validation("ancienne", [{"action": "dunk"}] * 10))  # remplacée par la validation suivante
    record(journal, _validation("ancienne", clips))
    for _ in range(3):
        record(journal, {"avis": "pas_bon", "raison": "ennuyeux", "moment": {"action": "free_throw"}})
    record(journal, {"avis": "pas_bon", "raison": "legende", "moment": {"action": "dunk", "player": "Wemby Nyama"},
                     "correction": {"action": "dunk", "joueur": "Wembanyama"}})
    record(journal, {"avis": "pas_bon", "raison": "legende", "moment": {"action": "block", "player": "Harden"},
                     "correction": {"action": "block", "joueur": "Harper"}})
    journal.write_text(journal.read_text(encoding="utf-8") + "ligne abîmée\n", encoding="utf-8")

    learned = learn(journal)
    assert learned.after == pytest.approx(0.6)  # 3 clips sur 10 allongés de 2 s
    assert learned.before == 0.0
    assert learned.type_bonus["free_throw"] == -2.0
    assert learned.type_bonus.get("dunk", 0.0) >= 0.0
    assert learned.names == {"wemby nyama": "Wembanyama"}
    assert learned.opinions == 10 + 5
    assert any("après l'action" in line for line in learned.summary())
    assert any("évite" in line and "lancer franc" in line for line in learned.summary())

    # Une fois la bonne marge trouvée, les clips validés la confirment : pas de retour en arrière
    record(journal, _validation("nouvelle", [{"action": "dunk"}] * 10, after=learned.after))
    assert learn(journal).after == pytest.approx(0.6)


def test_learned_settings_and_names_apply_to_the_next_videos():
    learned = Learned(before=-1.0, after=1.5, type_bonus={"free_throw": -2.0}, names={"wemby nyama": "Wembanyama"})
    tuned = learned.tune(SelectionSettings())
    assert (tuned.pre_roll, tuned.post_roll) == (3.5, 3.5)
    assert tuned.type_bonus == {"free_throw": -2.0}

    analysis = Analysis(source_duration=60.0, moments=[Moment(start=1, key=5, end=8, player="Wemby Nyama")])
    assert learned.fix_names(analysis, "Spurs vs Knicks : Wembanyama en feu").moments[0].player == "Wembanyama"
    assert learned.fix_names(analysis, "Un autre match").moments[0].player == "Wemby Nyama"


def test_choose_applies_edits_and_learning(tmp_path):
    analysis = _analysis(count=20, spectacular=6)
    source = Source(path=tmp_path / "source.mp4", work_dir=tmp_path, slug="match", title="ASVEL - Maccabi",
                    uploader=None, url=None, info=MediaInfo(analysis.source_duration, 1280, 720, 30.0, True))
    prepared = Prepared(source=source, proxy=source.path, cuts=[], analysis=analysis)
    avis = tmp_path / "avis"
    job = JobSettings(selection=SelectionSettings(min_total=20, max_total=30, target=25), avis_dir=avis)

    _, plan = choose(prepared, job, log=lambda _: None)
    chosen = moment_id(plan.clips[0].moment)
    edits = Edits()
    edits.add(plan.clips[0].moment, "rien")
    edits.save(tmp_path)
    for _ in range(3):
        record(avis / JOURNAL_FILE, {"avis": "pas_bon", "raison": "ennuyeux", "moment": {"action": "free_throw"}})

    lines = []
    _, plan = choose(prepared, job, log=lines.append)
    assert chosen not in {moment_id(c.moment) for c in plan.clips}
    assert all(c.moment.action != "free_throw" for c in plan.clips)
    assert any("Appris de tes avis" in line for line in lines)


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="FFmpeg absent")
def test_snapshot_strip(tmp_path):
    video = make_synthetic_video(tmp_path / "v.mp4", [(2.0, 0.1), (2.0, 0.5)], size="320x180")
    out = snapshot(video, [0.3, 1.5, 3.5], tmp_path / "images" / "avis.jpg", width=160)
    assert out is not None and Image.open(out).size == (480, 90)
    assert snapshot(tmp_path / "absente.mp4", [0.3, 1.0, 2.0], tmp_path / "x.jpg") is None


def test_journal_is_one_json_object_per_line(tmp_path):
    journal = tmp_path / "sous-dossier" / JOURNAL_FILE
    record(journal, {"avis": "pas_bon", "texte": "on ne voit pas le dunk, coupé trop tôt"})
    entry = json.loads(journal.read_text(encoding="utf-8").splitlines()[0])
    assert entry["texte"].startswith("on ne voit pas") and "date" in entry
