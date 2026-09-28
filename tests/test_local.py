"""IA locale testée hors ligne : faux serveur llama.cpp, vraie vidéo synthétique, vrai FFmpeg."""

import json
import shutil

import pytest

from hoopcut import analyze_local
from hoopcut.analyze import AnalysisError
from hoopcut.analyze_local import (
    _MUSIC_CREDIT,
    LocalSettings,
    Overview,
    _drop_inconsistent_scores,
    _name_allowed,
    analyze_local as run_local_analysis,
    basket_from_scores,
    canonical_player,
    description_names,
    score_times,
    short_title,
    shown_score,
    commentary_reaction,
    commentary_type,
    merge_moments,
    plan_windows,
    display_name,
    plausible_fix,
    read_on_screen,
    settle_action,
    trusted_name,
    window_moments,
)
from hoopcut.engines import LocalPaths
from hoopcut.ffmpeg_utils import probe
from hoopcut.models import Moment
from hoopcut.transcribe import Segment, drop_loops, load_whisper_json, parse_line

from synthetic import make_synthetic_video

needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="FFmpeg absent")
MATCH = Overview(video_type="match", team_a="LDLC ASVEL", team_b="MACCABI", jersey_a="jaune", jersey_b="noir",
                 competition="EuroLeague", scoreboard="bottom_left")


def test_windows_cover_the_video_and_follow_shot_changes():
    cuts = [24.0, 51.5, 80.0, 140.0]
    windows = plan_windows(200.0, cuts, length=30.0, overlap=4.0)
    assert windows[0][0] == 0.0 and windows[-1][1] == 200.0
    for (a1, b1), (a2, b2) in zip(windows, windows[1:]):
        if b1 in cuts:
            assert a2 == b1  # coupure sur un changement de plan : pas besoin de chevauchement
        else:
            assert b1 - a2 == 4.0  # sinon chevauchement : aucune action coupée en deux
    assert windows[:3] == [(0.0, 24.0), (24.0, 51.5), (51.5, 80.0)]
    assert all(b - a <= 30.0 * 1.35 + 0.01 for a, b in windows)  # pas de minuscule fenêtre finale


def test_window_answer_becomes_absolute_moments():
    items = [
        {"key": 14.0, "start": 13.5, "end": 14.2, "action": "dunk", "team": "maccabi", "player": " Wilbekin ",
         "scored": True, "replay": False, "spectacular": 9, "description": "Dunk rageur."},
        {"key": 40.0, "start": 38.0, "end": 45.0, "action": "three_pointer", "team": "ASVEL", "player": None,
         "scored": False, "replay": False, "spectacular": 6, "description": "Tir manqué."},
        {"key": "?", "start": 0, "end": 1},
    ]
    items[1]["scored"] = True
    dunk, three = window_moments(items, 100.0, 130.0, MATCH)
    assert (dunk.start, dunk.key, dunk.end) == (113.5, 114.0, 114.2)
    assert dunk.team == "MACCABI" and dunk.player == "Wilbekin"
    assert three.key == 130.0 and three.end == 130.0  # borné à la fenêtre
    assert three.team == "LDLC ASVEL" and three.spectacular == 6
    items[1]["scored"] = False
    assert len(window_moments(items, 100.0, 130.0, MATCH)) == 1  # tir raté : pas un moment fort


def test_same_action_seen_in_two_windows_is_kept_once():
    a = Moment(start=10, key=13.0, end=14, action="dunk", spectacular=7, player="Parker")
    b = Moment(start=11, key=14.5, end=16, action="dunk", spectacular=9, team="ASVEL")
    replay = Moment(start=16, key=18.0, end=20, action="dunk", spectacular=9, replay=True)
    other = Moment(start=30, key=33.0, end=35, action="block", spectacular=6)
    merged = merge_moments([other, replay, b, a])
    assert len(merged) == 3
    best = merged[0]
    assert best.spectacular == 9 and best.player == "Parker" and best.team == "ASVEL"
    assert (best.start, best.end) == (10, 16)


