"""Moteurs et modèles de l'IA locale : emplacements, vérification et installation.

Tout est rangé hors du dossier du projet (le Bureau est souvent synchronisé par OneDrive) :
dans « hoopcut-donnees » du dossier utilisateur, ou dans le dossier indiqué par la variable
d'environnement HOOPCUT_DONNEES.

Installation : python -m hoopcut.engines (c'est ce que lance installer.bat).
"""

from __future__ import annotations

import hashlib
import os
import shutil
import sys
import time
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

WINDOWS = sys.platform == "win32"
EXE = ".exe" if WINDOWS else ""
LLAMA_BUILD = "b11222"
WHISPER_BUILD = "b5130"

Log = Callable[[str], None]


def data_dir() -> Path:
    return Path(os.environ.get("HOOPCUT_DONNEES") or Path.home() / "hoopcut-donnees").expanduser()


@dataclass(frozen=True)
class Download:
    url: str
    path: str  # relatif au dossier de données
    size: int
    sha256: str
    extract_to: str | None = None  # archive zip : dossier où la décompresser
    marker: str | None = None  # fichier dont la présence prouve que l'archive est déjà décompressée


MODELS = [
    Download(
        "https://huggingface.co/unsloth/Qwen3.5-4B-GGUF/resolve/main/Qwen3.5-4B-Q4_K_M.gguf",
        "modeles/Qwen3.5-4B-Q4_K_M.gguf",
        2740937888,
        "00fe7986ff5f6b463e62455821146049db6f9313603938a70800d1fb69ef11a4",
    ),
    Download(
        "https://huggingface.co/unsloth/Qwen3.5-4B-GGUF/resolve/main/mmproj-F16.gguf",
        "modeles/Qwen3.5-4B-mmproj-F16.gguf",
        672423616,
        "cd88edcf8d031894960bb0c9c5b9b7e1fea6ebee02b9f7ce925a00d12891f864",
    ),
    Download(
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin",
        "modeles/ggml-large-v3-turbo-q5_0.bin",
        574041195,
        "394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2",
    ),
]

# Versions Windows précompilées : llama.cpp pour carte NVIDIA (CUDA 12.4), whisper.cpp sur processeur
WINDOWS_ENGINES = [
    Download(
        f"https://github.com/ggml-org/llama.cpp/releases/download/{LLAMA_BUILD}/"
        f"llama-{LLAMA_BUILD}-bin-win-cuda-12.4-x64.zip",
        f"telechargements/llama-{LLAMA_BUILD}-bin-win-cuda-12.4-x64.zip",
        264520761,
        "8adb95a81e5566027aa4aca6e3d49552676ee2e988abe68be60dbdd5dbfbb7c2",
        extract_to="moteurs/llama.cpp",
        marker="llama-server.exe",
    ),
    Download(
        f"https://github.com/ggml-org/llama.cpp/releases/download/{LLAMA_BUILD}/cudart-llama-bin-win-cuda-12.4-x64.zip",
        "telechargements/cudart-llama-bin-win-cuda-12.4-x64.zip",
        391443627,
        "8c79a9b226de4b3cacfd1f83d24f962d0773be79f1e7b75c6af4ded7e32ae1d6",
        extract_to="moteurs/llama.cpp",
        marker="cudart64_12.dll",
    ),
    Download(
        f"https://github.com/ggml-org/whisper.cpp/releases/download/{WHISPER_BUILD}/whisper-blas-bin-x64.zip",
        "telechargements/whisper-blas-bin-x64.zip",
        21360234,
        "55c06d09e8b9b6cfb2b0b47ddedc71803054f0e48be1f41848b3141c06c703a9",
        extract_to="moteurs/whisper.cpp",
        marker="Release/whisper-cli.exe",
    ),
]


