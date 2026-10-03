# Fonte : conformité (RGPD, droit de la consommation, IA)

Mise à jour : 3 octobre 2026. Ce document n'est pas un avis juridique : il décrit ce que l'appli fait, les points vérifiés et ce qui reste à la charge de l'éditeur. Fais relire tes documents légaux par un professionnel avant d'encaisser à grande échelle.

## 1. Ce que l'appli fait déjà

| Exigence | Ce qui est en place |
|---|---|
| Mentions légales, confidentialité, conditions générales | Pages `legal/` servies par l'appli, liées en bas de chaque écran et depuis la feuille de paiement. Les informations de l'éditeur se renseignent à un seul endroit (`wrangler.jsonc`, rubrique `vars`, ou `public/legal/editeur.js`) ; ce qui manque s'affiche en rouge. |
| Paiement réel sans mentions légales | Bloqué par le serveur : avec une clé `sk_live_`, le paiement reste fermé tant que les champs obligatoires de l'éditeur ne sont pas remplis. |
| Données de santé (zones sensibles, poids, sexe…) | Rien ne quitte le téléphone sans **accord explicite** (case à cocher, 15 ans et plus) donné avant la première question au coach ou la première analyse. Le serveur refuse toute requête sans cet accord, et garde une **preuve** (identifiant aléatoire de l'appareil, date, version) pendant 6 mois. Accord retirable dans Offre > Tes données. |
| Transparence IA (règlement européen sur l'IA, article 50, applicable depuis le 2 août 2026) | Dès la première interaction, la carte d'accord dit que le coach est une intelligence artificielle (Claude, d'Anthropic) ; rappel permanent sous le coach, avec l'avertissement santé. |
| Minimisation | Pas de compte, pas de base de données : programme, séances, conversations restent sur le téléphone. Le serveur ne garde que des compteurs (appareil : 6 mois ; empreinte d'IP : 2 jours) et la preuve d'accord. Journaux Cloudflare réduits aux erreurs (pas de journal par requête). |
| Traceurs | Aucun cookie, aucune mesure d'audience ; polices et bibliothèque PDF servies par l'appli (plus d'appel à Google Fonts ni à cdnjs) ; politique de sécurité (CSP) qui interdit tout envoi vers un site tiers. Le stockage local est strictement nécessaire : pas de bandeau requis. |
| Droits des personnes | Export complet (fichier JSON), import d'une sauvegarde, suppression de toutes les données du téléphone, retrait de l'accord : Offre > Tes données. Identifiant d'appareil affiché pour les demandes portant sur les compteurs. |
| Droit de rétractation | Avant le paiement, feuille de confirmation avec case à cocher : renonciation expresse pour le programme (contenu numérique, article L221-28 13°) ; demande d'exécution immédiate pour Premium (article L221-25, paiement au prorata en cas de rétractation). L'accord est enregistré chez Stripe (métadonnées) et confirmé sur la facture du programme. Formulaire de rétractation en annexe des conditions générales. |
| Résiliation en trois clics (article L215-1-1, décret n° 2023-417) | Offre > « Résilier mon abonnement » > « Confirmer la résiliation » : effet à la fin du mois payé, confirmation immédiate (date de la demande, date de fin, effets) téléchargeable. Sans compte. Lien facultatif de connexion par e-mail au portail Stripe pour qui n'a plus son téléphone. |
| Médiation de la consommation | Champ obligatoire dans les informations de l'éditeur, affiché dans les conditions générales. |
| Lien vers la plateforme européenne de règlement des litiges | Plus obligatoire : la plateforme a fermé (règlement (UE) 2024/3228, abrogation au 20 juillet 2025). |

## 2. Points vérifiés et sources

- Résiliation en trois clics : accès direct et permanent, sans création de compte, confirmation de la date et des effets ; amende administrative jusqu'à 75 000 €. Sources : [Seban Avocats](https://www.seban-associes.avocat.fr/la-resiliation-des-contrats-conclus-par-voie-electronique-en-trois-clics/), [Deloitte Avocats](https://blog.avocats.deloitte.fr/la-resiliation-en-3-clics-nouvel-outil-au-service-des-consommateurs/).
- Fermeture de la plateforme RLL : [EUR-Lex, règlement (UE) 2024/3228](https://eur-lex.europa.eu/eli/reg/2024/3228/oj/fra), [INC](https://www.inc-conso.fr/content/reglement-en-ligne-des-litiges-de-consommation-leurope-ferme-sa-plateforme-mais-des).
- Article 50 du règlement IA (2 août 2026 ; informer au plus tard à la première interaction) : [Commission européenne, FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act), [McCann FitzGerald](https://www.mccannfitzgerald.com/knowledge/data-privacy-and-cyber-risk/ai-transparency-european-commissions-guidelines-on-article-50-part-1-provider-obligations).
- Données de santé (le poids seul peut en être une ; consentement explicite) : [CNIL, sportifs et données de santé](https://cnil.fr/fr/sportifs-quels-cas-et-conditions-collecte-des-donnees-de-sante), [CNIL, formalités](https://cnil.fr/fr/quelles-formalites-pour-les-traitements-de-donnees-de-sante).
- Anthropic (API) : pas d'entraînement sur les données des clients API ; suppression automatique des entrées et sorties après 7 jours depuis le 14 septembre 2025 (30 jours sur option) ; conservation plus longue en cas de violation des règles d'utilisation. Sources secondaires : [getvoibe](https://www.getvoibe.com/resources/claude-api-data-retention/), [anarlog](https://anarlog.so/blog/anthropic-data-retention-policy). **À vérifier sur privacy.anthropic.com** (inaccessible depuis l'environnement de travail).
- Portail client Stripe avec lien de connexion par e-mail : [documentation Stripe](https://docs.stripe.com/docs/customer-management/activate-no-code-customer-portal).
- Hébergeur : Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, +1 650 319 8930.

## 3. Registre des traitements (modèle rempli)

À conserver par l'éditeur (responsable du traitement). Même une micro-entreprise doit pouvoir le présenter dès lors qu'elle traite des données sensibles.

| Traitement | Finalité | Personnes | Données | Base légale | Destinataires | Durée | Transferts hors UE |
|---|---|---|---|---|---|---|---|
| Coach IA | Répondre aux questions, adapter le programme | Utilisateurs ayant donné leur accord | Question, extrait de conversation, profil d'entraînement, zones sensibles, données nutrition | Consentement explicite (art. 6.1.a, 9.2.a) | Anthropic (sous-traitant), Cloudflare (hébergement) | Non conservé par Fonte ; 7 jours chez Anthropic | États-Unis : clauses contractuelles types (DPA Anthropic) |
| Analyse des progrès | Analyser les séances (Premium) | Abonnés ayant donné leur accord | Résumé des séances, repères de force | Consentement explicite | Idem | Idem | Idem |
| Preuve d'accord | Démontrer le consentement | Utilisateurs du coach | Identifiant aléatoire d'appareil, dates, version | Obligation légale (art. 7.1) | Cloudflare | 6 mois après la dernière question | Cloudflare (DPF / clauses types) |
| Vente et abonnement | Encaisser, fournir l'accès, facturer | Clients | Identité et e-mail (Stripe), identifiants Stripe, statut | Contrat ; obligation comptable | Stripe | 10 ans (pièces comptables) | Stripe (DPF / clauses types) |
| Anti-abus | Limiter l'usage gratuit et les abus | Visiteurs | Identifiant d'appareil, empreinte d'IP, compteurs | Intérêt légitime | Cloudflare | 6 mois / 2 jours | Cloudflare |
| Hébergement | Faire fonctionner et sécuriser le service | Visiteurs | Données de connexion | Intérêt légitime | Cloudflare | Quelques jours | Cloudflare |

Mesures de sécurité : HTTPS, secrets côté serveur, jetons signés (HMAC), CSP stricte, aucune donnée de santé stockée sur le serveur, plafonds anti-abus.

Analyse d'impact (AIPD) : le traitement porte sur des données de santé mais à petite échelle, sans profilage ni décision automatisée, avec consentement et sans conservation par Fonte. Une AIPD n'est probablement pas obligatoire au lancement ; elle le deviendrait si l'appli grandit fortement (traitement « à grande échelle »). Garde ce document comme base.

## 4. À faire par l'éditeur avant d'encaisser

1. **Statut** : immatriculation (micro-entreprise ou autre), SIRET, régime de TVA (mention « TVA non applicable, art. 293 B du CGI » en franchise).
2. **Informations de l'éditeur** dans `wrangler.jsonc` (nom, statut, adresse, e-mail, téléphone, SIRET, TVA, directeur de la publication), puis `npx wrangler deploy`.
3. **Médiateur de la consommation** : adhérer à un médiateur référencé (liste officielle sur economie.gouv.fr, rubrique médiation de la consommation) et renseigner `MEDIATEUR_NOM` et `MEDIATEUR_SITE`.
4. **Stripe** : activer le portail client et son lien de connexion (puis `PORTAIL_CONNEXION`), activer l'envoi des reçus et factures par e-mail, indiquer l'URL des conditions générales dans les paramètres publics.
5. **Anthropic** : vérifier sur privacy.anthropic.com la durée de conservation en vigueur et l'accord de traitement des données (DPA) ; fixer une limite de dépense.
6. **Cloudflare** : l'accord de traitement des données fait partie des conditions du service ; rien à signer de plus pour un compte standard.
7. **Relecture** : faire relire les conditions générales et la politique de confidentialité par un juriste si possible.
8. **Assurance** : une responsabilité civile professionnelle est recommandée pour une activité de conseil sportif.
