# hoopcut — l'IA qui fait tes shorts basket

Tu donnes un lien YouTube (résumé de match ou compilation) et hoopcut produit une **vidéo verticale de 60 à 80 secondes** avec les meilleurs moments :

- une **accroche** : la plus belle action dès la première seconde, puis le récit ;
- la vidéo au centre, agrandie, sur un fond flouté ;
- le **titre** en haut ;
- le **score** et l'**action** en bas (« DUNK · TONY PARKER ») ;
- les **cris des commentateurs** en gros au bon moment (« QUEL DUNK ! », « ON FIRE ! ») ;
- de la **musique** sous le son du match ;
- **aucun ralenti**.

Avant le montage, tu **regardes les clips choisis** : ils passent tout seuls, l'un après l'autre, habillés comme dans le short. Un bouton pour valider, un autre pour dire ce qui ne va pas dans un clip : hoopcut le corrige et **apprend de tes avis**.

Il prépare aussi un fichier texte avec un titre, une description et des hashtags prêts à coller au moment de publier.

**L'IA tourne sur ton PC** : gratuite, sans clé, et rien n'est envoyé sur Internet (à part le téléchargement de la vidéo YouTube). Une option permet d'utiliser à la place Gemini, l'IA en ligne de Google (voir plus bas).

## Comment l'IA choisit les moments

1. **Téléchargement** de la vidéo YouTube.
2. **Repérage des changements de plan** (coupes franches, mais aussi flashs blancs et fondus entre deux actions), pour couper proprement sans montrer le début de l'action suivante.
3. **L'IA vidéo locale (Qwen3.5-4B) regarde toute la vidéo**, par tranches d'environ 30 secondes calées sur les changements de plan :
   - elle reçoit les images dans l'ordre et horodatées, que son encodeur vidéo fusionne deux par deux : elle voit le mouvement, pas des photos isolées ;
   - **Whisper**, une autre IA locale, transcrit les commentaires : noms des joueurs, « à deux mains ! », « contré ! »… ;
   - elle liste chaque action : type (dunk, 3 points, contre, interception…), équipe, joueur (seulement si son nom est prononcé), note de spectacle.
4. **Vérifications** des meilleures actions :
   - l'image du geste décisif est regardée seule : les ralentis, gros plans et images du public sont écartés ;
   - les plans qui entourent l'action sont vérifiés un par un : le clip reste sur les plans de jeu en vue large, sans le public, le banc ou un ralenti juste avant ou après ;
   - pour un résumé de match, le tableau de score est lu avant et après l'action : il dit qui a marqué et combien de points (+3 = tir à 3 points) ;
   - le type d'action annoncé par les commentateurs l'emporte sur celui du modèle. S'il reste un doute sur le type de tir, la vidéo affiche simplement « PANIER » ;
   - la note finale tient compte du type d'action, de l'enthousiasme des commentateurs et du bruit du public.
5. **Sélection** : l'outil calcule la meilleure combinaison de clips pour tenir entre 60 et 80 s, fondus compris. Il évite les doublons et varie les joueurs et les types d'action. Un résumé de match reste dans l'ordre chronologique. Une compilation va du moins fort au plus fort.
6. **Montage** au format 1080×1920 : habillage, fondus, musique, et volume réglé au niveau des réseaux sociaux.
   - **Accroche** : le short s'ouvre sur la fin du clip le plus fort (le geste et la réaction, 2 à 4 s), suivie d'un flash blanc. Parmi les trois meilleurs clips, celui où un commentateur crie est préféré : c'est la preuve la plus sûre d'une grosse action.
   - **Cris des commentateurs** : hoopcut cherche dans les commentaires transcrits des exclamations connues (« quel dunk », « c'est magnifique », « on fire », « throws it down »…) et les affiche en gros, au moment où elles sont dites, sur le haut de l'image (les tribunes) pour ne pas cacher le jeu. Le texte de Whisper n'est jamais affiché tel quel : il écorche trop souvent les noms. Compte deux à trois cris par résumé de match.
   - **Vidéo agrandie** : les côtés de l'image sont rognés (zoom 1,25). Mesuré sur 72 clips, l'action reste toujours dans le cadre.

## Installation (une seule fois, Windows)

1. **Python 3.10 ou plus récent** : https://www.python.org/downloads/.
2. **FFmpeg**, le moteur de montage : ouvre un terminal et tape `winget install Gyan.FFmpeg`.
3. **Une carte graphique NVIDIA** d'au moins 6 Go (GTX 1660 SUPER ou mieux). Sans elle, utilise l'option Gemini.
4. **Le projet** : télécharge-le depuis GitHub (bouton « Code » puis « Download ZIP »), puis décompresse-le, par exemple dans un dossier sur ton Bureau.
5. **Double-clique sur `installer.bat`**. Il prépare Python et télécharge l'IA et ses moteurs (environ 4,5 Go, vérifiés à l'arrivée).

