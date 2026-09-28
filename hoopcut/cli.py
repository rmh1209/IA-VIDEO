"""Ligne de commande : hoopcut <lien YouTube ou fichier> [options]."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from .analyze import DEFAULT_MODEL, AnalysisError, GeminiSettings
from .analyze_local import LocalSettings
from .engines import data_dir
from .fetch import DownloadError
from .ffmpeg_utils import FFmpegError
from .pipeline import JobSettings, run_job
from .render import TRANSITIONS, RenderSettings, pick_music
from .select import SelectionSettings

DEFAULT_MUSIC_DIR = Path("musique")
EXAMPLES = """\
exemples :
  hoopcut "https://youtu.be/oJd_NbZx9VA"
  hoopcut "https://youtu.be/oJd_NbZx9VA" --focus-joueur "Parker"
  hoopcut "https://youtu.be/oJd_NbZx9VA" --focus-equipe "ASVEL" --titre "L'ASVEL EN FEU"
  hoopcut "https://youtu.be/ORfjgE6n2Pc" --musique musique/beat.mp3 --ordre crescendo
  hoopcut "https://youtu.be/oJd_NbZx9VA" --ia gemini   (IA en ligne de Google, clé nécessaire)
  hoopcut ma_video.mp4 --sans-ia            (essai rapide du montage, sans IA)
