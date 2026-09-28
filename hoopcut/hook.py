"""Accroche : la plus belle action du short, montrée dès la première seconde.

Sur les réseaux, tout se joue dans les deux premières secondes. Avant le récit (chronologique pour
un match), le short montre donc la fin du clip le plus fort : le geste et la réaction, 2 à 4 s.
L'action repasse ensuite à sa place, en entier.

Parmi les trois clips les mieux notés, celui où un commentateur crie (« THROWS IT DOWN ! ») est
préféré : c'est la preuve la plus sûre d'une grosse action. Mesuré sur les vidéos d'essai, le
volume de la salle, lui, ne situe pas bien le geste (son TV compressé, commentateur qui parle fort).
"""

from __future__ import annotations

from .select import FRAME, Clip, EditPlan

LONGEST = 4.0  # durée maximale de l'accroche
SHORTEST = 2.0
BEFORE_KEY = 1.0  # l'accroche démarre au plus tôt 1 s avant le geste repéré par l'IA
EXTRA_END = 1.0  # et peut finir 1 s après le clip, s'il n'y a pas de changement de plan
# Place à réserver dans le short : l'accroche ajoute entre SHORTEST et LONGEST secondes (moins un fondu)
RESERVE_MIN, RESERVE_MAX, RESERVE_TARGET = SHORTEST - 0.3, LONGEST, 3.0


def teaser(plan: EditPlan, cuts: list[float], duration: float, excluded: set[str] = frozenset()) -> Clip | None:
    """L'accroche tirée du clip le plus fort, ou None si le short est trop court pour en avoir une.
    `excluded` : gestes (moment_id) refusés comme accroche dans l'aperçu."""
    if len(plan.clips) < 3:
        return None
    ranked = sorted((c for c in plan.clips if f"{c.moment.key:.2f}" not in excluded),
                    key=lambda c: c.value, reverse=True)[:3]
    if not ranked:
        return None
    best = next((c for c in ranked if c.shout), ranked[0])
    after = [cut for cut in cuts if cut > best.end - 0.05]
    end = min(best.end + EXTRA_END, (after[0] - FRAME) if after else duration, duration)
    end = max(end, best.end)
    start = max(best.start, best.moment.key - BEFORE_KEY, end - LONGEST)
    if end - start < SHORTEST:
        start = max(best.start, end - SHORTEST)
    if end - start < SHORTEST - 0.3:
        return None
    return Clip(start=round(start, 2), end=round(end, 2), moment=best.moment, value=best.value, teaser=True)
