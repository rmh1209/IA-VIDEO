#!/usr/bin/env python3
"""Appli installable : réunit Fonte (index.html) et Fonte Suivi (carnet.html) dans un dossier prêt à mettre en ligne."""
import hashlib, os, re, shutil, subprocess, zipfile
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
subprocess.run(["sh", "build.sh"], check=True)
subprocess.run(["sh", "build-suivi.sh"], check=True)
OUT = os.path.join("dist", "fonte-appli")
shutil.rmtree("dist", ignore_errors=True)
os.makedirs(os.path.join(OUT, "icons"))
DESC = "Ton programme de musculation sur mesure, la démo de chaque exercice et ton carnet de séances avec paliers et stades."
def page(title, body):
    return ('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            f'<title>{title}</title><meta name="description" content="{DESC}">'
            '<link rel="manifest" href="manifest.webmanifest">'
            '<meta name="theme-color" content="#EEF0ED" media="(prefers-color-scheme: light)">'
            '<meta name="theme-color" content="#12171E" media="(prefers-color-scheme: dark)">'
            '<link rel="icon" type="image/png" sizes="32x32" href="icons/icon-32.png">'
            '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">'
            '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">'
            '<meta name="apple-mobile-web-app-title" content="Fonte"><meta name="apple-mobile-web-app-status-bar-style" content="default">'
            '<style>[hidden]{display:none!important}</style><script src="pwa.js"></script></head><body>'
            + body + '</body></html>')
# appli installée : polices servies par l'appli (aucune requête vers Google), le reste est identique aux artefacts
GOOGLE_FONTS = re.compile(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\s*<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>\s*<link href="https://fonts\.googleapis\.com/css2\?[^"]+" rel="stylesheet">')
def local_fonts(html):
    out, n = GOOGLE_FONTS.subn('<link rel="stylesheet" href="fonts/fonts.css">', html)
    assert n == 1, "liens Google Fonts introuvables"
    return out
open(os.path.join(OUT, "index.html"), "w").write(page("Fonte", local_fonts(open("fonte.html").read())))
open(os.path.join(OUT, "carnet.html"), "w").write(page("Fonte · Carnet", local_fonts(open("suivi.html").read())))
for d in ["fonts", "vendor", "legal"]:
    shutil.copytree(os.path.join("pwa", d), os.path.join(OUT, d))
for f in ["pwa.js", "manifest.webmanifest"]:
    shutil.copy(os.path.join("pwa", f), OUT)
for f in os.listdir(os.path.join("pwa", "icons")):
    shutil.copy(os.path.join("pwa", "icons", f), os.path.join(OUT, "icons"))
h = hashlib.sha1()
for f in ["index.html", "carnet.html", "pwa.js", "manifest.webmanifest", os.path.join("fonts", "fonts.css")]:
    h.update(open(os.path.join(OUT, f), "rb").read())
open(os.path.join(OUT, "sw.js"), "w").write(open(os.path.join("pwa", "sw.js")).read().replace("__VERSION__", h.hexdigest()[:10]))
# Netlify et la plupart des hébergeurs : en-têtes pour que le service worker soit toujours relu
CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; "
       "connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'")
open(os.path.join(OUT, "_headers"), "w").write(
    "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n"
    f"  Content-Security-Policy: {CSP}\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n"
    "/sw.js\n  Cache-Control: no-cache\n/manifest.webmanifest\n  Content-Type: application/manifest+json\n")
shutil.copy(os.path.join("pwa", "LISEZ-MOI.txt"), "dist")
with zipfile.ZipFile(os.path.join("dist", "fonte-appli.zip"), "w", zipfile.ZIP_DEFLATED) as z:
    z.write(os.path.join("dist", "LISEZ-MOI.txt"), "LISEZ-MOI.txt")
    for base, _, files in os.walk(OUT):
        for f in files:
            full = os.path.join(base, f)
            z.write(full, os.path.relpath(full, "dist"))
# Serveur (Cloudflare Workers) : cerveau du coach et appli à servir, puis le paquet à mettre en ligne
brain = open(os.path.join("src", "brain.js")).read()
assert "const CERVEAU = `" in brain
open(os.path.join("server", "src", "brain.js"), "w").write("/* Généré par build-pwa.py à partir de src/brain.js : ne pas modifier ici. */\n" + brain.replace("const CERVEAU = `", "export const CERVEAU = `", 1))
shutil.rmtree(os.path.join("server", "public"), ignore_errors=True)
shutil.copytree(OUT, os.path.join("server", "public"))
SRV = os.path.join("dist", "fonte-en-ligne")
shutil.copytree("server", SRV, ignore=shutil.ignore_patterns("node_modules", ".wrangler", ".dev.vars"))
with zipfile.ZipFile(os.path.join("dist", "fonte-en-ligne.zip"), "w", zipfile.ZIP_DEFLATED) as z:
    for base, _, files in os.walk(SRV):
        for f in files:
            full = os.path.join(base, f)
            z.write(full, os.path.relpath(full, "dist"))
print("dist ok :", sorted(os.listdir(OUT)), os.path.getsize(os.path.join("dist", "fonte-appli.zip")) // 1024, "Ko ;",
      "serveur :", os.path.getsize(os.path.join("dist", "fonte-en-ligne.zip")) // 1024, "Ko")
