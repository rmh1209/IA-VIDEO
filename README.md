# hoopcut — l'IA qui fait tes shorts basket

Tu donnes un lien YouTube (résumé de match ou compilation) et hoopcut produit une **vidéo verticale de 60 à 80 secondes** avec les meilleurs moments :

- la vidéo au centre, sur un fond flouté (elle ne remplit pas tout l'écran) ;
- le **titre** en haut ;
- le **score** et l'**action** en bas (« DUNK · TONY PARKER ») ;
- de la **musique** sous le son du match ;
- **aucun ralenti**.

Il prépare aussi un fichier texte avec un titre, une description et des hashtags prêts à coller au moment de publier.

## Comment l'IA choisit les moments

1. **Téléchargement** de la vidéo YouTube.
2. **L'IA vidéo (Gemini, de Google) regarde toute la vidéo en continu, image et son** : elle voit le mouvement (2 images par seconde) et entend les commentaires et le public. Elle liste chaque action avec :
   - le type : dunk, 3 points, contre, alley-oop, interception… ;
   - le joueur et l'équipe ;
   - le score affiché au tableau ;
   - une note de spectacle et une note d'importance dans le match ;
   - les ralentis, qui sont écartés.
3. **Repérage des changements de plan**, pour couper proprement sans montrer le début de l'action suivante.
4. **Sélection** : l'outil calcule la meilleure combinaison de clips pour tenir entre 60 et 80 s, fondus compris. Il évite les doublons et varie les joueurs et les types d'action. Un résumé de match reste dans l'ordre chronologique. Une compilation va du moins fort au plus fort.
5. **Montage** au format 1080×1920 : habillage, fondus, musique, et volume réglé au niveau des réseaux sociaux.

## Installation (une seule fois)

1. **Python 3.10 ou plus récent** : https://www.python.org/downloads/. Sur Windows, coche « Add Python to PATH » pendant l'installation.
2. **FFmpeg**, le moteur de montage :
   - Windows : `winget install Gyan.FFmpeg`
   - Mac : `brew install ffmpeg`
3. **Le projet** : télécharge-le depuis GitHub (bouton « Code » puis « Download ZIP ») et décompresse-le. Ouvre un terminal dans ce dossier.
4. **Installation des modules** :
   ```
   python -m pip install -e .
   ```
   Sur Windows, si `python` n'est pas reconnu, remplace-le par `py`.
5. **Clé Gemini** :
   - crée-la sur https://aistudio.google.com/apikey ;
   - copie le fichier `.env.example` en `.env` ;
   - remplace `colle_ta_cle_ici` par ta clé.

Ferme puis rouvre le terminal après l'installation de FFmpeg.

## Utilisation

```
hoopcut "https://youtu.be/oJd_NbZx9VA"
```

La vidéo finale arrive dans le dossier `sorties/`, avec son fichier `.txt` pour la publication. Si la commande `hoopcut` n'est pas reconnue, utilise `python -m hoopcut` à la place.

Autres exemples :

```
# Centré sur un joueur (le nom de famille suffit)
hoopcut "https://youtu.be/oJd_NbZx9VA" --focus-joueur "Parker"

# Centré sur une équipe, avec ton propre titre
hoopcut "https://youtu.be/oJd_NbZx9VA" --focus-equipe "ASVEL" --titre "L'ASVEL EN FEU"

# Compilation : la plus belle action en premier pour accrocher
hoopcut "https://youtu.be/ORfjgE6n2Pc" --ordre accroche

# Plusieurs vidéos d'un coup
hoopcut "https://youtu.be/..." "https://youtu.be/..." ma_video.mp4

# Essai gratuit sans clé Gemini (repère les moments au volume sonore, sans comprendre le jeu)
hoopcut ma_video.mp4 --sans-ia
```

### Musique

Dépose tes musiques **libres de droits** dans le dossier `musique/`. hoopcut en choisit une au hasard pour chaque short.

- `--musique fichier.mp3` impose une musique.
- `--sans-musique` n'en met aucune.
- `--volume-musique 0.5` monte la musique.
- `--volume-original 0` coupe le son du match pour ne garder que la musique.

Si la vidéo source contient déjà une musique (fréquent dans les compilations), l'outil te le signale.

### Principales options

| Option | Effet |
|---|---|
| `--focus-joueur NOM` / `--focus-equipe NOM` | Ne garde que les actions de ce joueur ou de cette équipe. S'il n'y en a pas assez, d'autres actions complètent la vidéo. |
| `--titre "…"` | Titre affiché en haut. Par défaut, c'est le titre proposé par l'IA. |
| `--ordre chrono / crescendo / accroche` | Ordre des clips. Par défaut : chronologique pour un match, crescendo pour une compilation. |
| `--duree-min 60 --duree-max 80` | Fourchette de durée. |
| `--transition fondu / flash / glisse / aucune` | Transition entre les clips. |
| `--fond flou / noir` | Fond derrière la vidéo. |
| `--zoom 1.3` | Agrandit la vidéo en rognant les côtés. |
| `--couleur "#FF7A00"` | Couleur d'accent (étiquette, score, légende). |
| `--sans-score` | N'affiche pas le score. |
| `--analyse-seulement` | Affiche les actions repérées, sans monter la vidéo. |
| `--reanalyser` | Refait l'analyse IA au lieu de réutiliser la précédente. |

La liste complète s'affiche avec `hoopcut --help`.

## Retoucher les choix de l'IA

L'analyse est enregistrée dans `travail/<identifiant de la vidéo>/analyse_ia.json`. Tu peux y corriger un nom de joueur, une note de spectacle, ou marquer une action comme ralenti (`"replay": true`).

Relance ensuite la même commande. L'analyse n'est pas refaite, c'est donc gratuit et rapide. Ça marche aussi pour essayer un autre focus, un autre ordre ou une autre musique sur la même vidéo.

## Coût

L'IA est facturée par Google selon la quantité de vidéo regardée :

- environ **0,10 à 0,40 $ pour un résumé de 5 à 10 minutes** avec le modèle par défaut (`gemini-3.8-flash`, tarifs de septembre 2026) ;
- le coût réel s'affiche après chaque analyse ;
- `--resolution low` le réduit, mais le score au tableau est alors moins bien lu.

Google propose aussi un niveau gratuit, avec des limites d'usage. Sur ce niveau, Google peut utiliser les vidéos envoyées pour améliorer ses produits.

## Problèmes fréquents

- **« FFmpeg est introuvable »** : installe FFmpeg, puis rouvre le terminal.
- **« YouTube demande une connexion »** : relance avec `--cookies-navigateur chrome` (ou `firefox`, `edge`…), en étant connecté à YouTube dans ce navigateur.
- **« pas disponible dans ton pays »** : la vidéo est bloquée dans ta région (fréquent avec les chaînes TV).
- **Autre échec de téléchargement** : YouTube change souvent. Mets à jour l'outil de téléchargement avec `python -m pip install -U yt-dlp`.
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
  fetch.py      téléchargement (yt-dlp) ou fichier local
  analyze.py    analyse par Gemini (API Interactions : vidéo + son, JSON imposé)
  prompts.py    consigne donnée à l'IA : à modifier pour changer ses critères
  models.py     format des actions (réponse de l'IA et format interne)
  shots.py      changements de plan (filtre scene de FFmpeg)
  select.py     choix des clips (programmation dynamique sur la durée)
  overlay.py    habillage PNG (titre, score, légende) avec Pillow
  render.py     montage FFmpeg (vertical, fond flou, fondus, musique, volume -14 LUFS)
  heuristic.py  mode --sans-ia (volume sonore)
  pipeline.py   enchaînement des étapes
  cli.py        ligne de commande
```

Tests (FFmpeg requis) : `python -m pip install -e ".[dev]"` puis `python -m pytest`. Les tests fabriquent une vidéo synthétique et simulent les réponses de Gemini : ils ne coûtent rien et n'utilisent pas le réseau.

Police : [Anton](https://fonts.google.com/specimen/Anton) (SIL Open Font License, voir `hoopcut/assets/fonts/OFL.txt`).
