# Fonte : plan de travail continu

Demande (3 octobre 2026) : continuer d'améliorer l'appli, la rendre conforme (RGPD, droit de la consommation),
travailler en continu (reprendre dès que la limite d'utilisation se lève) et l'améliorer face aux applis
concurrentes en s'appuyant sur les avis clients.

## Reprendre après une coupure

1. Si le conteneur est neuf : `cd /home/user/IA-VIDEO && git fetch origin claude/fonte-app && git worktree add /home/user/fonte-app claude/fonte-app`
2. `cd /home/user/fonte-app/server && npm install && cd ../test && npm install`
3. `python3 build-pwa.py`, puis les tests du README.
4. Reprendre la première case non cochée ci-dessous ; cocher, noter au journal, committer, pousser.

## Déjà fait

- Fonte (programme, coach outillé, nutrition, mobilité, PDF), Fonte Suivi (carnet), démos animées (95 exercices),
  paliers / stades / repères de force, appli installable unique (hors connexion, installation).
- Serveur Cloudflare : coach Claude (SDK officiel, diffusion en direct, outils exécutés dans l'appli, cache, repli),
  paiement Stripe (19 €, Premium 4,99 € / 2,49 €), jetons d'accès signés, quotas, portail client, code d'accès.
- 170 vérifications automatiques au vert.

## À faire, par priorité

### 1. Conformité légale et RGPD
- [x] Pages légales (mentions légales, confidentialité, conditions générales avec formulaire de rétractation) ; infos de l'éditeur à un seul endroit (wrangler.jsonc ou legal/editeur.js)
- [x] Consentement explicite avant le coach et l'analyse (données de santé, IA, 15 ans et plus), vérifié par le serveur, retirable
- [x] Aucune requête vers des tiers dans l'appli installée (polices et jsPDF servis par l'appli) + politique de sécurité (CSP) stricte
- [x] Export, import et suppression de toutes les données (portabilité, effacement)
- [x] Bouton « Résilier mon abonnement » (trois clics), effet en fin de mois payé, confirmation téléchargeable
- [x] Transparence IA (règlement européen), avertissement santé ; accord exprès avant paiement (rétractation) gardé dans Stripe et sur la facture
- [x] Journaux serveur minimaux (sans journal de requêtes) ; paiement réel bloqué tant que les mentions légales manquent
- [x] Registre des traitements et liste de contrôle pour l'éditeur (docs/conformite.md, CONFORMITE.md dans le paquet) ; points juridiques vérifiés en ligne ; preuve d'accord gardée 6 mois ; lien de résiliation sans téléphone (portail Stripe)
- [x] Plus de déblocage « démo » dans l'appli installée quand le paiement n'est pas branché

### 2. Étude des avis clients des meilleures applis
- [x] Hevy, Strong, Fitbod, JEFIT, Freeletics, MacroFactor… → `docs/analyse-concurrence.md`

### 3. Améliorations tirées de l'étude
- [x] Minuteur de repos qui alerte (son existant + vibration) et rattrape le temps au retour ; écran allumé (existant)
- [x] Calculateur de disques sur les exercices à la barre (barre de 20, 15 ou 10 kg)
- [x] Séries d'échauffement conseillées sur le premier gros exercice (barre : 40/60/80 % ; haltères : 50/75 %)
- [x] Séances dans l'agenda du téléphone (.ics, rappel 30 min avant)
- [x] Suivi du poids (tendance sur 3 semaines) et ajustement des calories selon l'objectif, 10 jours d'observation entre deux ajustements
- [x] Supersets et séries géantes (liaison, enchaînement sans repos, mémorisés par séance, repère dans l'historique)

### 4. Livraison
- [ ] Rebâtir les paquets, republier les artefacts claude.ai concernés, rapport

## Journal

- 2026-10-03 : projet versionné sur la branche `claude/fonte-app` (dépôt IA-VIDEO, branche dédiée sans lien avec hoopcut).
- 2026-10-03 (soir) : conformité RGPD et droit de la consommation dans l'appli et le serveur ; tous les tests au vert (dont 31 vérifications de bout en bout).
- 2026-10-03 (nuit) : vérifications juridiques (résiliation, RLL, article 50, santé, Anthropic, hébergeur), preuve d'accord, guide mis à jour. Prochaine étape : étude des avis clients des concurrents.
- 2026-10-03 (nuit) : étude des avis clients (docs/analyse-concurrence.md) ; améliorations retenues listées ci-dessus.
- 2026-10-04 : agenda .ics, suivi du poids et calories adaptatives, cerveau du coach mis à jour ; 212 vérifications au vert. Reste : supersets, republier les artefacts, livrer.
- 2026-10-04 : supersets dans le carnet ; cerveau du coach mis à jour.