def test_scoreboard_tells_who_scored_and_how_many_points():
    assert basket_from_scores([6, 3], [9, 3], "ASVEL", "MACCABI") == ("ASVEL", 3)
    assert basket_from_scores([9, 3], [9, 5], "ASVEL", "MACCABI") == ("MACCABI", 2)
    assert basket_from_scores([9, 5], [9, 5], "ASVEL", "MACCABI") == (None, 0)  # rien n'a changé
    assert basket_from_scores([9, 5], [12, 7], "ASVEL", "MACCABI") is None  # deux paniers : on ne conclut pas
    assert basket_from_scores([9, 5], [None, 7], "ASVEL", "MACCABI") is None
    assert basket_from_scores(None, [9, 5], "ASVEL", "MACCABI") is None
    assert settle_action("dunk", [], 10.0, points=3) == "three_pointer"
    assert settle_action("three_pointer", [], 10.0, points=2) == "basket"
    assert settle_action("layup", [Segment(9.0, 11.0, "à deux mains !")], 10.0, points=2) == "dunk"
    # « three-on-one » est une contre-attaque à 3 contre 1 ; et un dunk vu ne devient pas un 3 points
    assert commentary_type([Segment(33.8, 35.0, "It's a three-on-one.")], 34.0) is None
    assert commentary_type([Segment(33.8, 35.0, "Curry for three!")], 34.0) == "three_pointer"
    assert settle_action("dunk", [Segment(33.8, 35.0, "Curry for three!")], 34.0) == "dunk"


def test_scoreboard_is_read_before_and_after_the_action():
    cuts = [95.0, 104.0, 118.3, 130.0]
    assert score_times(110.0, cuts, 900.0) == (104.3, 115.5)  # le tableau change plusieurs secondes après
    assert score_times(125.0, [], 900.0) == (120.0, 130.5)  # pas de changement de plan proche
    assert score_times(125.0, [127.5], 900.0) == (120.0, 128.5)  # plan trop court : lu au début du suivant


def test_shown_score_ignores_impossible_jumps():
    assert shown_score([6, 3], [9, 3]) == (9, 3)
    assert shown_score([9, 3], [24, 3]) == (9, 3)  # « 24 » : le décompte des tirs, pas le score
    assert shown_score(None, [9, 3]) == (9, 3)
    assert shown_score([9, 3], [None, None]) == (9, 3)
    assert shown_score(None, None) == (None, None)


def test_clips_stay_on_the_wide_live_shots_around_the_action(monkeypatch):
    # Plans : [100-104] public, [104-110] jeu (geste à 108), [110-112] jeu, autre caméra, [112-118] banc
    cuts = [100.0, 104.0, 110.0, 112.0, 118.0]
    views = {100.0: "autre", 104.0: "large", 110.0: "large", 112.0: "gros_plan"}

    def fake_views(server, video, frames, media):
        return {name: views[float(name.split("_")[1])] for name in frames}

    monkeypatch.setattr(analyze_local, "_views", fake_views)
    moment = Moment(start=103.0, key=108.0, end=111.5 + 3.0)
    info = probe_stub()
    info.duration = 200.0
    analyze_local._trim_to_live_shots(None, None, info, [moment], cuts, None, lambda _: None)
    assert moment.start == 104.04  # pas l'image du public avant l'action
    assert moment.end == 111.96  # l'autre plan de jeu est gardé, pas le banc


def test_impossible_score_readings_are_dropped():
    moments = [Moment(start=i, key=i + 1, end=i + 2, score_a=a, score_b=b)
               for i, (a, b) in enumerate([(2, 0), (5, 0), (50, 0), (7, 2), (9, 2)])]
    _drop_inconsistent_scores(moments)
    assert [m.score_a for m in moments] == [2, 5, None, 7, 9]


