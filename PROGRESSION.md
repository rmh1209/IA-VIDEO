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

### 4. Deuxième vague
- [x] Import de l'historique Strong et Hevy (CSV) : exercices reconnus en anglais ou en français, kilos ou livres, sans doublon, records recalculés
- [x] Varier les exercices accessoires à chaque nouveau cycle (rotation déterministe, mêmes résultats dans Fonte et le carnet, exercices principaux gardés)
- [x] Carte de séance à partager (image 1080 × 1350 générée sur le téléphone, partage natif ou enregistrement), depuis la fin de séance et l'historique
- [x] Page de présentation decouvrir.html (arguments tirés de l'étude, prix, questions fréquentes, données structurées pour les moteurs de recherche)

### 5. Troisième vague
- [x] Bilan du mois automatique dans Progrès (séances et volume comparés au mois précédent, points gagnés, plus forte progression, records, navigation par mois)
- [x] Mensurations : tour de taille noté avec la pesée ; en sèche, une taille qui baisse alors que la balance stagne bloque la baisse de calories (perte de gras, muscle gardé)
- [x] Accessibilité : audit axe-core (WCAG 2.2 AA) de 24 écrans en clair et en sombre ; contrastes corrigés (vert, rouge en mode sombre, jours de récupération), titres hiérarchisés, tableaux défilants atteignables au clavier, focus gardé dans les fenêtres, graphiques et minuteur annoncés aux lecteurs d'écran ; point accessibilité ajouté à la conformité (directive 2019/882, exemption des microentreprises)
- [x] Rappels de séance par notification (Web Push) : évalué, reporté. Sur iPhone, les notifications n'arrivent qu'aux applis installées sur l'écran d'accueil ; il faudrait garder sur le serveur l'abonnement aux notifications et l'horaire des séances (données personnelles, accord, politique de confidentialité à revoir), plus des clés VAPID et une tâche planifiée Cloudflare. Les rappels passent déjà par l'agenda du téléphone (fichier .ics, rappel 30 min avant) sans qu'aucune donnée ne quitte le téléphone, et le minuteur de repos sonne, vibre et garde l'écran allumé. À reprendre si les utilisateurs le demandent.
- [x] Version anglaise : évaluée, reportée. Près de 2 000 textes à traduire et à maintenir (interface, 95 exercices et leurs consignes, cerveau du coach, documents juridiques à adapter), pour un lancement pensé pour la France. Le coach comprend déjà les questions posées en anglais.
- [x] Sauvegarde (séances perdues : frustration n° 5 des avis) : dans l'appli installée, rappel de sauvegarde après 5 séances puis tous les 30 jours (report de 14 jours possible), date de la dernière sauvegarde dans Offre > Tes données, stockage protégé demandé au navigateur après la première séance enregistrée, conseil d'installation sur iPhone (Safari efface les données d'un site non installé après 7 jours sans visite)

### 6. Livraison
- [ ] Rebâtir les paquets, republier les artefacts claude.ai concernés, rapport

## Journal

- 2026-10-03 : projet versionné sur la branche `claude/fonte-app` (dépôt IA-VIDEO, branche dédiée sans lien avec hoopcut).
- 2026-10-03 (soir) : conformité RGPD et droit de la consommation dans l'appli et le serveur ; tous les tests au vert (dont 31 vérifications de bout en bout).
- 2026-10-03 (nuit) : vérifications juridiques (résiliation, RLL, article 50, santé, Anthropic, hébergeur), preuve d'accord, guide mis à jour. Prochaine étape : étude des avis clients des concurrents.
- 2026-10-03 (nuit) : étude des avis clients (docs/analyse-concurrence.md) ; améliorations retenues listées ci-dessus.
- 2026-10-04 : agenda .ics, suivi du poids et calories adaptatives, cerveau du coach mis à jour ; 212 vérifications au vert. Reste : supersets, republier les artefacts, livrer.
- 2026-10-04 : supersets dans le carnet ; cerveau du coach mis à jour.
- 2026-10-04 : import Strong / Hevy ; test du carnet rendu robuste (attentes sur l'état au lieu de délais fixes).
- 2026-10-04 : exercices accessoires renouvelés à chaque cycle ; le Programme suit le carnet même au niveau confirmé.
- 2026-10-04 : carte de séance à partager.
- 2026-10-04 : page de présentation ; deuxième vague terminée.
- 2026-10-04 : bilan du mois ; en-tête du carnet corrigé sur les petits écrans (débordement avec Premium et un palier long).
- 2026-10-04 : tour de taille dans le suivi du poids, champs avec intitulés visibles ; batterie complète `node test/tout.mjs` : 244 vérifications au vert.
- 2026-10-04 : accessibilité (audit axe-core, 52 vérifications) ; batterie complète : 296 vérifications au vert.
- 2026-10-04 : notifications et version anglaise évaluées (reportées, raisons ci-dessus) ; sauvegarde des séances (rappel, stockage protégé). Troisième vague terminée.
