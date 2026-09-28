"""Changements de plan : coupes franches, flashs blancs et fondus au noir."""

import shutil
import subprocess

import pytest

from hoopcut.shots import detect_cuts, luminance_transitions, parse_frame_stats

needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="FFmpeg absent")


def _curve(points):
    """Luminosité interpolée à 15 images/s entre des points (instant, valeur)."""
    times, lumas = [], []
    for (t0, y0), (t1, y1) in zip(points, points[1:]):
        steps = round((t1 - t0) * 15)
        for i in range(steps):
            times.append(round(t0 + i / 15, 3))
            lumas.append(y0 + (y1 - y0) * i / steps)
    return times, lumas


def test_white_flash_and_fade_to_black_are_transitions():
    times, lumas = _curve([(0, 100), (1.3, 100), (1.6, 230), (1.9, 110), (4.0, 110), (4.3, 8), (4.6, 120), (6, 120)])
    found = luminance_transitions(times, lumas)
    assert len(found) == 2
    assert abs(found[0] - 1.6) < 0.1 and abs(found[1] - 4.3) < 0.1


def test_ordinary_brightness_changes_are_ignored():
    times, lumas = _curve([(0, 100), (1, 125), (2, 95), (3, 130), (4, 100)])
    assert luminance_transitions(times, lumas) == []


def test_parse_ffmpeg_metadata():
    text = (
        "frame:0    pts:0       pts_time:0\nlavfi.scene_score=0.000000\n"
        "frame:0    pts:0       pts_time:0\nlavfi.signalstats.YAVG=101.5\n"
        "frame:1    pts:1024    pts_time:0.0666667\nlavfi.scene_score=0.450000\n"
        "frame:1    pts:1024    pts_time:0.0666667\nlavfi.signalstats.YAVG=180\n"
    )
    times, scenes, lumas = parse_frame_stats(text)
    assert times == [0.0, 0.0666667] and scenes == [0.0, 0.45] and lumas == [101.5, 180.0]


@needs_ffmpeg
def test_detects_a_gradual_white_flash_in_a_real_video(tmp_path):
    video = tmp_path / "flash.mp4"
    graph = (
        "[0:v]fade=t=out:st=2.6:d=0.4:c=white[a];[1:v]fade=t=in:st=0:d=0.4:c=white[b];"
        "[a][b]concat=n=2:v=1:a=0[v]"
    )
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-t", "3", "-i", "testsrc2=s=320x180:r=25",
         "-f", "lavfi", "-t", "3", "-i", "smptehdbars=s=320x180:r=25", "-filter_complex", graph, "-map", "[v]",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", str(video)],
        check=True,
    )
    cuts = detect_cuts(video)
    assert any(2.7 <= c <= 3.3 for c in cuts)