def test_commentators_reaction_changes_the_rating():
    segments = [
        Segment(110.0, 110.9, "Bingo !"),
        Segment(110.9, 114.8, "Allez, à 3 points, lui aussi, 3 sur 3, bim !"),
        Segment(124.1, 127.2, "Et Jelen Lord va les mettre dedans, à deux mains."),
        Segment(140.9, 141.9, "Oh, il faut les mettre, celle-là !"),
        Segment(141.9, 142.4, "Oh, non !"),
    ]
    assert commentary_reaction(segments, 110.5) == 1.5
    assert commentary_reaction(segments, 125.0) == 0.5
    assert commentary_reaction(segments, 142.0) == -2.0  # tir raté
    assert commentary_reaction(segments, 200.0) == 0.0  # personne ne parle


def test_commentators_name_the_action():
    segments = [
        Segment(124.1, 127.2, "Et Jelen Lord va les mettre dedans, à deux mains."),
        Segment(53.6, 56.0, "Oh, Lundberg, il est contré immédiatement par Jake Runner."),
        Segment(110.9, 114.8, "Allez, à 3 points, lui aussi, Jake Conner, 3 sur 3, bim !"),
        Segment(30.0, 33.0, "L'ASVEL joue contre le Maccabi ce soir."),
    ]
    assert commentary_type(segments, 124.5) == "dunk"
    assert commentary_type(segments, 54.0) == "block"
    assert commentary_type(segments, 111.0) == "three_pointer"
    assert commentary_type(segments, 31.0) is None  # « contre » veut dire « face à »
    assert commentary_type(segments, 80.0) is None
    # Type affiché : annoncé par les commentateurs, sinon « PANIER » pour les tirs que le modèle confond
    assert settle_action("mid_range", segments, 124.5) == "dunk"
    assert settle_action("layup", segments, 111.0) == "three_pointer"
    assert settle_action("three_pointer", segments, 80.0) == "basket"
    assert settle_action("dunk", segments, 80.0) == "dunk"
    assert settle_action("block", [], 10.0) == "block"


def test_description_gives_the_right_spelling_and_music_credit():
    description = ("L'ASVEL de Tony Parker débute sa campagne européenne !\n"
                   "Le trio Fodzo Dada/Mills/Lighty termine avec 39pts\n"
                   "This video features players like: LeBron James, Ja Morant and Blake Griffin")
    written = description_names(description)
    assert {"Tony Parker", "Fodzo Dada", "LeBron James", "Ja Morant", "Blake Griffin"} <= set(written)
    assert canonical_player("Fuzo Dada", written) == "Fodzo Dada"
    assert canonical_player("M. FORTO DADA", written) == "Fodzo Dada"
    assert canonical_player("Patty Mills", written) == "Patty Mills"  # pas de nom complet proche : inchangé
    assert canonical_player("Morant", written) == "Ja Morant"
    assert _MUSIC_CREDIT.search("Music provided by Epidemic Sound")
    assert not _MUSIC_CREDIT.search(description)


def test_spelling_fixes_must_sound_like_what_was_heard():
    assert plausible_fix("Lemon yama", "Victor Wembanyama")
    assert plausible_fix("Ananobi", "OG Anunoby")
    assert plausible_fix("Fox", "De'Aaron Fox")
    assert plausible_fix("Brunson", "Jalen Brunson")
    assert not plausible_fix("Brunson", "Brunson")  # rien à corriger
    assert not plausible_fix("Harper", "James Harden")  # un autre joueur
    assert not plausible_fix("Shackler", "LeBron James")
    assert not plausible_fix("DeAndre Jordan", "Michael Jordan")  # le prénom entendu ne change pas
    assert plausible_fix("Jelen Brunson", "Jalen Brunson")
    # Seuls les noms sûrs sont affichés
    assert trusted_name("Lemon yama", "Victor Wembanyama", True) == "Victor Wembanyama"
    assert trusted_name("Dylan Harper", "Dylan Harper", True) == "Dylan Harper"
    assert trusted_name("Fabrice le François", "Fabrice le François", False) is None
    assert trusted_name("Harper", "James Harden", True) is None
    assert trusted_name("Tasha Verzenkov", "Tasha Verdenikov", False) is None  # réécrit, mais inconnu
    # Nom lu dans une incrustation de la chaîne : fiable, et remis en minuscules
    assert read_on_screen("DYLAN HARPER") and read_on_screen("P. MILLS")
    assert not read_on_screen("Dylan Harper") and not read_on_screen("SA")
    assert display_name("P. MILLS") == "P. Mills"
    assert display_name("PAUL O'REILLY") == "Paul O'Reilly"


