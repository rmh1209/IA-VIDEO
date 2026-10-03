#!/bin/sh
set -e
cd "$(dirname "$0")"
{ cat src/head.html; printf '\n<script>\n'; cat src/brain.js src/data.js src/anim-sc1.js src/anim-sc2.js src/anim-sc3.js src/anim-core.js src/progress.js src/app.js; printf '</script>\n'; } > fonte.html
# copie de test avec un squelette complet (le service d'artefacts ajoute le sien à la publication)
{ printf '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body>'; cat fonte.html; printf '</body></html>'; } > test/page.html
