"""Interface dans le navigateur : vrai serveur local, vraie vidéo (synthétique), analyse IA simulée."""

import json
import shutil
import threading
import time
import urllib.error
import urllib.request

import pytest

from hoopcut.feedback import EDITS_FILE, JOURNAL_FILE, learn, read_journal
from hoopcut.fetch import fetch
from hoopcut.ffmpeg_utils import probe
from hoopcut.interface import Server, Studio, _stage
from hoopcut.models import Analysis
from hoopcut.pipeline import JobSettings, analysis_cache
from hoopcut.render import RenderSettings
from hoopcut.select import SelectionSettings

from fake_ai import fake_ai_analysis, fake_transcript
from synthetic import make_synthetic_video

SCENES = [(3.0 + i % 3, 0.6 if i % 4 == 1 else 0.1) for i in range(12)]


class Page:
    """Un onglet de navigateur : garde le cookie de session et parle à hoopcut."""

    def __init__(self, url):
        self.url = url.rstrip("/")
        self.cookie = None

    def request(self, path, body=None, headers=None):
        data = None if body is None else json.dumps(body).encode()
        request = urllib.request.Request(self.url + path, data=data, method="POST" if data else "GET")
        if data:
            request.add_header("Content-Type", "application/json")
        if self.cookie:
            request.add_header("Cookie", self.cookie)
        for key, value in (headers or {}).items():
            request.add_header(key, value)
        try:
            with urllib.request.urlopen(request, timeout=30) as reply:
                cookie = reply.headers.get("Set-Cookie")
                if cookie:
                    self.cookie = cookie.split(";")[0]
                return reply.status, dict(reply.headers), reply.read()
        except urllib.error.HTTPError as error:
            return error.code, dict(error.headers), error.read()

    def api(self, path, body=None):
        status, _, data = self.request(path, body)
        assert status == 200, data.decode()
        return json.loads(data)

    def wait_for(self, step, timeout=120):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            state = self.api("/api/etat")
            if state["etape"] == step:
                return state
            assert state["etape"] != "erreur", state["erreur"]
            time.sleep(0.3)
        raise AssertionError(f"étape « {step} » jamais atteinte")