def test_titles_are_cut_between_words():
    assert short_title("ASVEL bat Maccabi : Tony Parker et le trio explosent en EuroLeague", 55) == \
        "ASVEL bat Maccabi : Tony Parker et le trio explosent"
    assert short_title("Les plus beaux dunks de tous les temps en une seule vidéo") == \
        "Les plus beaux dunks de tous les temps en une seule vidéo"
    assert short_title("Les dunks  les plus fous") == "Les dunks les plus fous"


def test_player_names_must_have_been_heard():
    heard = "et jelen lord va les mettre dedans a deux mains ! tony parker"
    assert _name_allowed("Jelen Lord", heard)
    assert _name_allowed("Tony Parker", heard)
    assert not _name_allowed("LeBron James", heard)
    assert not _name_allowed("Al", heard)


def test_whisper_output_parsing(tmp_path):
    segment = parse_line("[00:01:50.000 --> 00:01:54.800]   Allez, à 3 points, 3 sur 3, bim !")
    assert (segment.start, segment.end) == (110.0, 114.8)
    assert parse_line("[00:00:01.000 --> 00:00:02.000]   Sous-titres réalisés par la communauté d'Amara.org") is None
    assert parse_line("[00:00:01.000 --> 00:00:02.000]   [Musique]") is None
    assert parse_line("whisper_init_from_file: loading model") is None
    whisper_json = {"result": {"language": "fr"}, "transcription": [
        {"offsets": {"from": 124100, "to": 127200}, "text": " Et Jelen Lord va les mettre dedans."},
        {"offsets": {"from": 130000, "to": 131000}, "text": " ♪"},
    ]}
    path = tmp_path / "transcription.json"
    path.write_text(json.dumps(whisper_json), encoding="utf-8")
    segments, language = load_whisper_json(path)
    assert language == "fr" and len(segments) == 1 and segments[0].start == 124.1


def test_whisper_loops_are_removed():
    real = [Segment(100.0, 102.0, "What a play."), Segment(105.0, 107.0, "LeBron James throws it down!")]
    loop = [Segment(111.0 + i, 112.0 + i, "Jailbreak for the game. What a play.") for i in range(12)]
    kept = drop_loops(real + loop + [Segment(130.0, 131.0, "Oh my!")])
    assert [s.text for s in kept] == ["What a play.", "LeBron James throws it down!", "Oh my!"]


class FakeServer:
    """Imite llama-server : répond selon la question posée (schéma JSON demandé)."""

    calls: list = []

    def __init__(self, paths, media_dir, log_file, settings, log):
        self.media_dir = media_dir

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        pass

    def ask(self, content, schema, max_tokens=1200):
        FakeServer.calls.append((content, schema))
        fields = schema["properties"]
        if "video_type" in fields:
            return {"video_type": "match", "team_a": "ASVEL", "team_b": "MACCABI", "jersey_a": "jaune",
                    "jersey_b": "noir", "competition": "EuroLeague", "scoreboard": "bottom_left"}
        if "actions" in fields:
            video = next(part for part in content if part["type"] == "input_video")
            clip = self.media_dir / video["input_video"]["url"].removeprefix("file://")
            assert probe(clip).width == 448  # l'extrait envoyé au modèle est bien réduit
            return {"actions": [{"key": 8.0, "start": 5.0, "end": 9.5, "action": "dunk", "team": "ASVEL",
                                 "player": "Parker", "scored": True, "replay": False, "spectacular": 8,
                                 "description": "Dunk de Parker."}]}
        if "names" in fields:  # joueur reconnu, déjà bien écrit
            return {"names": [{"heard": "Parker", "name": "Parker", "known": True}] * fields["names"]["minItems"]}
        if "views" in fields:  # la 2e image vérifiée est un ralenti
            count = fields["views"]["minItems"]
            return {"views": ["ralenti" if i == 1 else "large" for i in range(count)]}
        if "scores" in fields:  # tableau lu avant puis après chaque action restante
            readings = [(10, 4), (12, 4),  # +2 pour l'ASVEL
                        (20, 6), (23, 6)]  # +3 pour l'ASVEL, donc un tir à 3 points
            count = fields["scores"]["minItems"]
            return {"scores": [{"score_a": a, "score_b": b} for a, b in readings[:count]]}
        return {"title": "ASVEL met le feu", "description": "Les plus belles actions.", "hashtags": ["basket", "#ASVEL"]}


