"""Consignes données aux IA vidéo (Gemini et IA locale). Modifiables pour ajuster leurs choix."""

from __future__ import annotations

from .text_utils import format_timecode

ANALYSIS_PROMPT = """\
Tu es un monteur vidéo expert en basket-ball. Tu regardes une vidéo YouTube de {duration} \
(image ET son : commentaires, réactions du public). C'est un résumé de match ou une compilation d'actions.

Objectif : repérer toutes les actions qui pourraient figurer dans un short vertical de 60 à 80 secondes.

Règles :
1. Regarde TOUTE la vidéo, du début à la fin. Liste toutes les actions de jeu notables : dunks, \
alley-oops, tirs à 3 points, contres, interceptions, contre-attaques, dribbles spectaculaires, \
passes décisives, paniers au buzzer… (souvent 15 à 40 pour un résumé de 5 à 10 minutes). \
Chaque action n'apparaît qu'une seule fois.
2. Les ralentis et rediffusions d'une action déjà montrée sont listés à part avec replay = true. \
Ne liste pas les plans sans jeu (interviews, plateau TV, public seul, habillage graphique).
3. Les temps sont au format MM:SS.d (ex. 01:15.5), comptés depuis le début de la vidéo, \
entre 00:00.0 et {end} :
   - start : début de l'action, 2 à 5 s avant le geste décisif (début du drive, de la passe, \
de la contre-attaque), jamais avant le changement de plan qui introduit l'action ;
   - key : instant exact du geste décisif (ballon qui rentre, dunk, contre, interception) ;
   - end : 1 à 2 s après le geste (réaction comprise), avant le changement de plan vers une autre action.
4. spectacular (1 à 10) : 10 = dunk rageur sur un défenseur, alley-oop acrobatique, tir au buzzer \
de très loin ; 5 = beau panier classique ; 1 = lancer franc ou lay-up sans opposition. \
Sois exigeant et utilise toute l'échelle.
5. importance (1 à 10) : poids de l'action dans le match (égalisation, prise d'avance, fin de match \
serrée, tir de la gagne, série décisive). Pour une compilation, mets 5 sauf contexte exceptionnel.
6. team_a / team_b : noms courts des deux équipes tels qu'affichés sur le tableau de score \
(ex. « ASVEL », « MACCABI »), team_a étant celle affichée à gauche ou en premier. null pour une compilation.
7. Pour chaque action, team = l'équipe qui la réalise, écrite exactement comme team_a ou team_b. \
player = nom du joueur uniquement s'il est identifiable avec certitude (commentaires, incrustation, \
numéro de maillot) ; sinon null. N'invente jamais un nom.
8. score_a / score_b : score affiché au tableau juste après l'action (dans l'ordre team_a, team_b) \
s'il est lisible ; sinon null. final_score_a / final_score_b : score final s'il est connu.
9. source_has_music : true si la bande-son contient une musique ajoutée (fréquent dans les compilations).
10. En français : la description de chaque action (une phrase courte), le titre du short \
(45 caractères maximum, accrocheur, sans emoji ni hashtag) et la description de publication. \
Ajoute 5 à 8 hashtags pertinents.
"""

JSON_ONLY_SUFFIX = """

Réponds UNIQUEMENT avec un objet JSON valide conforme à ce schéma JSON, sans texte autour :
{schema}
"""


def build_prompt(duration: float) -> str:
    minutes, seconds = divmod(round(duration), 60)
    human = f"{minutes} min {seconds:02d} s" if minutes else f"{seconds} s"
    return ANALYSIS_PROMPT.format(duration=human, end=format_timecode(duration))


# --- IA locale (Qwen3.5-4B) : consignes courtes et précises, un petit modèle s'y perd moins ---

LOCAL_OVERVIEW_PROMPT = """\
Voici {count} images prises à intervalles réguliers dans une vidéo YouTube de basket.
Titre de la vidéo : « {title} »{channel}.
{commentary}
Réponds :
- video_type : match (résumé d'un seul match), compilation (actions de plusieurs matchs) ou other ;
- team_a, team_b : noms courts des deux équipes tels qu'écrits sur le tableau de score (team_a = celle écrite \
en premier) ; null pour une compilation ;
- jersey_a, jersey_b : couleur principale du maillot de chaque équipe, en français (ex. « jaune », « noir ») ;
- competition : compétition (ex. EuroLeague, NBA, Betclic Élite) si elle est visible ou dans le titre, sinon null ;
- scoreboard : position du tableau de score à l'écran (top_left, top_center, top_right, bottom_left, \
bottom_center, bottom_right) ou none.
"""

