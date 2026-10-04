"""Essai, sans toucher à l'appli : pose le thème néon rouge sur les deux artefacts pour l'explorer.

Lancer depuis la racine après python3 build-pwa.py : python3 essais/neon-rouge/build.py
Sorties : essais/neon-rouge/out/fonte-neon.html et suivi-neon.html (non versionnées).
"""
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Audiowide&family=Chivo:wght@400;500;600;700&display=swap" rel="stylesheet">'
COMMON = (HERE / "theme.css").read_text(encoding="utf-8")

(HERE / "out").mkdir(exist_ok=True)
for src, extra, title, out in [
    ("fonte.html", "programme.css", "Fonte · aperçu néon", "fonte-neon.html"),
    ("suivi.html", "carnet.css", "Fonte Suivi · aperçu néon", "suivi-neon.html"),
]:
    html = (ROOT / src).read_text(encoding="utf-8")
    html = re.sub(r"<title>[^<]*</title>", f"<title>{title}</title>", html, count=1)
    # juste après la feuille de style d'origine, pour la remplacer à priorité égale
    cut = html.index("</style>") + len("</style>")
    css = COMMON + (HERE / extra).read_text(encoding="utf-8")
    html = html[:cut] + "\n" + FONTS + '\n<style id="theme-neon">\n' + css + "</style>" + html[cut:]
    (HERE / "out" / out).write_text(html, encoding="utf-8")
    print("ok", out)
