#!/bin/sh
set -e
cd "$(dirname "$0")"
{ cat suivi/head.html; printf '\n<script>\n'; cat src/brain.js src/data.js src/anim-sc1.js src/anim-sc2.js src/anim-sc3.js src/anim-core.js src/progress.js suivi/paliers.js suivi/app.js; printf '</script>\n'; } > suivi.html
{ printf '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body>'; cat suivi.html; printf '</body></html>'; } > test/suivi-page.html
