"""Récupération de la vidéo source : lien YouTube (via yt-dlp) ou fichier local."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from .ffmpeg_utils import MediaInfo, probe
from .text_utils import slugify

URL = re.compile(r"^https?://", re.I)
# H.264 jusqu'en 1080p de préférence (décodage rapide partout), sinon le meilleur disponible
FORMAT = "bv*[height<=1080][vcodec^=avc1]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]/b"


class DownloadError(RuntimeError):
    pass


@dataclass
class Source:
    path: Path  # fichier vidéo à monter
    work_dir: Path  # dossier de travail propre à cette vidéo (analyse, clips…)
    slug: str
    title: str
    uploader: str | None
    url: str | None
    info: MediaInfo
    description: str | None = None  # description YouTube : noms des joueurs bien écrits, crédits musique…


def fetch(source: str, work_root: Path, *, cookies_browser: str | None = None, log: Callable = print,
          progress: Callable[[float], None] | None = None) -> Source:
    """`progress` reçoit la part téléchargée (0 à 1) de chaque fichier (image, puis son)."""
    if URL.match(source):
        return _download(source, work_root, cookies_browser, log, progress)
    path = Path(source).expanduser()
    if not path.is_file():
        raise FileNotFoundError(f"Fichier introuvable : {path}")
    digest = hashlib.sha1(str(path.resolve()).encode()).hexdigest()[:8]
    work_dir = work_root / f"{slugify(path.stem, 40)}-{digest}"
    work_dir.mkdir(parents=True, exist_ok=True)
    return Source(
        path=path,
        work_dir=work_dir,
        slug=slugify(path.stem),
        title=path.stem,
        uploader=None,
        url=None,
        info=probe(path),
    )


def _download(url: str, work_root: Path, cookies_browser: str | None, log: Callable,
              progress: Callable[[float], None] | None = None) -> Source:
    import yt_dlp

    options = {"quiet": True, "no_warnings": True, "noplaylist": True}
    if cookies_browser:
        options["cookiesfrombrowser"] = (cookies_browser,)
    if progress:
        def hook(status: dict) -> None:
            total = status.get("total_bytes") or status.get("total_bytes_estimate")
            if status.get("status") == "downloading" and total:
                progress(min(1.0, (status.get("downloaded_bytes") or 0) / total))

        options["progress_hooks"] = [hook]
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            meta = ydl.extract_info(url, download=False)
        video_id = meta.get("id") or hashlib.sha1(url.encode()).hexdigest()[:11]
        work_dir = work_root / slugify(video_id, 40)
        work_dir.mkdir(parents=True, exist_ok=True)
        path = _existing_source(work_dir)
        if path is None:
            log(f"      Téléchargement de « {meta.get('title', url)} »…")
            download_options = {
                **options,
                "format": FORMAT,
                "merge_output_format": "mp4",
                "outtmpl": str(work_dir / "source.%(ext)s"),
            }
            with yt_dlp.YoutubeDL(download_options) as ydl:
                ydl.download([url])
            path = _existing_source(work_dir)
    except yt_dlp.utils.DownloadError as exc:
        raise DownloadError(_explain(str(exc))) from exc
    if path is None:
        raise DownloadError("Le téléchargement n'a produit aucun fichier vidéo.")

    title = meta.get("title") or video_id
    uploader = meta.get("uploader") or meta.get("channel")
    page = meta.get("webpage_url") or url
    description = (meta.get("description") or "").strip() or None
    (work_dir / "source.json").write_text(
        json.dumps({"id": video_id, "title": title, "uploader": uploader, "url": page, "description": description},
                   ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return Source(path=path, work_dir=work_dir, slug=slugify(title), title=title, uploader=uploader, url=page,
                  info=probe(path), description=description)


def _existing_source(work_dir: Path) -> Path | None:
    files = [
        p for p in work_dir.glob("source.*")
        if p.suffix.lower() in {".mp4", ".mkv", ".webm", ".mov"} and p.stat().st_size > 0
    ]
    return max(files, key=lambda p: p.stat().st_size) if files else None


def _explain(message: str) -> str:
    lower = message.lower()
    if "not made this video available in your country" in lower or "geo" in lower:
        hint = "La vidéo n'est pas disponible dans ton pays."
    elif "sign in to confirm" in lower or "cookies" in lower:
        hint = ("YouTube demande une connexion : relance avec --cookies-navigateur chrome "
                "(ou firefox, edge…) en étant connecté à YouTube dans ce navigateur.")
    elif "private" in lower:
        hint = "La vidéo est privée."
    else:
        hint = "Essaie de mettre à jour yt-dlp : pip install -U yt-dlp"
    return f"Téléchargement impossible. {hint}\nDétail : {message.strip()}"
