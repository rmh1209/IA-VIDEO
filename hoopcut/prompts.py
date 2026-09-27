"""Consigne donnée à l'IA vidéo. Modifiable pour ajuster ses choix."""

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