"""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="hoopcut",
        description="Crée un short vertical (60 à 80 s) avec les meilleurs moments "
        "d'une vidéo de basket : résumé de match ou compilation.",
        epilog=EXAMPLES,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("sources", nargs="+", help="lien YouTube ou fichier vidéo (plusieurs possibles)")

    content = parser.add_argument_group("contenu")
    content.add_argument("--focus-equipe", action="append", default=[], metavar="NOM",
                         help="ne garder que les actions de cette équipe")
    content.add_argument("--focus-joueur", action="append", default=[], metavar="NOM",
                         help="ne garder que les actions de ce joueur (le nom de famille suffit)")
    content.add_argument("--titre", help="titre affiché en haut (par défaut : proposé par l'IA)")
    content.add_argument("--ordre", choices=["auto", "chrono", "crescendo", "accroche"], default="auto",
                         help="auto = chronologique pour un match, du moins fort au plus fort pour une compilation ; "
                         "accroche = la plus belle action d'abord")
    content.add_argument("--duree-min", type=float, default=60.0, metavar="S", help="durée minimale (défaut 60)")
    content.add_argument("--duree-max", type=float, default=80.0, metavar="S", help="durée maximale (défaut 80)")
    content.add_argument("--duree-cible", type=float, default=70.0, metavar="S", help="durée visée (défaut 70)")

    style = parser.add_argument_group("habillage")
    style.add_argument("--musique", type=Path, metavar="FICHIER_OU_DOSSIER",
                       help=f"musique à mixer (défaut : un morceau au hasard du dossier « {DEFAULT_MUSIC_DIR} »)")
    style.add_argument("--sans-musique", action="store_true", help="ne pas ajouter de musique")
    style.add_argument("--volume-musique", type=float, default=0.35, metavar="V", help="0 à 1 (défaut 0.35)")
    style.add_argument("--volume-original", type=float, default=1.0, metavar="V",
                       help="son du match, 0 à 1 (défaut 1 ; 0 = musique seule)")
    style.add_argument("--transition", choices=list(TRANSITIONS), default="fondu")
    style.add_argument("--fond", choices=["flou", "noir"], default="flou", help="fond derrière la vidéo")
    style.add_argument("--zoom", type=float, default=1.0,
                       help="agrandit la vidéo en rognant les côtés (ex. 1.3) ; 1 = image entière")
    style.add_argument("--couleur", default="#FF7A00", help="couleur d'accent (défaut orange #FF7A00)")
    style.add_argument("--sans-score", action="store_true", help="ne pas afficher le score")

    ai = parser.add_argument_group("IA")
    ai.add_argument("--ia", choices=["locale", "gemini"], default="locale",
                    help="locale = sur ce PC, gratuite, sans clé (défaut) ; gemini = en ligne chez Google, "
                    "plus précise et plus rapide, clé nécessaire")
    ai.add_argument("--ips", type=float, metavar="N",
                    help="images par seconde regardées par l'IA. IA locale : 1 par défaut, 2 = plus précis mais "
                    "deux fois plus long. Gemini : 2 si la vidéo dure moins de 12 min")
    ai.add_argument("--sans-commentaires", action="store_true",
                    help="IA locale : ne pas transcrire les commentaires (plus rapide, mais noms de joueurs perdus)")
    ai.add_argument("--modele", default=DEFAULT_MODEL, help=f"Gemini : modèle (défaut {DEFAULT_MODEL})")
    ai.add_argument("--resolution", choices=["low", "medium", "high"], default="medium",
                    help="Gemini : finesse de l'image analysée (low = moins cher, high = lit mieux le score)")
    ai.add_argument("--mode-video", choices=["statique", "agentique"], default="statique",
                    help="Gemini : statique = l'IA regarde tout ; agentique = elle navigue et zoome d'elle-même")
    ai.add_argument("--reanalyser", action="store_true", help="refaire l'analyse même si elle existe déjà")
    ai.add_argument("--sans-ia", action="store_true",
                    help="essai rapide : moments repérés au volume sonore, sans comprendre le jeu")
    ai.add_argument("--analyse-seulement", action="store_true", help="analyser sans monter la vidéo")

    misc = parser.add_argument_group("divers")
    misc.add_argument("--cookies-navigateur", metavar="NAVIGATEUR",
                      choices=["chrome", "firefox", "edge", "safari", "brave", "opera", "chromium", "vivaldi"],
                      help="utiliser la connexion YouTube de ce navigateur si YouTube bloque le téléchargement")
    misc.add_argument("--dossier-travail", type=Path, default=data_dir() / "travail",
                      help="vidéos téléchargées et analyses (défaut : %(default)s, hors OneDrive)")
    misc.add_argument("--dossier-sortie", type=Path, default=Path("sorties"))
    misc.add_argument("--sans-apprentissage", action="store_true",
                      help="ne pas tenir compte des avis donnés dans l'aperçu (hoopcut.bat sans lien)")
    return parser


def job_from_args(args: argparse.Namespace) -> JobSettings:
    transition = TRANSITIONS[args.transition]
    music = None if args.sans_musique else pick_music(args.musique or DEFAULT_MUSIC_DIR)
    if args.musique and not args.sans_musique and music is None:
        raise FileNotFoundError(f"Musique introuvable : {args.musique}")
    min_total, max_total = sorted((args.duree_min, args.duree_max))
    return JobSettings(
        work_root=args.dossier_travail,
        out_root=args.dossier_sortie,
        use_ai=not args.sans_ia,
        ai=args.ia,
        reanalyze=args.reanalyser,
        analyze_only=args.analyse_seulement,
        cookies_browser=args.cookies_navigateur,
        title=args.titre,
        show_score=not args.sans_score,
        local=LocalSettings(fps=args.ips or LocalSettings.fps, commentary=not args.sans_commentaires),
        gemini=GeminiSettings(
            model=args.modele,
            fps=args.ips,
            resolution=args.resolution,
            processing="agentic" if args.mode_video == "agentique" else "static",
        ),
        selection=SelectionSettings(
            min_total=min_total,
            max_total=max_total,
            target=min(max(args.duree_cible, min_total), max_total),
            transition=0.0 if transition == "none" else 0.3,
            order=args.ordre,
            focus_teams=_split(args.focus_equipe),
            focus_players=_split(args.focus_joueur),
        ),
        render=RenderSettings(
            zoom=max(1.0, args.zoom),
            background=args.fond,
            transition=transition,
            music=music,
            music_volume=args.volume_musique,
            original_volume=args.volume_original,
            accent=args.couleur,
        ),
        avis_dir=None if args.sans_apprentissage else data_dir() / "avis",
    )


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):  # accents corrects dans le terminal Windows
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    load_dotenv(Path.cwd() / ".env")
    args = build_parser().parse_args(argv)
    try:
        job = job_from_args(args)
    except FileNotFoundError as exc:
        print(f"Erreur : {exc}", file=sys.stderr)
        return 1
    if job.render.music:
        print(f"Musique : {job.render.music.name}")

    status = 0
    for source in args.sources:
        print(f"\n=== {source} ===")
        try:
            out = run_job(source, job)
        except (AnalysisError, DownloadError, FFmpegError, FileNotFoundError) as exc:
            print(f"\nErreur : {exc}", file=sys.stderr)
            status = 1
            continue
        except KeyboardInterrupt:
            print("\nInterrompu.", file=sys.stderr)
            return 130
        if out:
            print(f"\nTerminé : {out}\nTexte pour la publication : {out.with_suffix('.txt')}")
    return status


def load_dotenv(path: Path) -> None:
    """Charge les lignes CLÉ=valeur d'un fichier .env (sans écraser l'environnement)."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def _split(values: list[str]) -> list[str]:
    return [part.strip() for value in values for part in value.split(",") if part.strip()]
