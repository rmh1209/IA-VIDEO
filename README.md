# Fonte

Coach de musculation : programme sur mesure, coach IA, nutrition, mobilité, démos animées des exercices,
carnet de séances (paliers, stades, repères de force), appli installable et serveur (coach Claude, paiement Stripe).

## Arborescence

- `src/` : Fonte (programme, coach, nutrition, mobilité) — `brain.js` (cerveau du coach), `data.js` (exercices),
  `anim-*.js` (démos animées), `progress.js` (paliers, stades, force), `app.js`, `head.html` (styles et structure).
- `suivi/` : le Carnet (Fonte Suivi) — `app.js`, `paliers.js`, `import.js` (import Strong et Hevy), `partage.js` (carte de séance), `head.html`.
- `pwa/` : appli installable (`pwa.js` : runtime, coach par le serveur, achats ; `sw.js` ; manifeste ; icônes).
- `server/` : serveur Cloudflare Workers (coach via l'API Claude, paiement Stripe, jetons d'accès). Voir `server/LISEZ-MOI.md`.
- `test/` : tests (Playwright, faux Claude et faux Stripe, moteur workerd via wrangler dev, audit d'accessibilité axe-core).
- `docs/` : conformité (RGPD, consommation, IA, accessibilité) et analyse des applis concurrentes.

## Construire

```
python3 build-pwa.py        # fonte.html, suivi.html (artefacts claude.ai), dist/fonte-appli, server/public, dist/fonte-en-ligne
```

## Tester

```
cd server && npm install && cd ../test && npm install && cd ..
python3 build-pwa.py           # rebâtit les deux applis, le site installable et le serveur
node test/tout.mjs             # toute la batterie (environ 2 minutes), résumé à la fin
node test/tout.mjs a11y pwa    # seulement les suites dont le nom commence ainsi
```

Playwright est attendu dans `/opt/node-tools/node_modules/playwright` (Chromium préinstallé).
