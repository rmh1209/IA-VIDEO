"""Chemin Gemini testé hors ligne avec un faux client (aucun appel réseau)."""

import json
from types import SimpleNamespace

import pytest

from hoopcut import analyze
from hoopcut.analyze import AnalysisError, GeminiSettings, analyze_with_gemini, auto_fps, parse_json_loose

from fake_ai import fake_ai_analysis
from synthetic import default_scenes


class ApiError(Exception):
    def __init__(self, status_code):
        super().__init__(f"HTTP {status_code}")
        self.status_code = status_code


class FakeClient:
    """Imite genai.Client : files.upload/get/delete et interactions.create."""

    def __init__(self, answer: str, failures=()):
        self.requests = []
        self.deleted = []
        self._answer = answer
        self._failures = list(failures)
        uploaded = SimpleNamespace(name="files/abc", uri="https://fake/abc", mime_type="video/mp4",
                                   state=SimpleNamespace(name="ACTIVE"))
        self.files = SimpleNamespace(
            upload=lambda file, config: uploaded,
            get=lambda name: uploaded,
            delete=lambda name: self.deleted.append(name),
        )
        self.interactions = SimpleNamespace(create=self._create)

    def _create(self, **request):
        self.requests.append(request)
        if self._failures:
            raise self._failures.pop(0)
        usage = SimpleNamespace(total_input_tokens=120_000, total_output_tokens=4_000, total_thought_tokens=1_000)
        return SimpleNamespace(output_text=self._answer, status="completed", usage=usage)


@pytest.fixture
def gemini_answer():
    return fake_ai_analysis(default_scenes()).model_dump_json()


@pytest.fixture
def fake_genai(monkeypatch):
    """Remplace google.genai.Client par un faux client ; renvoie une fonction pour le configurer."""
    from google import genai

    holder = {}

    def install(answer, failures=()):
        client = FakeClient(answer, failures)
        monkeypatch.setattr(genai, "Client", lambda api_key=None: client)
        monkeypatch.setenv("GEMINI_API_KEY", "fausse-cle")
        holder["client"] = client
        return client

    return install


def test_full_analysis_with_fake_gemini(tmp_path, fake_genai, gemini_answer):
    client = fake_genai(gemini_answer)
    video = tmp_path / "video.mp4"
    video.write_bytes(b"\x00")
    logs = []
    analysis = analyze_with_gemini(video, 167.0, GeminiSettings(), work_dir=tmp_path, log=logs.append)

    assert analysis.team_a == "ASVEL" and analysis.video_type == "match"
    assert len(analysis.moments) == len(default_scenes())
    request = client.requests[0]
    video_block, text_block = request["input"]
    assert video_block["processing"] == {"type": "static", "fps": 2.0}
    assert video_block["resolution"] == "medium"
    assert request["response_format"]["mime_type"] == "application/json"
    assert "MM:SS.d" in text_block["text"]
    assert client.deleted == ["files/abc"]  # la vidéo envoyée est supprimée
    assert any("coût estimé" in line for line in logs)
    assert (tmp_path / "gemini_reponse_brute.json").exists()


def test_rejected_settings_fall_back_to_a_simpler_request(tmp_path, fake_genai, gemini_answer):
    client = fake_genai(gemini_answer, failures=[ApiError(400), ApiError(400)])
    video = tmp_path / "video.mp4"
    video.write_bytes(b"\x00")
    analysis = analyze_with_gemini(video, 167.0, GeminiSettings(), work_dir=tmp_path, log=lambda _: None)
    assert analysis.moments
    first, second, third = client.requests
    assert "resolution" in first["input"][0] and "resolution" not in second["input"][0]
    assert "response_format" not in third
    assert "schéma JSON" in third["input"][1]["text"]


def test_bad_key_stops_immediately(tmp_path, fake_genai, gemini_answer):
    client = fake_genai(gemini_answer, failures=[ApiError(403)])
    video = tmp_path / "video.mp4"
    video.write_bytes(b"\x00")
    with pytest.raises(AnalysisError, match="Clé Gemini refusée"):
        analyze_with_gemini(video, 167.0, GeminiSettings(), work_dir=tmp_path, log=lambda _: None)
    assert len(client.requests) == 1


def test_temporary_errors_are_retried(tmp_path, fake_genai, gemini_answer, monkeypatch):
    monkeypatch.setattr(analyze.time, "sleep", lambda _: None)
    client = fake_genai(gemini_answer, failures=[ApiError(503), ApiError(429)])
    video = tmp_path / "video.mp4"
    video.write_bytes(b"\x00")
    analyze_with_gemini(video, 167.0, GeminiSettings(model="gemini-3.8-flash"), work_dir=tmp_path,
                        log=lambda _: None)
    assert len(client.requests) == 3
    assert all("resolution" in r["input"][0] for r in client.requests)


def test_invalid_key_detected_at_upload(tmp_path, fake_genai, gemini_answer):
    client = fake_genai(gemini_answer)

    def refuse(file, config):
        raise Exception("400 INVALID_ARGUMENT: API key not valid. Please pass a valid API key.")

    client.files.upload = refuse
    video = tmp_path / "video.mp4"
    video.write_bytes(b"\x00")
    with pytest.raises(AnalysisError, match="Clé Gemini refusée"):
        analyze_with_gemini(video, 60.0, GeminiSettings(), work_dir=tmp_path, log=lambda _: None)
    assert client.requests == []


def test_missing_key_gives_clear_message(tmp_path, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    with pytest.raises(AnalysisError, match="aistudio.google.com"):
        analyze_with_gemini(tmp_path / "v.mp4", 60.0, GeminiSettings(), work_dir=tmp_path)


def test_agentic_mode_request(tmp_path, fake_genai, gemini_answer):
    client = fake_genai(gemini_answer)
    video = tmp_path / "video.mp4"
    video.write_bytes(b"\x00")
    analyze_with_gemini(video, 167.0, GeminiSettings(processing="agentic"), work_dir=tmp_path, log=lambda _: None)
    assert client.requests[0]["input"][0]["processing"] == "agentic"


def test_parse_json_loose():
    payload = {"a": 1}
    assert parse_json_loose(json.dumps(payload)) == payload
    assert parse_json_loose("Voici :\n```json\n" + json.dumps(payload) + "\n```") == payload
    with pytest.raises(ValueError):
        parse_json_loose("pas de json")


def test_auto_fps():
    assert auto_fps(8 * 60) == 2.0
    assert auto_fps(20 * 60) == 1.0
    assert auto_fps(2 * 3600) == 0.5