@dataclass
class LocalPaths:
    root: Path
    llama_server: Path
    whisper_cli: Path
    model: Path
    mmproj: Path
    whisper_model: Path

    def missing(self, with_whisper: bool = True) -> list[Path]:
        needed = [self.llama_server, self.model, self.mmproj]
        if with_whisper:
            needed += [self.whisper_cli, self.whisper_model]
        return [p for p in needed if not p.is_file()]


def local_paths(root: Path | None = None) -> LocalPaths:
    root = root or data_dir()
    return LocalPaths(
        root=root,
        llama_server=_engine(root / "moteurs" / "llama.cpp" / f"llama-server{EXE}", "llama-server"),
        whisper_cli=_engine(root / "moteurs" / "whisper.cpp" / "Release" / f"whisper-cli{EXE}", "whisper-cli"),
        model=root / MODELS[0].path,
        mmproj=root / MODELS[1].path,
        whisper_model=root / MODELS[2].path,
    )


def _engine(bundled: Path, name: str) -> Path:
    """Le moteur installé par hoopcut, sinon celui du système (Mac, Linux : brew, apt…)."""
    if bundled.is_file():
        return bundled
    found = shutil.which(name)
    return Path(found) if found else bundled


def install(root: Path | None = None, log: Log = print) -> None:
    root = root or data_dir()
    log(f"Dossier des moteurs et modèles : {root}")
    items = MODELS + (WINDOWS_ENGINES if WINDOWS else [])
    for item in items:
        target = root / item.path
        name = Path(item.path).name
        if item.extract_to and (root / item.extract_to / (item.marker or "")).is_file():
            log(f"  déjà installé : {name}")
            continue
        if target.is_file() and target.stat().st_size == item.size:
            log(f"  déjà téléchargé : {name}")
        else:
            _download(item, target, log)
        if item.extract_to:
            log(f"  décompression de {name}…")
            with zipfile.ZipFile(target) as archive:
                archive.extractall(root / item.extract_to)
            target.unlink()  # l'archive ne sert plus
    if not WINDOWS:
        log("Sur Mac ou Linux, installe aussi llama.cpp et whisper.cpp (ex. « brew install llama.cpp whisper-cpp »).")
    log("Installation terminée.")


def _download(item: Download, target: Path, log: Log) -> None:
    """Téléchargement avec reprise (fichier .part) et contrôle de l'empreinte SHA-256."""
    target.parent.mkdir(parents=True, exist_ok=True)
    part = target.with_name(target.name + ".part")
    done = part.stat().st_size if part.exists() else 0
    if done > item.size:
        part.unlink()
        done = 0
    log(f"  téléchargement de {target.name} ({item.size / 1e6:,.0f} Mo)…".replace(",", " "))
    for attempt in range(5):
        try:
            request = urllib.request.Request(item.url, headers={"User-Agent": "hoopcut"})
            if done:
                request.add_header("Range", f"bytes={done}-")
            with urllib.request.urlopen(request, timeout=60) as response, part.open("ab" if done else "wb") as out:
                if done and response.status != 206:  # le serveur ne reprend pas : on recommence
                    out.truncate(0)
                    done = 0
                shown = -1
                while chunk := response.read(1 << 20):
                    out.write(chunk)
                    done += len(chunk)
                    percent = int(100 * done / item.size)
                    if percent // 10 != shown:
                        shown = percent // 10
                        log(f"    {percent} %")
            break
        except OSError as exc:
            if attempt == 4:
                raise RuntimeError(f"Téléchargement de {target.name} impossible : {exc}") from exc
            log(f"    coupure ({exc}), reprise dans 5 s…")
            time.sleep(5)
    if sha256_of(part) != item.sha256:
        part.unlink()
        raise RuntimeError(f"Le fichier {target.name} est corrompu (empreinte incorrecte). Relance l'installation.")
    part.replace(target)


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        while chunk := f.read(1 << 22):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    try:
        install()
    except (RuntimeError, OSError) as exc:
        print(f"\nErreur : {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
