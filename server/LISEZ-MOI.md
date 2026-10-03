# Fonte en ligne : l'appli avec le coach IA et le paiement

Ce dossier met en ligne l'appli installable **avec son serveur** : le coach IA (Claude) répond pour de vrai, le déblocage à 19 € et l'abonnement Premium passent par Stripe. Le tout tourne sur **Cloudflare Workers**, à une seule adresse.

## Comment ça marche

- **Une seule adresse.** Le serveur sert l'appli (Programme et Carnet, installables sur téléphone) et répond à ses appels sur `/api/…`. Ta clé Claude et ta clé Stripe restent sur le serveur, jamais dans l'appli.
- **Le coach.** 3 questions offertes par téléphone, puis coach illimité une fois le programme débloqué. L'analyse des progrès dans le Carnet est réservée aux abonnés Premium. Quand le coach modifie le programme (remplacer un exercice, ajuster un dosage…), c'est fait directement dans l'appli, avec un bouton Annuler.
- **Le paiement.** La personne paie sur la page sécurisée de Stripe. Au retour, le serveur vérifie le paiement auprès de Stripe et remet à l'appli un **jeton d'accès signé**, rangé sur le téléphone. Pas de compte, pas de mot de passe, pas de base de données.
- **Changer de téléphone.** Dans l'onglet Offre, rubrique « Tes achats », la personne copie son **code d'accès** (ou se l'envoie par e-mail) et le colle sur son nouveau téléphone. Même geste sur iPhone pour qui paie dans Safari puis installe l'appli sur l'écran d'accueil : iOS sépare les deux.
- **Premium.** 4,99 € par mois, ou 2,49 € avec le programme débloqué (le serveur applique le prix réduit tout seul). Changer de carte, voir ses factures, résilier : bouton « Gérer mon abonnement », qui ouvre le portail client de Stripe.

## Ce qu'il te faut

| | Pour quoi | Où |
|---|---|---|
| **Node.js 20 ou plus** | lancer les commandes ci-dessous sur ton ordinateur | nodejs.org (version LTS) |
| **Compte Cloudflare** | héberger l'appli et le serveur | dash.cloudflare.com |
| **Compte Anthropic** | la clé API du coach (payée à l'usage) | console.anthropic.com |
| **Compte Stripe** | encaisser | dashboard.stripe.com |

Prends l'**offre Workers Paid** de Cloudflare (5 $ par mois) : le coach lit les réponses de Claude au fil de l'eau, ce qui dépasse vite la limite de calcul par requête de l'offre gratuite.

## Mise en ligne, étape par étape

Ouvre un terminal dans ce dossier (`fonte-en-ligne`), puis :

**1. Installer les outils**

```
npm install
```

**2. Te connecter à Cloudflare** (une page s'ouvre dans ton navigateur)

```
npx wrangler login
```

**3. Créer l'espace des compteurs** (questions offertes, plafonds anti-abus). La commande inscrit elle-même l'identifiant dans `wrangler.jsonc`.

```
npx wrangler kv namespace create QUOTAS --binding QUOTAS --update-config
```

**4. Créer les produits Stripe** (commence en mode test). Ta clé secrète est dans Stripe : Développeurs > Clés API (elle commence par `sk_test_`). Le script crée le programme à 19 €, Premium à 4,99 € et 2,49 € par mois, le portail client, et remplit `wrangler.jsonc`.

- macOS ou Linux : `STRIPE_SECRET_KEY=sk_test_... npm run produits-stripe`
- Windows (PowerShell) : `$env:STRIPE_SECRET_KEY="sk_test_..."; npm run produits-stripe`

**5. Mettre en ligne**

```
npx wrangler deploy
```

Wrangler affiche l'adresse de ton appli, du type `https://fonte.ton-nom.workers.dev`.

**6. Donner les trois secrets au serveur** (chaque commande te demande de coller la valeur)

```
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put ACCESS_SECRET
```

- `ANTHROPIC_API_KEY` : ta clé Claude (console Anthropic > API Keys, elle commence par `sk-ant-`).
- `STRIPE_SECRET_KEY` : la même clé `sk_test_` qu'à l'étape 4.
- `ACCESS_SECRET` : une longue suite de caractères au hasard, qui signe les jetons d'accès. Pour en fabriquer une : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**7. Vérifier.** Ouvre `https://ton-adresse/api/config` : tu dois lire `"coach":true` et `"paiement":true`. Puis, sur ton téléphone : crée un programme, pose une question au coach, et débloque avec la carte de test Stripe `4242 4242 4242 4242` (date future et code au choix).

## Passer aux vrais paiements

1. Active ton compte dans Stripe (identité, coordonnées bancaires).
2. Recrée les produits avec ta clé réelle : `STRIPE_SECRET_KEY=sk_live_... npm run produits-stripe`
3. Remplace la clé côté serveur : `npx wrangler secret put STRIPE_SECRET_KEY` (colle `sk_live_...`).
4. **Change `ACCESS_SECRET`** (`npx wrangler secret put ACCESS_SECRET` avec une nouvelle valeur) : les achats faits pendant tes essais ne débloqueront pas la vraie appli.
5. `npx wrangler deploy`

## Ton nom de domaine (facultatif)

Dans le tableau de bord Cloudflare, ouvre le Worker « fonte », puis Paramètres > Domaines et routes, et ajoute un domaine personnalisé (par exemple `appli.fonte.fr`). Les liens de paiement suivent la nouvelle adresse tout seuls.

## Combien ça coûte

- **Cloudflare** : 5 $ par mois (offre Workers Paid ; requêtes et compteurs largement inclus).
- **Claude (coach)** : modèle Claude Opus 5.5, payé à l'usage. Le « cerveau » du coach est mis en cache, ce qui divise son coût par vingt d'une question à l'autre. Compte **environ 3 à 6 centimes par question**, un peu plus quand le coach modifie le programme (plusieurs allers-retours). Les 3 questions offertes coûtent donc de l'ordre de 10 à 20 centimes par visiteur qui les utilise. Fixe une **limite de dépense mensuelle** dans les réglages de facturation de la console Anthropic.
- **Stripe** : une commission par paiement (de l'ordre de 1,5 % + 0,25 € pour une carte européenne ; voir la grille de Stripe).

## Réglages

Dans `wrangler.jsonc`, rubrique `vars`, tu peux ajouter (valeurs par défaut entre parenthèses) :

- `PLAFOND_GRATUIT_APPAREIL` (25) et `PLAFOND_GRATUIT_IP` (60) : requêtes par jour pour un téléphone ou une connexion sans achat.
- `PLAFOND_PAYANT_JOUR` (300) : requêtes par jour après achat.
- `PLAFOND_ANALYSE_JOUR` (8) : analyses du Carnet par jour pour un abonné.
- `PLAFOND_PAIEMENT_IP` (60) : appels au paiement par jour et par connexion.

Puis `npx wrangler deploy`. Garde 3 questions offertes : c'est le nombre écrit dans l'appli.

## En cas de souci

- **Journaux en direct** : `npx wrangler tail` (ou Cloudflare > Workers > fonte > Journaux).
- **« Le coach IA arrive bientôt »** : `ANTHROPIC_API_KEY` manquante, ou l'espace des compteurs pas créé (étape 3).
- **« Paiement en ligne bientôt disponible »** : prix Stripe vides dans `wrangler.jsonc` (étape 4 puis `npx wrangler deploy`), `STRIPE_SECRET_KEY` / `ACCESS_SECRET` manquants, ou, avec une clé réelle, informations de l'éditeur incomplètes (voir plus bas). `https://ton-adresse/api/config` indique `"legal": false` dans ce dernier cas.
- **« Gérer mon abonnement » ne s'ouvre pas** : active le portail client dans Stripe (Paramètres > Billing > Portail client).
- **Essayer sur ton ordinateur** : après l'étape 4, copie `.dev.vars.exemple` en `.dev.vars`, remplis-le, puis lance `npm run local` et ouvre http://localhost:8787.

## Avant d'encaisser : les obligations

L'appli contient déjà les pages légales (mentions légales, confidentialité, conditions générales avec le formulaire de rétractation), l'accord explicite avant le coach, la case de renonciation avant le paiement et la résiliation en trois clics. Il te reste à :

1. **Renseigner l'éditeur** dans `wrangler.jsonc`, rubrique `vars` : `EDITEUR_NOM`, `EDITEUR_STATUT`, `EDITEUR_ADRESSE`, `EDITEUR_EMAIL`, `EDITEUR_TELEPHONE`, `EDITEUR_SIRET`, `EDITEUR_TVA` (par exemple « TVA non applicable, art. 293 B du CGI »), `EDITEUR_DIRECTEUR`, et `EDITEUR_RCS` si tu es immatriculé au RCS. Puis `npx wrangler deploy`. Tant que ces champs manquent, les pages légales les affichent en rouge et **le paiement réel reste bloqué** (une clé `sk_live_` ne suffit pas).
2. **Choisir un médiateur de la consommation** (obligatoire pour vendre aux particuliers) et renseigner `MEDIATEUR_NOM` et `MEDIATEUR_SITE`.
3. **Stripe** : active le portail client et son lien de connexion (Paramètres > Billing > Portail client), copie ce lien dans `PORTAIL_CONNEXION` (il permet de résilier sans son téléphone), active l'envoi des reçus et des factures par e-mail.
4. Lis `CONFORMITE.md` : ce que l'appli fait, les points vérifiés, ton registre des traitements prêt à l'emploi et la liste de contrôle complète.

## Support : retrouver un achat

Si quelqu'un a perdu son téléphone sans avoir gardé son code d'accès : retrouve son paiement dans Stripe (par son e-mail), ouvre la session de paiement (identifiant `cs_...`) et envoie-lui le lien `https://ton-adresse/index.html?achat=cs_...` (ou `/carnet.html?achat=cs_...#offre` pour Premium). En l'ouvrant, l'appli vérifie le paiement auprès de Stripe et redonne l'accès.

## Ce que contient ce dossier

- `public/` : l'appli installable (la même que le paquet `fonte-appli`). La page `https://ton-adresse/decouvrir.html` présente Fonte (arguments, prix, questions fréquentes) : c'est elle à mettre dans tes publicités et sur tes réseaux.
- `src/worker.js` : point d'entrée ; sert l'appli et l'API.
- `src/coach.js` : le coach (SDK officiel d'Anthropic, Claude Opus 5.5, réflexion adaptative, cache du cerveau, repli automatique sur un autre modèle Claude si une demande est déclinée).
- `src/api.js` : routes de l'API (coach, paiement, accès, portail).
- `src/tokens.js`, `src/stripe.js`, `src/quota.js` : jetons d'accès signés, appels à Stripe, compteurs.
- `src/brain.js` : le cerveau du coach (généré, ne pas modifier ici).
- `outils/creer-produits-stripe.mjs` : création des produits et prix Stripe.
- `wrangler.jsonc` : la configuration Cloudflare.