@pytest.fixture
def studio_page(tmp_path):
    video = make_synthetic_video(tmp_path / "match.mp4", SCENES, size="640x360")
    job = JobSettings(
        work_root=tmp_path / "travail",
        out_root=tmp_path / "sorties",
        selection=SelectionSettings(min_total=12, max_total=18, target=15),
        render=RenderSettings(preset="ultrafast"),
        avis_dir=tmp_path / "avis",
    )
    source = fetch(str(video), job.work_root)  # analyse IA déjà en cache : aucun modèle lancé
    analysis = Analysis.from_ai(fake_ai_analysis(SCENES), duration=source.info.duration, model="faux")
    analysis_cache(source.work_dir, job).write_text(analysis.model_dump_json(), encoding="utf-8")
    (source.work_dir / "transcription.json").write_text(json.dumps(fake_transcript(SCENES)), encoding="utf-8")

    server = Server(("127.0.0.1", 0), Studio(job))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    page = Page(server.url)
    try:
        yield page, video, job, source.work_dir
    finally:
        server.shutdown()
        server.server_close()


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="FFmpeg absent")
def test_preview_opinions_and_validation(studio_page):
    page, video, job, work_dir = studio_page

    status, headers, html = page.request("/")
    assert status == 200 and b"hoopcut" in html and page.cookie
    assert b"{{CONFIG}}" not in html and "Coupé trop tôt".encode() in html

    state = page.api("/api/etat")
    assert state["etape"] == "accueil"
    page.api("/api/analyser", {"source": str(video)})
    state = page.wait_for("apercu")
    preview = state["apercu"]
    clips = preview["clips"]
    assert clips and 12 <= preview["duree"] <= 18
    assert preview["titre"] == "La première européenne de Parker"
    assert 0 < preview["cadre"]["haut"] < 50 and preview["cadre"]["largeur"] == 100
    # L'accroche ouvre le short : un extrait d'un des clips suivants
    opening = clips[0]
    assert opening["accroche"] and opening["id"] == "accroche"
    assert any(not c["accroche"] and c["debut"] <= opening["debut"] < opening["fin"] <= c["fin"] + 1.1 for c in clips)
    # Cris des commentateurs reconnus dans la transcription
    shouted = [c for c in clips if c["cri"]]
    assert shouted and {c["cri"]["texte"] for c in shouted} <= {"WHAT A DUNK !", "MY GOODNESS !", "INCROYABLE !",
                                                                 "QUEL CONTRE !"}
    assert all(c["debut"] <= c["cri"]["debut"] < c["cri"]["fin"] <= c["fin"] for c in shouted)
    status, _, png = page.request(shouted[0]["cri"]["image"])
    assert status == 200 and png.startswith(b"\x89PNG")

    status, headers, png = page.request(clips[0]["habillage"])
    assert status == 200 and png.startswith(b"\x89PNG")
    status, headers, part = page.request(preview["video"], headers={"Range": "bytes=100-199"})
    assert status == 206 and len(part) == 100
    assert headers["Content-Range"].startswith("bytes 100-199/")
    status, _, _ = page.request(preview["video"], headers={"Range": "bytes=99999999999-"})
    assert status == 416

    # « Pas bon : action sans intérêt » : le clip disparaît, l'avis est noté avec une image
    removed = next(c["id"] for c in clips if not c["accroche"])
    answer = page.api("/api/avis", {"id": removed, "raison": "ennuyeux", "texte": "bof"})
    assert "retiré" in answer["message"]
    assert removed not in [c["id"] for c in answer["apercu"]["clips"]]
    entry = read_journal(job.avis_dir / JOURNAL_FILE)[-1]
    assert (entry["avis"], entry["raison"], entry["texte"]) == ("pas_bon", "ennuyeux", "bof")
    assert entry["moment"]["action"] and entry["clip"]["fin"] > entry["clip"]["debut"]
    assert removed in json.loads((work_dir / EDITS_FILE).read_text(encoding="utf-8"))["retires"]

    # Accroche refusée : une autre action la remplace (ou plus d'accroche s'il n'y en a pas d'autre)
    assert page.request("/api/avis", {"id": "accroche", "raison": "ennuyeux"})[0] == 400  # raison d'un clip
    answer = page.api("/api/avis", {"id": "accroche", "raison": "rien"})
    assert "accroche" in answer["message"].lower() and answer["apercu"]["reprendre"] == 0

    # Cri faux : retiré de ce clip
    with_shout = next((c for c in answer["apercu"]["clips"] if c["cri"] and not c["accroche"]), None)
    if with_shout:
        answer = page.api("/api/avis", {"id": with_shout["id"], "raison": "cri"})
        assert next(c for c in answer["apercu"]["clips"] if c["id"] == with_shout["id"])["cri"] is None
        assert read_journal(job.avis_dir / JOURNAL_FILE)[-1]["clip"]["cri"] == with_shout["cri"]["texte"]

    # Légende corrigée
    target = next(c["id"] for c in answer["apercu"]["clips"] if not c["accroche"])
    answer = page.api("/api/avis", {"id": target, "raison": "legende", "action": "dunk", "joueur": "Victor Wembanyama"})
    fixed = next(c for c in answer["apercu"]["clips"] if c["id"] == target)
    assert fixed["legende"] == "DUNK · Victor Wembanyama"
    assert answer["apercu"]["reprendre"] == [c["id"] for c in answer["apercu"]["clips"]].index(target)

    # Clip coupé trop tôt : allongé (ou un message dit pourquoi ce n'est pas possible)
    answer = page.api("/api/avis", {"id": target, "raison": "fin_coupee"})
    assert any(word in answer["message"] for word in ("allongé", "Impossible", "remplace"))

    # Un ancien habillage n'est plus servi
    status, _, _ = page.request(clips[0]["habillage"])
    assert status == 404

    # Titre changé à la main : gardé pour cette vidéo, noté dans le journal
    answer = page.api("/api/titre", {"titre": "  Parker   régale ", "clip": 1})
    assert answer["apercu"]["titre"] == "Parker régale" and answer["apercu"]["reprendre"] == 1
    assert json.loads((work_dir / EDITS_FILE).read_text(encoding="utf-8"))["titre"] == "Parker régale"
    assert read_journal(job.avis_dir / JOURNAL_FILE)[-1]["nouveau"] == "Parker régale"
    assert page.request("/api/titre", {"titre": " "})[0] == 400

    page.api("/api/valider", {})
    state = page.wait_for("termine", timeout=180)
    out = state["sortie"]
    assert out["nom"].endswith(".mp4") and "TITRE\nParker régale" in out["publication"]
    status, headers, data = page.request(out["video"])
    assert status == 200 and headers["Content-Type"] == "video/mp4" and len(data) > 10_000
    info = probe(job.out_root / out["nom"])
    assert (info.width, info.height) == (1080, 1920)

    journal = read_journal(job.avis_dir / JOURNAL_FILE)
    assert journal[-1]["avis"] == "valide" and journal[-1]["clips"]
    refused = sum(1 for entry in journal if entry["avis"] == "pas_bon")
    assert learn(job.avis_dir / JOURNAL_FILE).opinions == len(journal[-1]["clips"]) + refused

    page.api("/api/nouveau", {})
    state = page.api("/api/etat")
    assert state["etape"] == "accueil" and state["appris"]["avis"] > 0
    assert state["recents"] == []  # vidéo locale : pas de lien à reproposer


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="FFmpeg absent")
def test_only_this_page_on_this_pc_can_use_hoopcut(studio_page):
    page, video, _, _ = studio_page
    assert page.request("/api/etat")[0] == 403  # pas encore de cookie : la page n'a pas été ouverte
    page.request("/")
    assert page.request("/api/etat")[0] == 200
    assert page.request("/api/etat", headers={"Host": "exemple.com"})[0] == 403  # autre site pointant sur ce PC
    assert page.request("/api/analyser", {"source": str(video)}, headers={"Origin": "http://exemple.com"})[0] == 403
    status, _, data = page.request("/api/analyser", {"source": ""})
    assert status == 400 and "Colle" in json.loads(data)["erreur"]
    assert page.request("/api/valider", {})[0] == 400  # rien à valider
    assert page.request("/ping")[2] == b"hoopcut"


def test_progress_is_read_from_the_log():
    assert _stage("[1/5] Récupération de la vidéo", "analyse")[0] == 0.01
    progress, detail = _stage("[12/31] 05:30.0 → 06:00.0 : dunk — reste ≈ 9 min", "analyse")
    assert 0.12 < progress < 0.82 and "12 sur 31" in detail and "9 min" in detail
    # une vidéo courte a peut-être 5 passages : « [3/5] 01:00.0 → … » n'est pas l'étape 3/5
    assert "passage 3 sur 5" in _stage("[3/5] 01:00.0 → 01:30.0 : rien de notable", "analyse")[1]
    assert _stage("[3/5] Analyse déjà faite, réutilisée", "analyse")[0] == 0.95
    assert _stage("Clip 2/8", "montage")[1] == "Montage du clip 2 sur 8…"
    progress, detail = _stage("Tableau de score lu : 12/24 actions", "analyse")
    assert progress == pytest.approx(0.91) and detail == "Lecture du tableau de score (12 sur 24)…"
    assert _stage("Images vérifiées : 36/144", "analyse")[1] == "Vérification des meilleures actions (36 sur 144)…"
    assert _stage("n'importe quoi", "analyse") is None
