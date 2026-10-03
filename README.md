# Fonte

Coach de musculation : programme sur mesure, coach IA, nutrition, mobilité, démos animées des exercices,
carnet de séances (paliers, stades, repères de force), appli installable et serveur (coach Claude, paiement Stripe).

## Arborescence

- `src/` : Fonte (programme, coach, nutrition, mobilité) — `brain.js` (cerveau du coach), `data.js` (exercices),
  `anim-*.js` (démos animées), `progress.js` (paliers, stades, force), `app.js`, `head.html` (styles et structure).
- `suivi/` : le Carnet (Fonte Suivi) — `paliers.js`, `app.js`, `head.html`.
- `pwa/` : appli installable (`pwa.js` : runtime, coach par le serveur, achats ; `sw.js` ; manifeste ; icônes).
- `server/` : serveur Cloudflare Workers (coach via l'API Claude, paiement Stripe, jetons d'accès). Voir `server/LISEZ-MOI.md`.
- `test/` : tests (Playwright, faux Claude et faux Stripe, moteur workerd via wrangler dev).

## Construire

```
python3 build-pwa.py        # fonte.html, suivi.html (artefacts claude.ai), dist/fonte-appli, server/public, dist/fonte-en-ligne
```

## Tester

```
cd server && npm install && cd ../test && npm install && cd ..
node test/progress-unit.js && node test/run.js && node test/suivi-run.js && node test/e2e.js
node test/demo-run.js && node test/paliers-run.js && node test/stades-run.js && node test/pwa-run.js
node test/serveur-api.mjs && node test/serveur-appli.mjs && node test/produits-stripe.mjs
```

Playwright est attendu dans `/opt/node-tools/node_modules/playwright` (Chromium préinstallé).