LOCAL_WINDOW_PROMPT = """\
Tu es monteur vidéo spécialiste du basket. Tu viens de regarder un extrait de {duration:g} secondes d'une vidéo \
de basket ({context}). Les images défilent dans l'ordre, {fps:g} par seconde ; les repères comme [0m12.00s] \
donnent le temps écoulé depuis le début de l'extrait.
{commentary}
Liste les actions de jeu marquantes que tu VOIS dans les images : panier marqué, contre, interception. \
Les commentaires servent seulement à savoir qui joue et si le tir est réussi : n'ajoute jamais une action \
que tu ne vois pas, et ne compte pas une passe comme un panier. En général, 0 à 4 actions par extrait.
Pour chaque action :
- key : temps (en secondes depuis le début de l'extrait) du geste décisif : ballon qui entre dans le panier, \
contre ou interception ;
- start : début de l'attaque, 2 à 4 s avant key ; end : 1 à 2 s après key ;
- action : dunk (smash au-dessus du cercle), alley_oop, layup (double-pas près du panier), mid_range (tir \
à mi-distance), three_pointer (tir de loin, derrière l'arc), block (contre), steal (interception), fast_break \
(contre-attaque), free_throw (lancer franc) ou other ;
- team : {teams} ;
- player : nom du joueur qui réalise l'action (celui qui marque, pas le passeur ; celui qui contre, pas le \
tireur ; celui qui intercepte), s'il est prononcé par les commentateurs ou écrit à l'écran, sinon null ;
- scored : true seulement si le ballon entre dans le panier ;
- replay : true si ce passage est une rediffusion au ralenti ;
- spectacular : de 1 (banal) à 10 (exceptionnel : dunk rageur, contre spectaculaire, tir au buzzer) ;
- description : une phrase courte en français.
Si l'extrait ne montre aucune action de jeu (plateau télé, interview, public), renvoie une liste vide.
"""

LOCAL_SCORE_PROMPT = """\
Chaque image est un gros plan sur le tableau de score d'un match {team_a} - {team_b}.
Pour chaque image, dans l'ordre, lis le score : score_a = points de {team_a}, score_b = points de {team_b}. \
Le score d'une équipe est le nombre sur la même ligne que son nom, en général le plus à droite. \
Le chronomètre (ex. 7:46) et le décompte des 24 secondes (un petit nombre souvent dans une case de couleur) \
ne sont pas des scores.
Mets null si le tableau n'est pas visible ou illisible.
"""

LOCAL_VIEW_PROMPT = """\
Chaque image est tirée d'une vidéo de basket. Pour chaque image, dans l'ordre, dis comment elle est filmée :
- large : caméra principale, vue large et haute du terrain, les joueurs paraissent petits ;
- gros_plan : quelques joueurs en grand, ou caméra au bord du terrain ;
- ralenti : rediffusion d'une action (image floue, angle inhabituel) ;
- autre : public, banc, plateau TV, interview ou graphique.
"""

LOCAL_NAMES_PROMPT = """\
Vidéo de basket : « {title} »{context}.
Une transcription automatique des commentaires a produit ces noms de joueurs, parfois mal orthographiés :
{names}
Pour chaque nom de la liste :
- heard : le nom tel qu'il est écrit dans la liste ;
- name : nom complet et bien orthographié du joueur réel si tu le reconnais (par exemple « Lemon yama » -> \
« Victor Wembanyama ») ; sinon, recopie le nom tel quel ;
- known : true seulement si tu es certain qu'il s'agit d'un vrai joueur que tu connais, sinon false.
"""

LOCAL_SUMMARY_PROMPT = """\
Tu prépares la publication d'un short vertical de basket (60 à 80 s) tiré de la vidéo « {title} »{channel}.
{context}
Quelques actions du short :
{actions}
Écris en français (« dunk » se dit « dunk »), sans donner de nombre d'actions :
- title : titre accrocheur et complet, 40 caractères maximum, sans emoji ni hashtag ;
- description : 1 à 2 phrases pour la publication ;
- hashtags : 5 à 8 hashtags pertinents.
"""