Les gros fichiers (IA, vidéos téléchargées, analyses) vont dans `hoopcut-donnees`, dans ton dossier utilisateur (`C:\Users\<ton nom>\hoopcut-donnees`). Ce dossier est hors du Bureau, pour que OneDrive n'essaie pas de les envoyer en ligne. Seuls les shorts terminés arrivent dans le dossier du projet.

## Utilisation

1. **Double-clique sur `hoopcut.bat`** : une page s'ouvre dans ton navigateur. Laisse la fenêtre noire ouverte, c'est elle qui fait le travail.
2. **Colle le lien YouTube** et clique sur « Créer le short ». Les vidéos déjà analysées sont proposées en dessous : elles s'ouvrent tout de suite.
3. **Regarde l'aperçu** : les clips choisis passent tout seuls, l'un après l'autre, avec le titre, le score et la légende du short.
4. **Clique sur « Valider le short »**. Le montage prend une à deux minutes. Ensuite :
   - « Ouvrir le dossier » montre le short dans `sorties/` ;
   - « Copier le texte » copie le titre, la description et les hashtags à coller au moment de publier.

Le petit crayon ✏️ à côté du titre permet de le changer.

### Un clip n'est pas bon ?

Pendant qu'il passe, clique sur « Ce clip n'est pas bon ». Il repasse en boucle, et tu choisis la raison :

| Raison | Ce que fait hoopcut |
|---|---|
| Il ne se passe rien, action sans intérêt, ralenti/public/banc, autre | Retire le clip et le remplace par une autre action si la durée le demande. |
| Coupé trop tôt | Garde 2 s de plus après l'action. |
| Démarre trop tard | Garde 2 s de plus avant l'action. |
| Trop long | Retire 2 s avant l'action. |
| Mauvaise légende | Tu corriges l'action ou le joueur. Une faute d'orthographe est corrigée partout dans la vidéo. |
| Le texte en gros est faux | Retire le cri de ce clip. Un cri refusé deux fois n'est plus jamais affiché. |

Sur l'accroche (le premier clip), les choix sont : prendre une autre action, ne pas mettre d'accroche du tout, ou retirer le texte en gros.

Tu peux ajouter un mot d'explication. Les retouches d'une vidéo sont gardées : si tu la rouvres, tu retrouves ton short tel que tu l'as laissé.

### hoopcut apprend de tes avis

Chaque avis est noté dans `hoopcut-donnees\avis\avis.jsonl`, avec une petite image du clip (début, action, fin) dans `hoopcut-donnees\avis\images`. Dès le short suivant, hoopcut en tient compte :
- **les marges** : si tu dis souvent « coupé trop tôt » ou « démarre trop tard », tous les clips gardent plus de jeu autour de l'action ;
- **les types d'action** : un type que tu juges souvent « sans intérêt » (les lancers francs, par exemple) est évité ;
- **les noms** : un nom mal écrit que tu as corrigé est corrigé dans les vidéos suivantes, quand le bon nom figure dans leur titre ou leur description.

La page d'accueil résume ce qui a été appris. L'IA elle-même n'est pas réentraînée : ce serait trop lourd pour un PC. Ton journal d'avis sert aussi à améliorer ses consignes, là où elle se trompe le plus.

### Sans aperçu

`hoopcut.bat "https://youtu.be/…"` (lien donné directement, ou vidéo glissée sur `hoopcut.bat`) fait tout d'un coup, sans aperçu. Il respecte les retouches déjà faites dans l'aperçu et ce qui a été appris. Le short arrive dans `sorties/`, avec son fichier `.txt` pour la publication.

### Combien de temps ça prend

Sur une GTX 1660 SUPER, compte **à peu près la durée de la vidéo, voire une fois et demie**. Deux exemples mesurés, montage compris :
- le résumé ASVEL-Maccabi de 15 min 30 : 16 min ;
- la compilation de dunks de 10 min, très découpée : 15 min.

La page affiche l'avancement et le temps restant, et l'onglet du navigateur aussi : tu peux faire autre chose en attendant. Pour une analyse plus fine mais deux fois plus longue, ajoute `--ips 2`.

- L'analyse est gardée : refaire un short de la même vidéo (autre focus, autre musique, autre ordre) ne prend qu'une à deux minutes.
- Si tu fermes la fenêtre noire pendant l'analyse, relance simplement : elle reprend là où elle s'était arrêtée.

### Avec des options

Ouvre un terminal dans le dossier du projet (clic droit dans le dossier, « Ouvrir dans le terminal ») :

