"""Réponse « comme Gemini » pour la vidéo synthétique : permet de tester tout le chemin IA hors ligne."""

from __future__ import annotations

from hoopcut.models import AIAnalysis
from hoopcut.text_utils import format_timecode

ACTIONS = ["dunk", "three_pointer", "block", "alley_oop", "steal", "layup", "crossover", "buzzer_beater"]
PLAYERS = ["Tony Parker", None, "Nando De Colo", "Theo Maledon", None, "Élie Okobo"]


def fake_ai_analysis(scenes: list[tuple[float, float]]) -> AIAnalysis:
    moments = []
    t = 0.0
    score_a = score_b = 0
    for i, (duration, _) in enumerate(scenes):
        a, b = t, t + duration
        t = b
        team_is_a = i % 3 != 2
        replay = i % 7 == 6  # quelques ralentis à écarter
        if not replay:
            points = 3 if ACTIONS[i % len(ACTIONS)] == "three_pointer" else 2
            if team_is_a:
                score_a += points
            else:
                score_b += points
        moments.append(
            {
                "start": format_timecode(a + 0.3),
                "key": format_timecode(a + 0.7 * duration),
                "end": format_timecode(b - 0.2),
                "action": ACTIONS[i % len(ACTIONS)],
                "description": f"Action numéro {i + 1}",
                "team": "LDLC ASVEL" if team_is_a else "Maccabi",
                "player": PLAYERS[i % len(PLAYERS)],
                "spectacular": 3 + (i * 5) % 8,
                "importance": 9 if i >= len(scenes) - 3 else 4 + i % 4,
                "replay": replay,
                "score_a": score_a,
                "score_b": score_b,
            }
        )
    return AIAnalysis.model_validate(
        {
            "video_type": "match",
            "team_a": "ASVEL",
            "team_b": "MACCABI",
            "competition": "EuroLeague",
            "source_has_music": False,
            "moments": moments,
            "final_score_a": score_a,
            "final_score_b": score_b,
            "title": "La première européenne de Parker",
            "description": "Les plus belles actions d'ASVEL - Maccabi.",
            "hashtags": ["basket", "#EuroLeague", "ASVEL"],
        }
    )