@pytest.fixture
def fake_engines(tmp_path, monkeypatch):
    files = [tmp_path / name for name in ("llama-server", "model.gguf", "mmproj.gguf", "whisper-cli", "w.bin")]
    for f in files:
        f.write_bytes(b"x")
    monkeypatch.setattr(analyze_local, "local_paths", lambda: LocalPaths(tmp_path, *files))
    monkeypatch.setattr(analyze_local, "LlamaServer", FakeServer)
    FakeServer.calls = []


@needs_ffmpeg
def test_full_local_analysis_and_resume(tmp_path, fake_engines):
    video = make_synthetic_video(tmp_path / "match.mp4", [(20.0, 0.1), (25.0, 0.6), (20.0, 0.1)], size="640x360")
    info = probe(video)
    work = tmp_path / "travail"
    work.mkdir()
    (work / "transcription.json").write_text(json.dumps({"result": {"language": "fr"}, "transcription": [
        {"offsets": {"from": 15000, "to": 17000}, "text": " Parker, à deux mains !"}]}), encoding="utf-8")
    logs = []
    analysis = run_local_analysis(video, info, [20.0, 45.0], "Résumé ASVEL - Maccabi", "beIN", work,
                                  LocalSettings(), logs.append)

    assert analysis.analyzer == "locale" and analysis.video_type == "match"
    assert (analysis.team_a, analysis.team_b) == ("ASVEL", "MACCABI")
    assert analysis.title == "ASVEL met le feu" and "#ASVEL" in analysis.hashtags
    first = analysis.moments[0]
    # À 1 image/s, l'extrait est accéléré ×2 : le temps donné par le modèle (8 s) est remis à l'échelle
    assert first.key == 16.0 and first.player == "Parker"
    assert (first.start, first.end) == (10.0, 19.5)  # marge autour du geste décisif
    live = [m for m in analysis.moments if not m.replay]
    assert len(analysis.moments) == 3 and len(live) == 2  # le ralenti est écarté
    assert sorted((m.score_a, m.score_b) for m in live) == [(12, 4), (23, 6)]  # score lu après l'action
    assert "three_pointer" in {m.action for m in live}  # +3 au tableau, même si le modèle a dit « dunk »
    prompts = [part["text"] for content, _ in FakeServer.calls for part in content if part["type"] == "text"]
    assert any("Parker, à deux mains" in p for p in prompts)  # commentaires transmis au modèle
    assert any("fenêtres" in line for line in logs)

    windows_asked = sum("actions" in schema["properties"] for _, schema in FakeServer.calls)
    FakeServer.calls = []
    again = run_local_analysis(video, info, [20.0, 45.0], "Résumé ASVEL - Maccabi", "beIN", work,
                               LocalSettings(), lambda _: None)
    assert windows_asked >= 2
    assert not any("actions" in schema["properties"] for _, schema in FakeServer.calls)  # fenêtres reprises
    assert [m.key for m in again.moments] == [m.key for m in analysis.moments]


def test_missing_engines_explain_how_to_install(tmp_path, monkeypatch):
    monkeypatch.setattr(analyze_local, "local_paths", lambda: LocalPaths(tmp_path, *(tmp_path / n for n in "abcde")))
    video = tmp_path / "v.mp4"
    with pytest.raises(AnalysisError, match="installer.bat"):
        run_local_analysis(video, probe_stub(), [], "t", None, tmp_path, LocalSettings(), lambda _: None)


def probe_stub():
    from hoopcut.ffmpeg_utils import MediaInfo

    return MediaInfo(duration=60.0, width=1280, height=720, fps=25.0, has_audio=True)