```
# L'aperçu dans le navigateur, avec des options (elles commencent toutes par --)
.\hoopcut.bat --focus-joueur "Parker" --sans-musique

# Centré sur un joueur (le nom de famille suffit), sans aperçu
.\hoopcut.bat "https://youtu.be/oJd_NbZx9VA" --focus-joueur "Parker"

# Centré sur une équipe, avec ton propre titre
.\hoopcut.bat "https://youtu.be/oJd_NbZx9VA" --focus-equipe "ASVEL" --titre "L'ASVEL EN FEU"

# Compilation : la plus belle action en premier pour accrocher
.\hoopcut.bat "https://youtu.be/ORfjgE6n2Pc" --ordre accroche

# Plusieurs vidéos d'un coup
.\hoopcut.bat "https://youtu.be/..." "https://youtu.be/..." ma_video.mp4
```

### Musique

Dépose tes musiques **libres de droits** dans le dossier `musique/`. hoopcut en choisit une au hasard pour chaque short.

Il repère les temps de la musique (grosse caisse, caisse claire) et fait tomber chaque changement de clip sur un temps : la fin des clips bouge d'au plus 0,3 s, sans jamais couper le geste ni déborder sur un autre plan. Une musique sans rythme net (ambiance, piano libre) est posée telle quelle. Dans l'aperçu, la musique repart à chaque clip de l'endroit où elle tombera dans le short.

- `--musique fichier.mp3` impose une musique.
- `--sans-musique` n'en met aucune.
- `--sans-rythme` pose la musique sans caler les changements de clip sur ses temps.
- `--volume-musique 0.5` monte la musique.
- `--volume-original 0` coupe le son du match pour ne garder que la musique.

### Principales options

