import json

import pytest

from hoopcut.models import AIAnalysis, Analysis
from hoopcut.text_utils import format_timecode, matches_any, parse_timecode, same_name, slugify


@pytest.mark.parametrize(
    "value, expected",
    [("01:15.5", 75.5), ("1:15", 75.0), ("1:02:03", 3723.0), ("75.5", 75.5), ("75,5s", 75.5), (42, 42.0)],
)
def test_parse_timecode(value, expected):
    assert parse_timecode(value) == pytest.approx(expected)


@pytest.mark.parametrize("value", ["", "abc", "1:2:3:4", "-5"])
def test_parse_timecode_rejects_garbage(value):
    with pytest.raises(ValueError):
        parse_timecode(value)


def test_format_timecode_round_trip():
    assert format_timecode(75.5) == "01:15.5"
    assert parse_timecode(format_timecode(3723.2)) == pytest.approx(3723.2)


def test_names():
    assert slugify("Résumé : ASVEL vs MACCABI !") == "resume-asvel-vs-maccabi"
    assert same_name("LDLC ASVEL", "asvel")
    assert not same_name("ASVEL", "Monaco")
    assert matches_any("Dunk rageur de Tony Parker", ["parker"])
    assert not matches_any(None, ["parker"])


def _ai(**overrides):
    base = {
        "video_type": "match",
        "team_a": "ASVEL",
        "team_b": "MACCABI",
        "competition": None,
        "source_has_music": False,
        "moments": [],
        "final_score_a": 88,
        "final_score_b": 85,
        "title": " Titre ",
        "description": "Desc",
        "hashtags": ["basket", "#Euro League", ""],
    }
    base.update(overrides)
    return AIAnalysis.model_validate(base)


def _moment(start, key, end, **overrides):
    moment = {
        "start": start, "key": key, "end": end, "action": "dunk", "description": "Dunk", "team": "ldlc asvel",
        "player": " ", "spectacular": 14, "importance": 0, "replay": False, "score_a": None, "score_b": None,
    }
    moment.update(overrides)
    return moment


def test_analysis_from_ai_cleans_the_answer():
    ai = _ai(
        moments=[
            _moment("00:20.0", "00:23.5", "00:26.0"),
            _moment("00:05.0", "00:30.0", "00:09.0"),  # instant clé hors de l'action : recentré
            _moment("nimporte", "00:01.0", "00:02.0"),  # timecode illisible : ignoré
            _moment("02:00.0", "02:01.0", "03:00.0"),  # déborde de la vidéo : borné
        ]
    )
    analysis = Analysis.from_ai(ai, duration=125.0, model="test")
    assert [m.start for m in analysis.moments] == [5.0, 20.0, 120.0]
    first, second, last = analysis.moments
    assert first.start <= first.key <= first.end
    assert second.team == "ASVEL"  # nom ramené à celui du tableau de score
    assert second.player is None
    assert (second.spectacular, second.importance) == (10, 1)
    assert last.end == 125.0
    assert analysis.title == "Titre"
    assert analysis.hashtags == ["#basket", "#EuroLeague"]
    assert analysis.has_final_score


def test_schema_sent_to_gemini_is_strict():
    schema = AIAnalysis.model_json_schema()
    moment = schema["$defs"]["AIMoment"]
    assert set(moment["required"]) == set(moment["properties"])
    assert set(schema["required"]) == set(schema["properties"])
    assert "default" not in json.dumps(schema)
    assert "dunk" in moment["properties"]["action"]["enum"]
