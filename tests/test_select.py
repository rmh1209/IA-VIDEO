import pytest

from hoopcut.models import Analysis, Moment
from hoopcut.select import SelectionSettings, select_clips


def _analysis(count=30, spacing=10.0, video_type="match", **moment_fields):
    moments = []
    for i in range(count):
        start = i * spacing + 1.0
        fields = {
            "action": ["dunk", "three_pointer", "block", "steal"][i % 4],
            "team": "ASVEL" if i % 2 == 0 else "MACCABI",
            "player": ["Parker", "De Colo", None][i % 3],
            "spectacular": 1 + (i * 7) % 10,
            "importance": 5,
        }
        fields.update(moment_fields)
        moments.append(Moment(start=start, key=start + 5.0, end=start + 7.0, **fields))
    return Analysis(source_duration=count * spacing + 5.0, video_type=video_type, team_a="ASVEL",
                    team_b="MACCABI", moments=moments)


def _no_overlap(clips):
    ordered = sorted(clips, key=lambda c: c.start)
    return all(a.end <= b.start for a, b in zip(ordered, ordered[1:]))


def test_total_duration_lands_between_60_and_80_seconds():
    plan = select_clips(_analysis(), cuts=[], settings=SelectionSettings())
    assert 60.0 <= plan.total <= 80.0
    assert _no_overlap(plan.clips)
    assert all(3.0 <= c.duration <= 9.0 for c in plan.clips)
    assert not plan.warnings


def test_match_is_chronological_and_prefers_spectacular_actions():
    analysis = _analysis()
    plan = select_clips(analysis, cuts=[], settings=SelectionSettings())
    starts = [c.start for c in plan.clips]
    assert starts == sorted(starts)
    kept = {id(c.moment) for c in plan.clips}
    best = max(analysis.moments, key=lambda m: m.spectacular)
    worst = min(analysis.moments, key=lambda m: m.spectacular)
    assert id(best) in kept
    assert id(worst) not in kept


def test_compilation_builds_up_to_the_best_action():
    plan = select_clips(_analysis(video_type="compilation"), cuts=[], settings=SelectionSettings())
    values = [c.value for c in plan.clips]
    assert values == sorted(values)


def test_hook_order_puts_the_best_action_first():
    plan = select_clips(_analysis(), cuts=[], settings=SelectionSettings(order="accroche"))
    assert plan.clips[0].value == max(c.value for c in plan.clips)


def test_replays_are_never_used():
    analysis = _analysis()
    replay = analysis.moments[3]
    replay.replay = True
    replay.spectacular = 10
    plan = select_clips(analysis, cuts=[], settings=SelectionSettings())
    assert all(not c.moment.replay for c in plan.clips)


def test_clip_stops_before_a_replay_of_the_same_action():
    moment = Moment(start=10.0, key=14.0, end=20.0, spectacular=10, importance=10)
    replay = Moment(start=15.5, key=18.0, end=24.0, replay=True)
    filler = [Moment(start=30.0 + 10 * i, key=35.0 + 10 * i, end=37.0 + 10 * i, spectacular=6) for i in range(12)]
    analysis = Analysis(source_duration=200.0, moments=[moment, replay, *filler])
    plan = select_clips(analysis, cuts=[], settings=SelectionSettings())
    clip = next(c for c in plan.clips if c.moment is moment)
    assert clip.end < 15.5


def test_cuts_are_aligned_on_shot_changes():
    moment = Moment(start=10.0, key=14.0, end=17.0, spectacular=10, importance=10)
    filler = [Moment(start=30.0 + 10 * i, key=35.0 + 10 * i, end=37.0 + 10 * i, spectacular=6) for i in range(12)]
    analysis = Analysis(source_duration=200.0, moments=[moment, *filler])
    # plan précédent jusqu'à 10.6 s, plan suivant à partir de 15.4 s
    plan = select_clips(analysis, cuts=[10.6, 15.4], settings=SelectionSettings())
    clip = next(c for c in plan.clips if c.moment is moment)
    assert clip.start == pytest.approx(10.64)
    assert clip.end == pytest.approx(15.36)


def test_scarce_material_uses_longer_clips_without_crossing_a_shot_change():
    # 9 actions de 5 s : 45 s seulement avec les bornes de l'IA -> clips allongés
    moments = [Moment(start=20.0 * i + 5.0, key=20.0 * i + 8.5, end=20.0 * i + 10.0, spectacular=8) for i in range(9)]
    cuts = [20.0 * i + 12.0 for i in range(9)]  # changement de plan 2 s après chaque action
    analysis = Analysis(source_duration=200.0, moments=moments)
    plan = select_clips(analysis, cuts=cuts, settings=SelectionSettings())
    assert 60.0 <= plan.total <= 80.0
    for clip in plan.clips:
        assert not any(clip.start < cut < clip.end for cut in cuts)


def test_player_focus_keeps_only_that_player_when_possible():
    analysis = _analysis(count=40)
    plan = select_clips(analysis, cuts=[], settings=SelectionSettings(focus_players=["parker"]))
    assert 60.0 <= plan.total <= 80.0
    assert all(c.moment.player == "Parker" for c in plan.clips)
    assert not plan.warnings


def test_focus_is_completed_with_other_actions_when_needed():
    analysis = _analysis(count=16)  # 8 actions de l'ASVEL : moins de 60 s à elles seules
    plan = select_clips(analysis, cuts=[], settings=SelectionSettings(focus_teams=["LDLC ASVEL"]))
    assert 60.0 <= plan.total <= 80.0
    teams = [c.moment.team for c in plan.clips]
    assert "MACCABI" in teams
    assert teams.count("ASVEL") >= 6
    assert plan.warnings


def test_short_source_gives_a_warning_instead_of_failing():
    plan = select_clips(_analysis(count=5), cuts=[], settings=SelectionSettings())
    assert plan.clips
    assert plan.total < 60.0
    assert any("pas assez" in w for w in plan.warnings)


def test_duplicate_actions_are_merged():
    analysis = _analysis(count=20)
    twin = analysis.moments[4].model_copy()
    analysis.moments.append(twin)
    plan = select_clips(analysis, cuts=[], settings=SelectionSettings())
    assert _no_overlap(plan.clips)