| Option | Effet |
|---|---|
| `--focus-joueur NOM` / `--focus-equipe NOM` | Ne garde que les actions de ce joueur ou de cette équipe. S'il n'y en a pas assez, d'autres actions complètent la vidéo. |
| `--titre "…"` | Titre affiché en haut. Par défaut, c'est le titre proposé par l'IA. |
| `--ordre chrono / crescendo / accroche` | Ordre des clips. Par défaut : chronologique pour un match, crescendo pour une compilation. |
| `--duree-min 60 --duree-max 80` | Fourchette de durée. |
| `--transition fondu / flash / glisse / aucune` | Transition entre les clips. |
| `--fond flou / noir` | Fond derrière la vidéo. |
| `--zoom 1.25` | Agrandit la vidéo en rognant les côtés (défaut 1,25 ; `--zoom 1` garde l'image entière). |
| `--sans-accroche` | Le short commence directement par la première action. |
| `--sans-cris` | N'affiche pas les cris des commentateurs. |
| `--couleur "#FF7A00"` | Couleur d'accent (étiquette, score, légende). |
| `--sans-score` | N'affiche pas le score. |
| `--sans-commentaires` | Ne transcrit pas les commentaires : un peu plus rapide, mais les noms de joueurs sont perdus. |
| `--ia gemini` | Utilise Gemini (en ligne) au lieu de l'IA locale. |
| `--analyse-seulement` | Affiche les actions repérées, sans monter la vidéo. |
| `--reanalyser` | Refait l'analyse au lieu de réutiliser la précédente. |
| `--sans-apprentissage` | Ne tient pas compte de ce qui a été appris des avis. |

La liste complète s'affiche avec `.\hoopcut.bat --help`.

## Retoucher les choix de l'IA à la main

Le plus simple est l'aperçu (voir plus haut). Ses retouches sont dans `hoopcut-donnees\travail\<identifiant de la vidéo>\retouches.json`.

L'analyse elle-même est dans `analyse_locale.json` (`analyse_gemini.json` avec Gemini), au même endroit. Tu peux y corriger une note de spectacle, ou marquer une action comme ralenti (`"replay": true`). Relance ensuite : l'analyse n'est pas refaite, et le short est remonté en une à deux minutes avec tes corrections.

Les noms de joueurs viennent des commentaires, mais seuls les noms sûrs sont affichés :
- ceux écrits dans le titre ou la description YouTube, avec leur orthographe (« Fodzo Dada » et non « Fuzo Dada ») ;
- ceux que l'IA reconnaît comme de vrais joueurs, orthographe corrigée (« Lemon yama » devient « Victor Wembanyama »).

Les autres noms, souvent mal entendus, sont retirés, et la légende montre alors l'équipe (« DUNK · VIL »). C'est fréquent pour les championnats moins connus de l'IA. Pour afficher un nom, utilise « Mauvaise légende » dans l'aperçu.

## Option Gemini (IA en ligne de Google)

Gemini est plus précis que l'IA locale et bien plus rapide (1 à 3 min). Il entend aussi directement le son. Mais la vidéo est envoyée chez Google, et il faut une clé :

1. crée-la sur https://aistudio.google.com/apikey ;
2. copie le fichier `.env.example` en `.env`, dans le dossier du projet ;
3. remplace `colle_ta_cle_ici` par ta clé ;
4. ajoute `--ia gemini` à la commande.

Coût : environ **0,10 à 0,40 $ pour un résumé de 5 à 10 minutes** (`gemini-3.8-flash`, tarifs de septembre 2026). Le coût réel s'affiche après chaque analyse. Google propose aussi un niveau gratuit, avec des limites d'usage ; sur ce niveau, Google peut utiliser les vidéos envoyées pour améliorer ses produits.

## Problèmes fréquents

- **La page ne s'ouvre pas** : ouvre toi-même l'adresse affichée dans la fenêtre noire (en général http://127.0.0.1:8765).
- **« hoopcut ne répond plus »** dans la page : la fenêtre noire a été fermée. Relance `hoopcut.bat`.
- **« L'IA locale n'est pas installée »** : double-clique sur `installer.bat`.
- **« Le moteur local s'est arrêté au démarrage »** : la mémoire de la carte graphique est sans doute pleine. Ferme les jeux et logiciels de montage, puis relance. Le détail est dans `ia_locale.log`, à côté de l'analyse.
- **« FFmpeg est introuvable »** : installe FFmpeg, puis rouvre le terminal.
- **« YouTube demande une connexion »** : relance avec `--cookies-navigateur chrome` (ou `firefox`, `edge`…), en étant connecté à YouTube dans ce navigateur.
- **« pas disponible dans ton pays »** : la vidéo est bloquée dans ta région (fréquent avec les chaînes TV).
- **Autre échec de téléchargement** : YouTube change souvent. Relance `installer.bat`, qui met aussi à jour l'outil de téléchargement.
- **« Clé Gemini refusée »** : vérifie le fichier `.env`.

## Droits d'auteur

Les images des matchs (beIN SPORTS, NBA, EuroLeague…) et la plupart des musiques sont protégées. Republier des extraits sur TikTok, YouTube ou Instagram peut entraîner :

- une réclamation ou la démonétisation ;
- la suppression de la vidéo ;
- un avertissement sur ta chaîne.

Le plus sûr est d'utiliser des vidéos dont tu as les droits (ton club, ta chaîne, un accord avec le diffuseur), des musiques libres de droits, et de toujours citer la source. Le fichier `.txt` généré contient la ligne de crédit.

## Pour les développeurs

```
hoopcut/
  fetch.py          téléchargement (yt-dlp) ou fichier local
  analyze_local.py  analyse locale : Qwen3.5-4B via llama-server (entrée vidéo native, JSON imposé)
  transcribe.py     commentaires : whisper.cpp en arrière-plan, lu au fil de l'eau
  engines.py        emplacement, téléchargement et vérification des moteurs et modèles
  analyze.py        analyse par Gemini (API Interactions : vidéo + son, JSON imposé)
  prompts.py        consignes données aux IA : à modifier pour changer leurs critères
  models.py         format des actions (réponse de l'IA et format interne)
  shots.py          changements de plan (filtre scene de FFmpeg)
  select.py         choix des clips (programmation dynamique sur la durée)
  hook.py           accroche : la plus belle action en ouverture
  shouts.py         cris des commentateurs reconnus dans la transcription
  beats.py          temps de la musique (attaques graves et aigues, tempo en peigne, suivi d'Ellis) et calage des coupes
  overlay.py        habillage PNG (titre, score, légende) avec Pillow
  render.py         montage FFmpeg (vertical, fond flou, fondus, musique, volume -14 LUFS)
  heuristic.py      mode --sans-ia (volume sonore)
  pipeline.py       enchaînement des étapes (prepare, choose, render_short)
  feedback.py       retouches d'une vidéo, journal des avis et ce qui en est appris
  interface.py      serveur web local (127.0.0.1 seulement) de l'aperçu
  interface.html    la page de l'aperçu (HTML, CSS et JavaScript, sans dépendance)
  cli.py            ligne de commande
```

Moteurs installés par `installer.bat` : llama.cpp b11222 (CUDA 12.4) et whisper.cpp b5130 (processeur), avec Qwen3.5-4B Q4_K_M, son module de vision F16 et Whisper large-v3-turbo. La variable d'environnement Windows `HOOPCUT_DONNEES` change le dossier des gros fichiers.

Tests (FFmpeg requis) : `python -m pip install -e ".[dev]"` puis `python -m pytest`. Les tests fabriquent une vidéo synthétique et simulent les réponses des IA : ils ne demandent ni carte graphique ni réseau.

Police : [Anton](https://fonts.google.com/specimen/Anton) (SIL Open Font License, voir `hoopcut/assets/fonts/OFL.txt`).
