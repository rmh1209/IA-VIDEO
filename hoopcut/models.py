"""Données échangées entre les étapes : analyse de la vidéo et moments forts.

Deux niveaux :
- `AIMoment` / `AIAnalysis` : le format JSON imposé à l'IA vidéo (temps en « MM:SS.d »,
  le format naturel du modèle, qui voit la vidéo horodatée) ;
- `Moment` / `Analysis` : le format interne (temps en secondes), sauvegardé dans
  `analyse_*.json` et modifiable à la main avant un nouveau rendu.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

from .text_utils import fold, parse_timecode, same_name

# Code de l'action -> libellé affiché dans la vidéo
ACTIONS: dict[str, str] = {
    "dunk": "DUNK",
    "alley_oop": "ALLEY-OOP",
    "three_pointer": "PANIER À 3 POINTS",
    "block": "CONTRE",
    "steal": "INTERCEPTION",
    "fast_break": "CONTRE-ATTAQUE",
    "crossover": "CROSSOVER",
    "assist": "PASSE DÉCISIVE",
    "and_one": "AND-ONE",
    "buzzer_beater": "BUZZER-BEATER",
    "layup": "LAY-UP",
    "mid_range": "TIR À MI-DISTANCE",
    "free_throw": "LANCER FRANC",
    "basket": "PANIER",  # panier dont le type exact n'est pas sûr
    "other": "ACTION",
}

ActionCode = Literal[tuple(ACTIONS)]  # type: ignore[valid-type]


class AIMoment(BaseModel):
    start: str = Field(
        description="Début de l'action (MM:SS.d) : 2 à 5 s avant le geste décisif, "
        "au début de la phase de jeu, jamais avant le plan qui introduit l'action."
    )
    key: str = Field(
        description="Instant exact du geste décisif (MM:SS.d) : ballon qui rentre, dunk, contre, interception."
    )
    end: str = Field(
        description="Fin de l'action (MM:SS.d) : 1 à 2 s après le geste, réaction comprise, "
        "avant le changement de plan vers une autre action."
    )
    action: ActionCode = Field(description="Type d'action.")
    description: str = Field(description="Une phrase courte en français décrivant l'action.")
    team: Optional[str] = Field(
        description="Équipe qui réalise l'action, écrite exactement comme team_a ou team_b ; null si inconnue."
    )
    player: Optional[str] = Field(
        description="Nom du joueur seulement s'il est identifiable avec certitude "
        "(commentaires, incrustation, maillot) ; sinon null."
    )
    spectacular: int = Field(description="Note de spectacle de 1 à 10.")
    importance: int = Field(description="Poids de l'action dans le match, de 1 à 10.")
    replay: bool = Field(description="true si c'est un ralenti ou la rediffusion d'une action déjà montrée.")
    score_a: Optional[int] = Field(description="Score de team_a affiché juste après l'action ; null si illisible.")
    score_b: Optional[int] = Field(description="Score de team_b affiché juste après l'action ; null si illisible.")


class AIAnalysis(BaseModel):
    video_type: Literal["match", "compilation", "other"] = Field(
        description="match = résumé d'un seul match ; compilation = actions de plusieurs matchs ; other = autre."
    )
    team_a: Optional[str] = Field(
        description="Nom court de l'équipe affichée à gauche/en premier sur le tableau de score ; null si compilation."
    )
    team_b: Optional[str] = Field(description="Nom court de l'autre équipe ; null si compilation.")
    competition: Optional[str] = Field(description="Compétition (ex. « EuroLeague », « NBA ») si connue, sinon null.")
    source_has_music: bool = Field(description="true si la bande-son contient une musique ajoutée.")
    moments: list[AIMoment] = Field(description="Toutes les actions de jeu notables, dans l'ordre de la vidéo.")
    final_score_a: Optional[int] = Field(description="Score final de team_a si connu, sinon null.")
    final_score_b: Optional[int] = Field(description="Score final de team_b si connu, sinon null.")
    title: str = Field(description="Titre accrocheur en français pour le short, 45 caractères maximum, sans emoji.")
    description: str = Field(description="Description en français pour la publication, 1 à 2 phrases.")
    hashtags: list[str] = Field(description="5 à 8 hashtags pertinents.")


class Moment(BaseModel):
    start: float
    key: float
    end: float
    action: str = "other"
    description: str = ""
    team: Optional[str] = None
    team_sure: bool = True  # False : équipe devinée (sert au focus), pas assez sûre pour la légende
    player: Optional[str] = None
    spectacular: int = 5
    importance: int = 5
    replay: bool = False
    score_a: Optional[int] = None
    score_b: Optional[int] = None

    @property
    def label(self) -> str:
        return ACTIONS.get(self.action, ACTIONS["other"])


class Analysis(BaseModel):
    source_duration: float
    analyzer: str = "gemini"
    model: Optional[str] = None
    video_type: str = "other"
    team_a: Optional[str] = None
    team_b: Optional[str] = None
    competition: Optional[str] = None
    source_has_music: bool = False
    final_score_a: Optional[int] = None
    final_score_b: Optional[int] = None
    title: str = ""
    description: str = ""
    hashtags: list[str] = Field(default_factory=list)
    moments: list[Moment] = Field(default_factory=list)

    @property
    def has_final_score(self) -> bool:
        return self.final_score_a is not None and self.final_score_b is not None

    @classmethod
    def from_ai(cls, ai: AIAnalysis, duration: float, model: str | None = None) -> "Analysis":
        """Convertit la réponse de l'IA : temps en secondes, bornes et notes vérifiées."""
        moments = []
        for m in ai.moments:
            try:
                start, key, end = (parse_timecode(v) for v in (m.start, m.key, m.end))
            except ValueError:
                continue
            start, end = sorted((_clamp(start, 0.0, duration), _clamp(end, 0.0, duration)))
            if end - start < 0.5:
                continue
            if not start <= key <= end:
                key = start + 0.65 * (end - start)
            moments.append(
                Moment(
                    start=round(start, 2),
                    key=round(key, 2),
                    end=round(end, 2),
                    action=m.action if m.action in ACTIONS else "other",
                    description=m.description.strip(),
                    team=_canonical_team(m.team, ai.team_a, ai.team_b),
                    player=(m.player or "").strip() or None,
                    spectacular=int(_clamp(m.spectacular, 1, 10)),
                    importance=int(_clamp(m.importance, 1, 10)),
                    replay=m.replay,
                    score_a=m.score_a,
                    score_b=m.score_b,
                )
            )
        moments.sort(key=lambda mo: mo.start)
        return cls(
            source_duration=duration,
            analyzer="gemini",
            model=model,
            video_type=ai.video_type,
            team_a=ai.team_a,
            team_b=ai.team_b,
            competition=ai.competition,
            source_has_music=ai.source_has_music,
            final_score_a=ai.final_score_a,
            final_score_b=ai.final_score_b,
            title=ai.title.strip(),
            description=ai.description.strip(),
            hashtags=[_hashtag(h) for h in ai.hashtags if _hashtag(h)],
            moments=moments,
        )


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _canonical_team(team: str | None, team_a: str | None, team_b: str | None) -> str | None:
    """Ramène « LDLC ASVEL » ou « asvel » au nom exact de team_a / team_b."""
    if not (team and fold(team)):
        return None
    for name in (team_a, team_b):
        if same_name(name, team):
            return name
    return team.strip()


def _hashtag(tag: str) -> str:
    tag = "".join(tag.split()).lstrip("#")
    return f"#{tag}" if tag else ""
