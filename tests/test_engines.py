"""Installation de l'IA locale : téléchargement vérifié, décompression, emplacements."""

import hashlib
import http.server
import io
import threading
import zipfile
from functools import partial

import pytest

from hoopcut import engines
from hoopcut.engines import Download, install, local_paths


@pytest.fixture
def web(tmp_path):
    """Petit serveur HTTP local (sans reprise de téléchargement, comme certains serveurs réels)."""
    root = tmp_path / "web"
    root.mkdir()
    handler = partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
    handler.log_message = lambda *args: None
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield root, f"http://127.0.0.1:{server.server_address[1]}"
    server.shutdown()


def _item(root, base, name, content, **extra):
    (root / name).write_bytes(content)
    return Download(f"{base}/{name}", f"dossier/{name}", len(content), hashlib.sha256(content).hexdigest(), **extra)


def test_install_downloads_checks_and_extracts(tmp_path, web, monkeypatch):
    root, base = web
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w") as z:
        z.writestr("bin/moteur.exe", b"moteur")
    model = _item(root, base, "modele.gguf", b"poids du modele" * 1000)
    engine = _item(root, base, "moteur.zip", archive.getvalue(), extract_to="moteurs/x", marker="bin/moteur.exe")
    monkeypatch.setattr(engines, "MODELS", [model])
    monkeypatch.setattr(engines, "WINDOWS_ENGINES", [engine])
    monkeypatch.setattr(engines, "WINDOWS", True)
    data = tmp_path / "donnees"
    (data / "dossier").mkdir(parents=True)
    (data / "dossier" / "modele.gguf.part").write_bytes(b"debut")  # reprise d'un téléchargement coupé

    logs = []
    install(data, logs.append)
    assert (data / "dossier" / "modele.gguf").read_bytes() == b"poids du modele" * 1000
    assert (data / "moteurs" / "x" / "bin" / "moteur.exe").read_bytes() == b"moteur"
    assert not (data / "dossier" / "moteur.zip").exists()  # l'archive ne reste pas

    logs.clear()
    install(data, logs.append)
    assert any("déjà téléchargé" in line for line in logs)
    assert any("déjà installé" in line for line in logs)


def test_corrupted_download_is_refused(tmp_path, web, monkeypatch):
    root, base = web
    item = _item(root, base, "modele.gguf", b"contenu")
    bad = Download(item.url, item.path, item.size, "0" * 64)
    monkeypatch.setattr(engines, "MODELS", [bad])
    monkeypatch.setattr(engines, "WINDOWS", False)
    with pytest.raises(RuntimeError, match="corrompu"):
        install(tmp_path / "donnees", lambda _: None)
    assert not list((tmp_path / "donnees" / "dossier").iterdir())


def test_paths_follow_the_data_folder(tmp_path, monkeypatch):
    monkeypatch.setenv("HOOPCUT_DONNEES", str(tmp_path))
    paths = local_paths()
    assert paths.root == tmp_path
    assert paths.model == tmp_path / "modeles" / "Qwen3.5-4B-Q4_K_M.gguf"
    assert paths.model in paths.missing()
    assert paths.whisper_model not in paths.missing(with_whisper=False)
