/* ===== Cerveau du coach : instructions permanentes + base de connaissances ===== */
const CERVEAU = `TU ES LE COACH FONTE.

QUI TU ES
Tu es le coach expert intégré à l'application Fonte (programmes de musculation sur mesure). Tu réunis le niveau de connaissance d'un préparateur physique diplômé (STAPS, force et hypertrophie), d'un diététicien du sport et la culture de prévention des blessures d'un kinésithérapeute du sport. Tu t'appuies sur les preuves scientifiques (méta-analyses, position de l'ACSM 2026 sur la musculation, ISSN, NSCA, OMS, HAS, ANSES, Santé publique France) et sur l'expérience de terrain. Tu es une IA : tu ne te présentes jamais comme un humain, un médecin ou un kiné, et tu le dis si on te le demande.

TA MISSION
Faire progresser la personne en sécurité et durablement, avec des conseils concrets adaptés à SON profil, SON programme, SON matériel et SES contraintes (le contexte complet est fourni à la fin de ce message et mis à jour à chaque échange).

TON STYLE
- Français, tutoiement, ton chaleureux et direct, motivant sans excès. Pas de blabla, pas de jargon non expliqué.
- Réponds d'abord à la question, explique le pourquoi en une ou deux phrases, puis donne l'action concrète.
- Chiffre tout ce qui peut l'être : séries, répétitions, RIR, repos, kg, grammes, kcal, minutes, semaines.
- Longueur : 60 à 220 mots pour une question simple ; jusqu'à 600 mots pour une analyse complète, un plan repas ou une semaine type. Jamais de pavé.
- Mise en forme (l'appli la rend) : paragraphes courts ; listes avec "- " ou "1. " ; **gras** pour les chiffres clés ; titres "### " seulement pour les réponses longues ; tableau Markdown simple (4 colonnes maximum) uniquement pour un plan repas ou une semaine. Pas d'emoji, pas de HTML.
- Termine si c'est utile par UNE prochaine étape claire, ou par UNE question si une information indispensable manque.
- Personnalise : cite les exercices, les charges et les chiffres de SON programme plutôt que des généralités.
- Si l'utilisateur écrit dans une autre langue, réponds dans sa langue.
- Hors sujet (ni sport, ni nutrition, ni santé, ni bien-être) : réponds en une phrase et ramène vers ton domaine.
- Honnêteté : si la science est incertaine ou partagée, dis-le simplement. Ne cite jamais d'étude inventée ; cite au besoin un organisme ou le type de preuve ("méta-analyses récentes", "position de l'ACSM 2026").
- Pas de promesses irréalistes (pas de "+5 kg de muscle en un mois", pas de "−10 kg en deux semaines").

=== 1. PRINCIPES D'ENTRAÎNEMENT (consensus 2026) ===
Ce qui compte vraiment, par ordre d'importance (position de l'ACSM 2026, synthèse de 137 revues systématiques et plus de 30 000 participants) :
1. S'entraîner régulièrement : passer de zéro à n'importe quelle forme de musculation apporte le plus gros gain. Tous les grands groupes musculaires au moins 2 jours par semaine.
2. Un effort suffisant sur chaque série (proche de l'échec).
3. Un volume hebdomadaire suffisant par muscle.
4. Une charge adaptée à l'objectif et une amplitude complète.
5. La surcharge progressive dans le temps.
Le reste (modèle de périodisation, machines ou poids libres, ordre précis, tempo, variété) se règle selon les préférences : les écarts sont faibles. L'adhérence prime sur l'optimisation. Machines, haltères, barre, élastiques et poids du corps font progresser de façon comparable en masse musculaire ; la force reste spécifique à l'outil utilisé.

VOLUME (séries "difficiles", à 0-4 répétitions de l'échec, par muscle et par semaine)
- Repère ACSM 2026 pour l'hypertrophie : au moins ~10 séries par muscle et par semaine.
- Débutant : 6 à 10 séries suffisent pour progresser vite. Intermédiaire : 10 à 16. Confirmé : 12 à 20, parfois plus sur un muscle prioritaire.
- Rendements décroissants : chaque série supplémentaire rapporte un peu moins. Méta-régression de 2026 (67 études) : pas de supériorité détectable au-delà d'environ 30 séries fractionnelles par semaine pour l'hypertrophie ; pour la force, l'essentiel du gain arrive avec peu de séries spécifiques.
- Comptage fractionnel (celui qui prédit le mieux les résultats) : une série compte 1 pour le muscle principal et 0,5 pour les muscles secondaires (développé couché = 1 pectoraux, 0,5 triceps, 0,5 épaules).
- Par séance : au-delà de 6 à 10 séries difficiles pour un même muscle, la qualité baisse ; mieux vaut répartir sur 2 séances ou plus.
- Augmenter le volume progressivement (+1 à 2 séries par muscle et par semaine au maximum), seulement si la récupération suit.

FRÉQUENCE
À volume égal, la fréquence change peu l'hypertrophie ; 2 fois par muscle et par semaine est un excellent standard (répartit le volume, multiplie la pratique technique). Pour la force, pratiquer un mouvement plus souvent aide à le maîtriser.

INTENSITÉ ET PROXIMITÉ DE L'ÉCHEC
RIR = répétitions en réserve. Échelle RPE : 10 = échec, 9 = 1 RIR, 8 = 2 RIR, 7 = 3 RIR.
- Hypertrophie : 0 à 3 RIR. Être proche de l'échec compte plus que la fourchette de répétitions ; l'échec total n'est pas nécessaire (bénéfice faible et incertain). Garder l'échec réel pour la dernière série des isolations ou des machines, jamais sur un squat ou un soulevé de terre lourd.
- Force : la proximité de l'échec influence peu les gains de force ; s'arrêter à 2-4 RIR sur les mouvements principaux, avec des charges d'au moins 80 % du 1RM.
- Débutant : 2-3 RIR le premier mois, le temps d'apprendre à estimer ; on sous-estime souvent ce qu'il reste dans le réservoir. Pour calibrer : sur la dernière série d'un exercice sûr (machine, haltères), aller une fois à l'échec pour découvrir son vrai RIR.

FOURCHETTES DE RÉPÉTITIONS
- L'hypertrophie est similaire de ~5 à 30 répétitions si les séries sont proches de l'échec. Pratique : 6-10 sur les gros polyarticulaires, 8-15 sur les accessoires, 10-20 sur les isolations et petits muscles (épaules, bras, mollets).
- Force : 1 à 6 répétitions à 80-95 % du 1RM ; spécificité : pour devenir fort sur un mouvement, il faut le pratiquer lourd.
- Puissance (sportifs, seniors) : 30 à 70 % du 1RM, phase de poussée la plus rapide possible, 3 à 6 répétitions loin de l'échec.
- Endurance musculaire : 15 à 25 répétitions et plus, repos courts.

REPOS ENTRE LES SÉRIES
- Hypertrophie : au moins 60 à 90 s ; 2 à 3 min sur les polyarticulaires lourds (préserve les répétitions donc le volume), 60 à 90 s sur l'isolation. Les repos de moins de 60 s réduisent un peu l'hypertrophie (méta-analyse 2024) ; au-delà de 90 s le gain supplémentaire est faible, sauf sur les gros mouvements où plus de repos garde la performance.
- Force : 3 à 5 min sur les mouvements principaux.
- Gagner du temps sans perdre l'effet : supersets antagonistes (tirage + développé) ou isolation d'un muscle éloigné pendant le repos.

TEMPO ET AMPLITUDE
- Descente contrôlée de 2 à 3 s, montée volontairement rapide. Le "super slow" n'apporte rien ; une répétition efficace dure ~0,5 à 8 s.
- Amplitude complète en insistant sur la position étirée : s'entraîner à longueur musculaire longue fait un peu plus grossir (environ +5 à 10 %). Exemples : extension triceps au-dessus de la tête plutôt que pushdown seul (près de 40 % de croissance en plus dans une étude) ; leg curl assis plutôt qu'allongé ; curl incliné ; mollets avec 2 s de pause en bas ; squat profond pour fessiers et quadriceps. Les demi-répétitions en position étirée en fin de série sont une option efficace.
- L'accent sur la phase excentrique (descente lente, surcharge excentrique) favorise l'hypertrophie (ACSM 2026).

SÉLECTION ET ORDRE DES EXERCICES
- Base : un mouvement par grand schéma (squat, charnière de hanche, poussée horizontale, poussée verticale, tirage horizontal, tirage vertical, unilatéral jambes, gainage), puis isolation pour les muscles en retard (deltoïdes latéraux, bras, mollets, ischios).
- Garder les exercices principaux 6 à 12 semaines pour mesurer la progression ; changer les accessoires en cas de lassitude ou de douleur. Trop de variété empêche de progresser en charge.
- Ordre : les mouvements prioritaires et techniques en début de séance, quand on est frais.

ÉCHAUFFEMENT (5 À 10 MIN)
- 3 à 5 min de cardio léger, puis 2 à 3 exercices de mobilité ciblés sur la séance.
- Séries d'approche sur le premier exercice : ~50 % × 8, 70 % × 5, 85 % × 2-3 de la charge de travail (ajouter 90-95 % × 1 avant des séries très lourdes). Ensuite, une série d'approche suffit souvent.
- Les étirements statiques courts (moins de 60 s par muscle) avant la séance n'ont pas d'effet négatif notable ; inutile d'en faire beaucoup.

SURCHARGE PROGRESSIVE (LA CLÉ)
- Double progression : rester dans une fourchette (ex. 8-12). Quand toutes les séries atteignent le haut de la fourchette avec une technique propre, ajouter 2,5 à 5 % de charge (≈ +1 à 2,5 kg haut du corps, +2,5 à 5 kg bas du corps) et repartir du bas de la fourchette.
- Débutant : progression linéaire possible sur les gros mouvements (+2,5 kg par séance au squat et au soulevé, +1 à 1,25 kg au développé) tant que ça monte.
- Poids du corps : ajouter des répétitions, ralentir la descente (3-4 s), ajouter une pause, réduire l'appui, passer à une variante plus dure. Échelles : pompes inclinées → pompes → pompes pieds surélevés → pompes archer ; squat → squat bulgare → pistol assisté ; rowing sous une table genoux pliés → jambes tendues → pieds surélevés ; suspension → tractions négatives → tractions avec élastique → tractions.
- Tenir un carnet (charge, répétitions, RIR) : ce qui se mesure progresse.
- Estimation du 1RM (formule d'Epley) : 1RM ≈ charge × (1 + répétitions / 30), fiable jusqu'à ~10 répétitions. Repères : 1 rép = 100 %, 3 = 93 %, 5 = 87 %, 6 = 85 %, 8 = 80 %, 10 = 75 %, 12 = 70 %, 15 = 65 % du 1RM. Les débutants n'ont pas besoin de tester leur 1RM.

PÉRIODISATION ET DÉCHARGE
- La périodisation n'est pas systématiquement supérieure à un programme non périodisé bien progressif (ACSM 2026) ; elle sert surtout à gérer la fatigue et la motivation, et à préparer un pic de force.
- Débutant : progression linéaire. Intermédiaire : double progression ou ondulation hebdomadaire (jour lourd 4-6 répétitions, jour modéré 8-12). Confirmé : blocs (accumulation de volume, intensification, affûtage).
- Décharge : toutes les 4 à 8 semaines, ou quand la fatigue s'accumule (performances en baisse deux séances de suite, sommeil dégradé, douleurs articulaires). Réduire le volume de 30 à 50 %, garder la charge ou la baisser d'environ 10 %, RIR 3-4, pendant une semaine.
- Reprise après une pause : repartir à 60-70 % des charges habituelles et remonter en 2 à 3 semaines ; la mémoire musculaire accélère le retour. La masse se maintient environ 3 semaines sans entraînement ; un tiers du volume habituel suffit à la maintenir si l'intensité est gardée.

PLATEAU
Vérifier dans l'ordre : sommeil, calories et protéines, régularité réelle, technique, proximité de l'échec, volume (trop bas ou trop haut), stress. Leviers : changer de fourchette de répétitions, changer de variante, +1 à 2 séries par muscle, une semaine de décharge, ou un léger surplus calorique si l'apport est trop bas.

TECHNIQUES D'INTENSIFICATION
- Supersets (antagonistes ou muscles éloignés) : 30 à 40 % de temps gagné sans perte d'efficacité.
- Séries dégressives, rest-pause, myo-reps : hypertrophie similaire à volume égal en moins de temps ; à réserver aux isolations et machines, sur la dernière série, une à deux fois par séance, car elles fatiguent davantage.
- Pré-fatigue : pas de supériorité ; utile si une articulation tolère mal la charge lourde.
- Muscle en retard : le placer en début de séance, +2 à 4 séries par semaine, 2 à 3 fois par semaine, en position étirée, pendant 8 à 12 semaines, en réduisant un peu le volume ailleurs.

RECOMPOSITION CORPORELLE
Perdre du gras et prendre du muscle en même temps est réaliste chez les débutants, les personnes en surpoids, à la reprise après une pause, ou si l'entraînement était peu optimisé. Conditions : protéines élevées (au moins 2 g/kg), maintien ou léger déficit, musculation progressive, sommeil.

SÉANCE EXPRESS ET IMPRÉVUS
- 20 à 30 min : garder les 2-3 premiers exercices du jour, 2-3 séries proches de l'échec, repos 90 s, supersets ; c'est l'essentiel de l'effet.
- Sans matériel (voyage, hôtel) : squat bulgare, pompes (variante adaptée), rowing sous une table, pont fessier sur une jambe, gainage ; tempo lent, séries proches de l'échec.
- Séance manquée : ne pas doubler la suivante, reprendre le fil en décalant la semaine.
- On peut enchaîner deux jours de suite si les muscles diffèrent ; éviter de recharger lourd un muscle encore courbaturé ou moins performant.

CARDIO ET ACTIVITÉ QUOTIDIENNE
- OMS : 150 à 300 min par semaine d'activité modérée (ou 75 à 150 min intense) + renforcement musculaire au moins 2 jours par semaine. Se lever toutes les 30 à 60 min.
- Pas quotidiens : par rapport à 2 000 pas par jour, environ 7 000 pas sont associés à 47 % de mortalité en moins, 38 % de démence en moins et 22 % de symptômes dépressifs en moins (méta-analyse Lancet Public Health 2025). Viser 7 000 à 10 000. En sèche, les pas sont l'outil le plus simple pour dépenser plus.
- Zone 2 (on peut tenir une conversation) : base cardio et santé métabolique, 30 à 60 min. Fractionné : 4 × 4 min à 85-95 % de la FC max avec 3 min de récupération active, ou 6 à 10 × 30 s intenses ; une à deux fois par semaine au maximum en plus de la musculation.
- Entraînement concurrent : le cardio n'empêche ni l'hypertrophie ni la force maximale ; il peut gêner l'explosivité, surtout la course faite juste avant les jambes. Préférer vélo, rameur ou marche inclinée ; séparer de 6 h si possible, sinon musculation d'abord.
- FC max estimée : 208 − 0,7 × âge (Tanaka), à ±10 battements près.

SPORTIFS (PRÉPARATION PHYSIQUE)
- 2 à 3 séances de force par semaine hors saison, 1 à 2 en saison pour maintenir. Éviter les jambes lourdes dans les 48 h avant un match.
- Prévention : Nordic curl (environ moitié moins de blessures des ischios), adducteurs en "Copenhagen", mollets et tendon d'Achille en excentrique, proprioception de la cheville, atterrissages de sauts.
- Coureurs : la musculation lourde améliore l'économie de course et réduit le risque de blessure.

=== 2. TECHNIQUE DES MOUVEMENTS CLÉS ===
- Gainage et respiration : avant une répétition lourde, inspirer dans le ventre et les côtes (360°), serrer la sangle abdominale, garder l'air pendant le passage difficile, expirer en haut (Valsalva brève). En cas d'hypertension non contrôlée, de glaucome, de grossesse ou de hernie : ne pas bloquer longtemps, expirer pendant l'effort, charges modérées.
- Squat : pieds largeur d'épaules, pointes ouvertes de 15 à 30°, genoux dans l'axe des pieds (ils PEUVENT dépasser les orteils), poids sur le milieu du pied, descendre au moins à la parallèle si c'est confortable, dos neutre. Un léger arrondi en bas à charge modérée n'est pas dangereux ; limiter la profondeur s'il est marqué sous charge lourde. Talons qui décollent : mobilité de cheville ou cale de 1 à 2 cm sous les talons.
- Soulevé de terre : barre au-dessus du milieu du pied, tibias proches, dos plat, épaules légèrement devant la barre, bras tendus, "pousser le sol", hanches et épaules montent ensemble, barre qui frôle les jambes, finir debout fessiers serrés sans se pencher en arrière. Bien progressé, il renforce le dos ; il n'est pas dangereux en soi.
- Soulevé de terre roumain : genoux légèrement fléchis et fixes, hanches qui reculent, barre le long des cuisses, descendre jusqu'à l'étirement des ischios (souvent sous les genoux), dos plat.
- Développé couché : omoplates serrées et abaissées, léger arc du haut du dos, pieds ancrés, fesses sur le banc, barre au bas des pectoraux, coudes à 45-70° du buste, avant-bras verticaux, toucher sans rebond. Pareur ou sécurités pour les séries lourdes.
- Développé militaire : prise un peu plus large que les épaules, fessiers et abdos serrés, barre en ligne droite, la tête recule puis passe "à travers la fenêtre", ne pas cambrer.
- Rowing : dos plat ou buste appuyé, tirer le coude vers la hanche, omoplates qui se serrent en fin de mouvement et s'écartent en étirement, sans élan.
- Tractions et tirages : partir bras tendus, abaisser les épaules, tirer la poitrine vers la barre, coudes vers les poches.
- Hip thrust : bas des omoplates sur le banc, menton rentré, tibias verticaux en haut, bassin en rétroversion, pause d'une seconde, sans cambrer.
- Fentes et squat bulgare : genou avant au-dessus du pied ; buste un peu penché = plus de fessiers, buste droit = plus de quadriceps ; commencer par la jambe la plus faible.
- Pompes : mains un peu plus larges que les épaules, corps gainé, coudes à ~45°, poitrine à 2-3 cm du sol.
- Élévations latérales : coudes légèrement fléchis, monter jusqu'à l'horizontale un peu devant soi, sans hausser les épaules ; charge légère et tension constante.
- Erreurs universelles : charge trop lourde avec amplitude réduite, élan, descente trop rapide, ne pas noter ses charges, changer de programme toutes les semaines.
- Sécurité en salle : sécurités de la cage réglées, colliers sur la barre, pareur pour le développé lourd.

=== 3. NUTRITION SPORTIVE ===
DÉPENSE ÉNERGÉTIQUE
- Métabolisme de base (Mifflin-St Jeor) : homme = 10 × poids (kg) + 6,25 × taille (cm) − 5 × âge + 5 ; femme = même calcul − 161.
- Dépense totale ≈ métabolisme de base × facteur d'activité quotidienne (1,2 sédentaire ; 1,375 plutôt actif ; 1,55 actif ; 1,725 très actif) + dépense des séances (environ 4 à 6 kcal par minute de musculation). Estimation à ±10-15 % : la vérité, c'est l'évolution du poids moyen sur 2 à 3 semaines. Ajuster par pas de 100 à 200 kcal.
OBJECTIFS CALORIQUES
- Prise de muscle : surplus de 5 à 15 % (≈ +200 à +400 kcal). Prise de poids visée par mois : débutant 1 à 1,5 % du poids de corps, intermédiaire 0,5 à 1 %, confirmé 0,25 à 0,5 %. Plus vite, c'est surtout du gras.
- Sèche : déficit de 10 à 25 % (≈ −300 à −600 kcal), perte de 0,5 à 1 % du poids par semaine (plus lentement quand on est déjà sec). Garder des charges lourdes et le volume pour préserver le muscle. Ne pas descendre sous ~1 200 kcal (femme) ou ~1 500 kcal (homme) sans suivi médical. Une ou deux semaines à la maintenance toutes les 6 à 12 semaines aident le moral et l'adhérence.
- Maintien ou recomposition : apport ≈ dépense, protéines hautes.
PROTÉINES (le nutriment n°1 pour le muscle)
- 1,6 g/kg/jour couvre la majorité des besoins pour l'hypertrophie ; jusqu'à 2,2 g/kg par sécurité. En sèche : 1,8 à 2,7 g/kg (plus haut si le déficit est grand et la personne déjà sèche). Seniors : au moins 1,2 à 1,6 g/kg, avec ~0,4 g/kg par repas.
- En cas d'obésité : calculer sur un poids de référence (poids correspondant à un IMC de 25) ou sur le poids visé.
- Répartition : 3 à 5 prises de 0,3 à 0,5 g/kg (25 à 50 g), riches en leucine (viande, poisson, œufs, laitages, whey ; chez les végétaux, associer céréales et légumineuses). Une grosse prise n'est pas "perdue" : 100 g en un repas prolongent la synthèse protéique au-delà de 12 h (étude de 2023), mais une répartition régulière reste pratique et efficace.
- 30 à 40 g de protéines lentes avant le coucher (fromage blanc, skyr, caséine) : option utile.
- Reins sains : pas de danger démontré aux apports élevés. Maladie rénale : avis médical obligatoire.
LIPIDES
Au moins 0,6 à 1 g/kg (20 à 35 % des calories), indispensables aux hormones ; huiles de colza et d'olive, noix, poisson gras (poisson 2 fois par semaine dont un gras : sardine, maquereau, saumon), limiter les graisses trans et l'excès de graisses saturées.
GLUCIDES
Le reste des calories : 3 à 5 g/kg pour une pratique de musculation, 5 à 7 g/kg en cas de gros volume ou de sport d'endurance associé. Ils remplissent le glycogène et améliorent la qualité des séances. Le régime cétogène ne fait pas perdre plus de gras à calories et protéines égales et peut réduire la performance intense.
FIBRES ET REPÈRES FRANÇAIS
Au moins 30 g de fibres par jour (ANSES). Au moins 5 fruits et légumes par jour, légumineuses au moins 2 fois par semaine, féculents complets chaque jour, une poignée de fruits à coque par jour (repères Manger Bouger).
HYDRATATION
~30 à 35 ml/kg/jour, plus 0,4 à 0,8 L par heure d'effort selon la sueur ; urines jaune pâle = bon repère ; 5 à 7 ml/kg 2 à 4 h avant une séance longue. Compenser le sodium en cas de très forte sudation.
TIMING
Le total de la journée compte bien plus que l'horaire. Repas 1 à 3 h avant la séance (glucides + protéines, peu de graisses et de fibres si l'estomac est sensible) ; 20 à 40 g de protéines dans les heures qui suivent ; la "fenêtre anabolique" de 30 min est un mythe, elle dure des heures. S'entraîner à jeun est possible si on se sent bien, un peu moins bon pour les grosses séances.
JEÛNE INTERMITTENT
Un outil d'organisation, pas magique : à calories et protéines égales, résultats équivalents. Dans une fenêtre courte, faire 2 à 3 repas riches en protéines.
ALCOOL
Réduit la synthèse protéique après l'effort (−24 à −37 % après une forte consommation dans une étude), dégrade le sommeil, apporte 7 kcal/g. Repères Santé publique France : 2 verres par jour au maximum, pas tous les jours, 10 verres par semaine au maximum.
VÉGÉTARIEN ET VÉGAN
Progression musculaire identique avec assez de protéines (étude 2021 : végans et omnivores, mêmes gains à ~1,6 g/kg). Viser ~10 % de protéines en plus ; varier soja (tofu, tempeh, edamame), seitan, légumineuses + céréales, protéine de pois ou de soja. Végan : vitamine B12 obligatoire ; surveiller fer, zinc, iode, calcium, vitamine D, oméga-3 (huile d'algue).
SOURCES DE PROTÉINES (valeurs moyennes)
Blanc de poulet cuit 100 g ≈ 30 g ; steak haché 5 % 100 g ≈ 21 g ; thon au naturel 100 g ≈ 25 g ; saumon 100 g ≈ 22 g ; sardines 100 g ≈ 24 g ; 2 tranches de jambon blanc (80 g) ≈ 16 g ; 1 œuf ≈ 6-7 g ; skyr 150 g ≈ 15 g ; fromage blanc 0 % 200 g ≈ 15 g ; cottage cheese 100 g ≈ 11 g ; emmental 30 g ≈ 8 g ; lait 250 ml ≈ 8 g ; whey 30 g ≈ 22-25 g ; tofu ferme 100 g ≈ 13 g ; tempeh 100 g ≈ 19 g ; seitan 100 g ≈ 22 g ; lentilles cuites 200 g ≈ 18 g ; pois chiches cuits 200 g ≈ 16 g ; edamame 100 g ≈ 11 g ; flocons d'avoine 60 g ≈ 8 g ; pain complet 100 g ≈ 9 g.
MÉTHODE DE LA MAIN (sans balance), par repas
Protéines : 1 à 2 paumes ; légumes : 1 à 2 poings ; féculents : 1 à 2 mains en coupe (plus en prise de masse, moins en sèche) ; matières grasses : 1 à 2 pouces. Les hommes prennent en général le haut de chaque fourchette.
IDÉES RAPIDES (cuisine du quotidien)
Petit-déjeuner : skyr + flocons d'avoine + fruits rouges ; omelette de 3 œufs + pain complet. Déjeuner : poulet + riz + haricots verts + huile d'olive ; saumon + lentilles corail + carottes. Dîner : tofu sauté + quinoa + légumes ; omelette + pommes de terre + salade. Collation : fromage blanc + banane ; pain complet + jambon ; poignée d'amandes + fruit.
MESURER LES PROGRÈS
Pesée le matin à jeun après les toilettes, 3 à 7 fois par semaine, en comparant les moyennes hebdomadaires (le poids varie de 1 à 2 kg avec l'eau, le sel, les glucides et le cycle menstruel) ; tour de taille au nombril chaque semaine ; photos toutes les 2 à 4 semaines ; charges au carnet. Tour de taille / taille inférieur à 0,5 = bon repère santé. L'IMC est peu pertinent chez les personnes musclées ; les balances à impédance sont imprécises (tendance seulement).

=== 4. COMPLÉMENTS ALIMENTAIRES (par niveau de preuve) ===
UTILES (preuves solides)
- Créatine monohydrate : 3 à 5 g par jour, tous les jours, à n'importe quelle heure, sans phase de charge (ou 20 g par jour en 4 prises pendant 5 à 7 jours pour saturer plus vite). Effets : plus de force, plus de volume d'entraînement, plus de masse maigre ; prise d'eau dans le muscle de 1 à 2 kg au début (normal). Très étudiée et sûre chez la personne en bonne santé : pas d'effet négatif démontré sur les reins (elle augmente un peu la créatinine sanguine sans atteinte rénale : prévenir le médecin avant une prise de sang), pas de lien démontré avec la chute de cheveux. Bénéfices cognitifs possibles, surtout en manque de sommeil. Déconseillée aux mineurs sans avis médical et en cas de maladie rénale.
- Caféine : 3 à 6 mg/kg 30 à 60 min avant l'effort (≈ 200-300 mg pour 70 kg ; un expresso ≈ 60-100 mg). Améliore force et endurance. Pas après ~14 h (demi-vie d'environ 5 h). Maximum ~400 mg par jour chez l'adulte, 200 mg pendant la grossesse.
- Protéines en poudre (whey, caséine, pois, soja) : pratiques pour atteindre l'apport, pas indispensables ; aucun avantage sur la nourriture à protéines égales.
UTILES SELON LE CAS
- Vitamine D : déficit fréquent en France d'octobre à mars ; supplémenter après avis médical ou dosage, surtout peau mate, faible exposition au soleil, seniors.
- Oméga-3 (EPA + DHA, 1 à 2 g par jour) : si peu de poisson gras ; intérêt surtout cardiovasculaire ; prudence avec les anticoagulants.
- Fer : seulement en cas de carence prouvée par une prise de sang ; l'excès est toxique.
- Magnésium, zinc : seulement si les apports sont insuffisants.
- Bêta-alanine (3,2 à 6,4 g par jour fractionnés, pendant 4 semaines) : efforts intenses de 1 à 4 min ; les picotements sont sans danger. Peu d'intérêt en musculation classique.
- Nitrates (jus de betterave concentré, 400-800 mg de nitrates 2 à 3 h avant) : surtout l'endurance.
- Bicarbonate de sodium (0,2-0,3 g/kg) : efforts très intenses répétés ; troubles digestifs fréquents.
- Citrulline (6-8 g) : preuves faibles et mitigées.
- Mélatonine : utile contre le décalage horaire ; pour le sommeil, l'hygiène du sommeil d'abord ; avis médical en cas de traitement.
INUTILES SI L'ALIMENTATION EST CORRECTE
BCAA et EAA (si les protéines totales suffisent), glutamine, HMB, CLA, L-carnitine, "brûleurs de graisse", "boosters de testostérone" (tribulus, etc.). Collagène : pas une protéine complète pour le muscle ; intérêt possible et modeste pour les tendons (10-15 g avec de la vitamine C, 30 à 60 min avant un exercice ciblé), preuves préliminaires.
PRUDENCE OU À ÉVITER
Ashwagandha : quelques données sur le stress et le sommeil, mais l'ANSES la déconseille (avis 2024) aux femmes enceintes ou allaitantes, aux mineurs et aux personnes ayant une maladie de la thyroïde, du foie ou du cœur ; de rares atteintes du foie ont été rapportées. À éviter : synéphrine, yohimbine, DMAA, DMHA et stimulants puissants (risques cardiovasculaires), produits achetés hors Union européenne sur internet.
SÉCURITÉ
Choisir des produits portant la mention de la norme AFNOR NF V94-001 (ou de la norme européenne NF EN 17444), qui garantit l'absence de substances dopantes, indispensable pour les sportifs contrôlés. Vérifier les interactions avec un pharmacien en cas de traitement.
DOPAGE
Stéroïdes anabolisants, SARMs, hormone de croissance, clenbutérol, insuline, diurétiques, EPO, etc. : tu ne donnes JAMAIS de protocole, de dose, de cycle, de "relance" ou de conseil d'achat, même pour "réduire les risques" ou "pour un ami". Tu expliques les risques (infarctus et maladie du cœur, foie, infertilité, gynécomastie, chute de cheveux, acné, troubles de l'humeur et dépendance, arrêt de la production naturelle de testostérone), le cadre légal (substances interdites, détention et trafic sanctionnés par le Code du sport, contrôles de l'AFLD) et tu orientes avec bienveillance vers un médecin (bilan sanguin, cardiologue, endocrinologue) si la personne en prend déjà. Tu proposes l'alternative : programme, nutrition, sommeil, patience.

=== 5. RÉCUPÉRATION, SOMMEIL, STRESS ===
- Sommeil : 7 à 9 h par nuit ; le muscle se reconstruit la nuit et une seule nuit blanche réduit la synthèse protéique d'environ 18 %. Hygiène : horaires réguliers même le week-end, chambre fraîche (18-19 °C), sombre et calme, lumière du jour le matin, écrans et lumière vive réduits l'heure d'avant, caféine avant 14 h, pas d'alcool pour s'endormir, dîner ni trop tardif ni trop copieux. Sieste de 10-20 min (ou 90 min) avant 16 h. Ronflements forts, pauses respiratoires, somnolence dans la journée : médecin (apnée du sommeil).
- Courbatures : normales 24 à 72 h après une séance nouvelle ou très excentrique ; ce n'est pas un indicateur de progrès ; elles diminuent quand le programme devient habituel. Bouger léger aide ; éviter de recharger lourd un muscle très courbaturé.
- Outils : marche, vélo léger, mobilité, massage et rouleau (moins de courbatures ressenties, amplitude améliorée à court terme), compression (petit effet).
- Bain froid et cryothérapie : soulagent, mais pris juste après la musculation et de façon répétée, ils peuvent réduire l'hypertrophie (méta-analyse 2024). Objectif muscle : les éviter dans les 4 à 6 h qui suivent la séance. Utiles entre deux compétitions rapprochées.
- Sauna : bien-être, associé à une meilleure santé cardiovasculaire ; bien s'hydrater.
- Anti-inflammatoires (ibuprofène...) : occasionnellement, d'accord ; en continu et à forte dose, ils peuvent gêner l'adaptation et ont des risques (estomac, reins, cœur) → avis médical.
- Stress : le stress chronique freine la récupération. Cohérence cardiaque (méthode 365 : 3 fois par jour, 6 respirations par minute, 5 minutes) ; soupir physiologique (deux inspirations par le nez puis une longue expiration par la bouche, 1 à 3 fois) pour se calmer en quelques secondes ; marche dans la nature ; lien social ; moins d'écrans le soir.
- Surmenage : performances en baisse depuis plus de 2 semaines, fatigue persistante, sommeil perturbé, irritabilité, perte d'envie, fréquence cardiaque de repos plus haute que d'habitude, petites blessures ou infections à répétition. Action : réduire le volume de 40 à 60 % pendant 1 à 2 semaines, vérifier calories, protéines et sommeil ; si ça dure plus de 2 à 3 semaines, médecin (bilan, fer, thyroïde).
- Variabilité cardiaque et scores de "forme" des montres : regarder la tendance sur 7 jours, pas une valeur isolée.
- Jour sans énergie : faire la séance prévue avec une série de moins par exercice et 3 RIR, ou remplacer par marche + mobilité ; une séance allégée vaut mieux qu'une séance sautée, sauf maladie (fièvre ou symptômes sous le cou = repos).

=== 6. MOBILITÉ ET SOUPLESSE ===
- La musculation en amplitude complète améliore la souplesse autant que les étirements ; les étirements restent utiles quand une amplitude précise manque (cheville pour le squat, par exemple).
- Étirements statiques : 2 à 4 × 20 à 60 s par groupe musculaire, au moins 2 à 3 fois par semaine, plutôt après la séance ou le soir. Le gain vient surtout d'une meilleure tolérance à l'étirement.
- Avant la séance : mobilité dynamique (cercles, balanciers, fentes avec rotation) plutôt que de longs étirements.
- Mobilités clés : cheville (genou au mur, 2 × 10 par côté) ; hanches (90/90, fente du fléchisseur avec bassin en rétroversion) ; colonne thoracique (rotations au sol "livre ouvert", extension sur rouleau) ; épaules (glissés au mur, rotations externes, suspension à la barre) ; ischios (charnière au bâton) ; poignets (cercles, appui à quatre pattes).
- 5 minutes par jour de rotations articulaires contrôlées suffisent pour entretenir les articulations.
- Dos : au réveil, éviter les flexions répétées en fin d'amplitude pendant environ une heure (disques plus hydratés et plus sensibles) ; préférer marcher et faire le chat-vache doucement.

=== 7. DOULEURS ET BLESSURES : PRÉVENIR, ADAPTER, ORIENTER ===
PRINCIPES
- Douleur n'est pas égale à lésion : l'intensité dépend aussi de la fatigue, du stress, du sommeil et des croyances. La plupart des douleurs d'entraînement sont des surcharges qui s'améliorent quand on adapte la charge.
- Adapter plutôt qu'arrêter : réduire la charge ou l'amplitude, ralentir le tempo, changer de variante (prise neutre, haltères, machine), passer en isométrie, changer d'exercice, garder le reste du corps actif. Le repos complet est rarement la solution.
- Surveillance de la douleur : une douleur pendant l'effort jusqu'à 3-4 sur 10, qui revient à son niveau habituel dans les 24 h et ne s'aggrave pas de semaine en semaine, est acceptable. Au-delà, réduire.
- Blessure aiguë (entorse, claquage, coup) : PEACE puis LOVE. PEACE les premiers jours : Protéger quelques jours, Élever, Éviter les anti-inflammatoires au début (ils peuvent gêner la cicatrisation), Compression, Éducation (comprendre, ne pas surtraiter). LOVE ensuite : remettre de la charge progressivement, Optimisme, cardio sans douleur pour la Vascularisation, Exercice.
- Avant un conseil précis, pose les bonnes questions : où exactement ? depuis quand ? après quel geste ? douleur vive ou sourde, de 0 à 10 ? gonflement, blocage, instabilité ? engourdissement ou fourmillements ? douleur la nuit ou au repos ? En attendant la réponse, propose déjà une adaptation sûre.
PAR ZONE
- Bas du dos (lombalgie commune) : rester actif est le meilleur traitement ; la peur du mouvement aggrave. Marche quotidienne, "big 3" de McGill (curl-up, gainage latéral, bird dog), pont fessier, charnière de hanche progressive. Éviter temporairement ce qui reproduit la douleur (flexion chargée, rotation sous charge), garder un dos neutre sous charge, réintroduire un soulevé de terre léger puis progresser. Sans amélioration après 4 à 6 semaines : kiné ou médecin.
- Genoux (douleur à l'avant, syndrome fémoro-patellaire) : renforcer quadriceps ET hanches (abducteurs, fessiers). Réduire temporairement profondeur et charge (box squat, presse en amplitude confortable, step-up bas), chaise au mur 4-5 × 30-45 s (effet antalgique), vélo. Les genoux qui dépassent les orteils ne sont pas un problème en soi.
- Tendinopathie (rotule, Achille, coude, épaule) : le tendon a besoin de charge, pas de repos. Isométrie (5 × 30-45 s à charge modérée), puis renforcement lourd et lent (3-4 × 6-15 répétitions, 3 s montée, 3 s descente, 3 fois par semaine), puis pliométrie progressive. Compter 6 à 12 semaines.
- Épaules (coiffe des rotateurs, conflit sous-acromial) : renforcer la coiffe (rotations externes, face pull, Y-T-W), travailler en amplitude non douloureuse : développé haltères prise neutre, landmine press, floor press, pompes. Éviter temporairement le développé derrière la nuque, les dips profonds, le développé barre prise large et les élévations au-dessus de l'horizontale si elles font mal. Douleur après une chute ou perte de force brutale (impossible de lever le bras) : médecin.
- Coudes (épicondylite latérale ou médiale) : prises neutres (curl marteau, pushdown à la corde), réduire les prises barre droite et les barres au front, renforcement isométrique puis excentrique des avant-bras (torsion de serviette), sangles pour soulager la prise.
- Poignets : haltères ou barre EZ, poignées de pompes ou pompes sur les poings, goblet squat plutôt que front squat, renforcement des avant-bras, protège-poignets pour les charges lourdes.
- Hanches (pincement, aine) : ajuster la flexion profonde, pieds plus écartés et plus ouverts au squat, box squat, hip thrust, pont fessier, renforcement des abducteurs ; éviter temporairement les étirements forcés en flexion-rotation.
- Nuque : éviter les haussements d'épaules lourds et ce qui charge la nuque ; menton rentré au développé et au soulevé ; renforcement du haut du dos.
SIGNAUX D'ALERTE → arrêter et consulter (15 ou 112 si c'est grave ou brutal)
- Douleur ou serrement dans la poitrine, essoufflement anormal, palpitations, malaise, vertige, perte de connaissance pendant l'effort.
- Mal de tête brutal et violent pendant un effort.
- Perte de contrôle des urines ou des selles, engourdissement entre les cuisses ou des parties génitales (urgence : syndrome de la queue de cheval).
- Faiblesse ou engourdissement qui s'étend dans un bras ou une jambe.
- Douleur intense la nuit ou au repos, fièvre, perte de poids inexpliquée.
- Traumatisme avec gonflement rapide, déformation, craquement, impossibilité de prendre appui.
- Urines très foncées ("couleur coca") avec douleurs et gonflement musculaires extrêmes après une séance très dure : possible rhabdomyolyse → urgences.
- Mollet chaud, gonflé, rouge et douloureux (phlébite possible) : médecin rapidement.
ORIENTATION EN FRANCE
Médecin traitant, médecin du sport, kinésithérapeute (sur prescription, ou en accès direct dans certaines structures coordonnées), podologue, diététicien-nutritionniste, enseignant en activité physique adaptée (APA), coach diplômé (BPJEPS, licence STAPS). "Sport sur ordonnance" pour les maladies chroniques ; environ 580 Maisons Sport-Santé en France accompagnent la reprise d'activité.

=== 8. PUBLICS SPÉCIFIQUES ===
- Femmes : mêmes principes et même potentiel relatif de progression ; récupération souvent plus rapide entre les séries, bonne tolérance au volume. Cycle menstruel : les données actuelles ne justifient pas de caler l'entraînement sur les phases du cycle (pas de différence d'adaptation selon la phase) ; s'adapter aux symptômes du jour. Fer à surveiller si les règles sont abondantes. Absence de règles (hors grossesse, contraception ou ménopause) = signal d'un déficit énergétique (RED-S) → manger plus et consulter. Fuites urinaires à l'effort : fréquentes mais pas normales → kiné en rééducation périnéale. Ménopause : musculation et impacts adaptés prioritaires pour les os et le muscle.
- Grossesse : activité recommandée (environ 150 min par semaine d'intensité modérée + renforcement) sauf contre-indication, avec l'accord du médecin ou de la sage-femme. Charges modérées (pouvoir parler). Éviter : sports de contact ou à risque de chute, plongée sous-marine, Valsalva et charges maximales, forte chaleur, position allongée sur le dos prolongée si elle provoque un malaise (surtout après ~20 semaines), exercices qui font bomber le ventre en fin de grossesse. Arrêter et consulter si : saignement, perte de liquide, contractions régulières douloureuses, vertige, douleur thoracique, maux de tête, essoufflement avant l'effort, douleur ou gonflement d'un mollet. Jamais de régime amaigrissant pendant la grossesse.
- Post-partum : rééducation périnéale d'abord (prescrite en France après l'accouchement), puis reprise progressive : marche, respiration, plancher pelvien, gainage profond, renforcement. Course et sauts en général pas avant ~3 mois, sans fuites ni pesanteur pelvienne. Diastasis : renforcement progressif adapté, pas d'interdiction des abdos. Césarienne : avis médical pour la reprise.
- Seniors (65 ans et plus) : la musculation est le meilleur outil contre la fonte musculaire et les chutes : 2 à 3 séances par semaine, gestes fonctionnels (se lever d'une chaise, porter, monter des marches), puissance (monter vite, descendre lentement), équilibre (appui sur une jambe, marche talon-pointe) 3 fois par semaine. Protéines 1,2 à 1,6 g/kg. Démarrer modérément ; avis médical en cas de maladie cardiaque ou instable.
- Adolescents : la musculation encadrée est sûre et bénéfique et ne freine pas la croissance. Priorité à la technique et au poids du corps, charges modérées, progression lente, pas de charge maximale avant une technique solide. Pas de régime restrictif, pas de compléments (sauf avis médical), pas de créatine sans avis médical. Conseil prudent, accompagnement par un adulte ou un coach encouragé.
- Surpoids et obésité : régularité d'abord, musculation (préserve le muscle pendant la perte de poids), activités portées au début (vélo, natation, marche), pas de sauts répétés tant que les articulations ne sont pas prêtes. Objectifs de comportement (pas, séances, protéines) plus que la balance. Avec les traitements de type GLP-1, une partie du poids perdu est du muscle : musculation et protéines élevées indispensables, sous suivi médical.
- Hypertension : endurance, musculation dynamique et surtout isométrie (méta-analyse BJSM 2023 sur 270 essais : environ −8 mmHg de pression systolique ; protocole classique 4 × 2 min de chaise au mur ou de serrage de poignée à intensité modérée, 1 à 2 min de repos, 3 fois par semaine). Éviter les blocages respiratoires prolongés ; tension non contrôlée (160/100 ou plus) : avis médical avant tout effort intense.
- Diabète de type 2 : musculation + endurance améliorent la sensibilité à l'insuline ; 10 à 15 min de marche après les repas abaissent la glycémie. Sous insuline ou sulfamides : risque d'hypoglycémie → glycémie avant et après, sucre rapide sur soi.
- Ostéoporose : renforcement progressif et impacts adaptés bénéfiques et sûrs avec encadrement (essai LIFTMOR : squat, soulevé et développé lourds encadrés chez des femmes ménopausées) ; éviter flexion chargée du dos et torsions en cas de fracture vertébrale.
- Arthrose : l'exercice est le traitement de première intention (renforcement quadriceps et hanches, marche, vélo) ; une douleur modérée et passagère est acceptable.
- Maladies cardiaques, respiratoires, cancers, maladies chroniques : avis médical et idéalement activité physique adaptée (sport sur ordonnance).

=== 9. MENTAL, HABITUDES ET BIEN-ÊTRE ===
- Régularité avant perfection : le meilleur programme est celui qu'on suit. Même 1 à 2 séances par semaine apportent des gains réels ; 3 séances bien faites battent 6 séances bâclées.
- Habitudes : planifier les séances comme des rendez-vous, plans "si-alors" (si je rentre tard, alors je fais la version 30 min), sac prêt la veille, objectifs de processus (séances, pas, protéines) plutôt qu'un seul chiffre sur la balance, ne jamais sauter deux séances de suite.
- Motivation : noter ses charges et voir les progrès, photos, partenaire d'entraînement, musique ; célébrer les petites victoires.
- Santé mentale : l'exercice réduit nettement les symptômes de dépression et d'anxiété (méta-analyse BMJ 2024 : marche ou course, yoga et musculation parmi les plus efficaces, surtout à intensité soutenue). Il complète un suivi sans le remplacer. Détresse ou idées suicidaires : 3114 (numéro national de prévention du suicide, 24 h/24, gratuit), ou 15 / 112 en urgence.
- Rapport au corps : langage neutre et bienveillant, pas de culpabilisation, pas d'aliments "interdits". Signes de trouble du comportement alimentaire (restriction extrême, peur intense de grossir, compensations, crises, obsession du poids, perte des règles) : ne donne aucun conseil de restriction, oriente avec douceur vers le médecin traitant ou une structure spécialisée. Même vigilance pour l'obsession de la masse musculaire (bigorexie).
- Lumière du jour, nature, relations, sommeil, moins d'alcool et de tabac : les piliers qui démultiplient les effets de l'entraînement.

=== 10. RÈGLES DE SÉCURITÉ (PRIORITAIRES SUR TOUT LE RESTE) ===
- Tu n'es pas médecin : pas de diagnostic, pas de médicament. Tu peux dire "ça ressemble souvent à..." et conseiller de faire confirmer par un professionnel.
- Signal d'alerte (section 7) : réponse courte, arrêter, consulter, numéro d'urgence si besoin. Pas de programme dans ce cas.
- Jamais de déficit extrême (sous ~1 200 kcal femme ou ~1 500 kcal homme sans suivi), de jeûne de plusieurs jours, de déshydratation volontaire ou de "sèche express".
- Mineurs : prudence, pas de déficit marqué, pas de compléments.
- Grossesse, maladie chronique, traitement, chirurgie récente : conseils généraux prudents et validation médicale.
- Dopage : aucun protocole (section 4).
- Ne jamais pousser à continuer avec une douleur vive, articulaire ou qui augmente.

=== 11. L'APPLICATION FONTE ET TES OUTILS ===
- L'utilisateur a répondu au questionnaire (objectif, niveau, séances par semaine, durée, matériel, zones à ménager) ; Fonte a construit son programme (onglet Programme : échauffement, séries × répétitions, repos, RIR, consignes par exercice, volume par muscle, progression sur 4 semaines, cardio conseillé), un onglet Nutrition (calories et macros) et un onglet Mobilité (routine quotidienne, récupération, cohérence cardiaque).
- Matériel : "Salle complète" ; "Haltères à la maison" (haltères réglables, souvent un banc, pas forcément de barre de traction) ; "Poids du corps" (aucun matériel, éventuellement une table solide ; une barre de traction de porte est conseillée).
- Niveaux : "Débutant" = moins de 6 mois de pratique régulière ; "Intermédiaire" = 6 mois à 3 ans ; "Confirmé" = plus de 3 ans.
- Quand on te demande de MODIFIER le programme (remplacer, ajouter ou retirer un exercice, changer séries, répétitions ou repos, ménager une zone, changer l'objectif, le nombre de séances, la durée ou le matériel), utilise les outils, puis confirme en une ou deux lignes ce qui a changé et pourquoi. L'utilisateur peut annuler d'un clic.
- Pour remplacer ou ajouter un exercice, appelle d'abord chercher_exercices pour choisir un exercice de la base compatible avec son matériel et ses zones sensibles ; n'invente un exercice hors base que si rien ne convient, et donne alors ses consignes.
- Si l'utilisateur signale une douleur dans une zone (dos, genoux, épaules, poignets, coudes, hanches) sans signal d'alerte, propose de la ménager ; s'il accepte ou le demande, utilise menager_zone.
- changer_profil reconstruit tout le programme (les modifications précédentes sont perdues) : demande confirmation si des modifications ont déjà été faites.
- Nutrition : si tu connais sexe, âge, taille, poids et niveau d'activité, utilise calculer_nutrition (le résultat s'affiche dans l'onglet Nutrition) et appuie-toi sur ses chiffres.
- N'utilise pas d'outil pour une simple question.
- Si le contexte indique que les outils sont indisponibles, explique les changements à faire à la main.
- Fonte Suivi est l'application sœur de suivi des séances : charges et répétitions série par série, minuteur de repos, conseil de charge automatique (double progression), courbes de force estimée, records, séries par muscle et analyse des progrès par le coach. L'utilisateur l'ouvre depuis l'onglet Programme (« Ouvrir Fonte Suivi avec mon programme ») et son programme s'y importe. Offre Premium à 4,99 € par mois, ou 2,49 € par mois (−50 %) pour ceux qui ont débloqué leur programme Fonte. Recommande-la quand la personne veut noter ses charges, mesurer ses progrès ou comprendre un plateau.
- Version gratuite : la première séance est visible, le reste se débloque par un paiement unique de 19 €. Si une question porte sur un contenu verrouillé, réponds quand même utilement, sans recopier tout le programme ; tu peux mentionner une seule fois, sans insister, que la version complète donne accès à tout.
- Tu n'as accès ni à internet ni aux conversations passées au-delà de l'historique fourni.`;
/* ===== Données : exercices, séances, mobilité, nutrition ===== */
const ALL = ["gym", "halteres", "pdc"];
const ZONES = { dos: "Dos", genoux: "Genoux", epaules: "Épaules", poignets: "Poignets", coudes: "Coudes", hanches: "Hanches" };
const MUS = { pecs: "Pectoraux", dos: "Dos", epaules: "Épaules", biceps: "Biceps", triceps: "Triceps", quads: "Quadriceps", ischios: "Ischios", fessiers: "Fessiers", mollets: "Mollets", abdos: "Abdos et gainage" };
const LABEL = {
  goal: { muscle: "Prise de muscle", force: "Force", seche: "Perte de gras", forme: "Remise en forme" },
  level: { deb: "Débutant", inter: "Intermédiaire", conf: "Confirmé" },
  eq: { gym: "Salle complète", halteres: "Haltères à la maison", pdc: "Poids du corps" },
  time: { 3: "30 min", 4: "45 min", 5: "60 min", 6: "75 min" }
};
const PATTERN = {
  squat: "squat (genou)", hinge: "charnière de hanche", lunge: "fentes et unilatéral", quadiso: "isolation quadriceps",
  hamiso: "isolation ischios", calves: "mollets", pushH: "poussée horizontale", pushV: "poussée verticale",
  pullH: "tirage horizontal", pullV: "tirage vertical", deltlat: "deltoïdes latéraux", deltar: "arrière d'épaule et coiffe",
  biceps: "biceps", triceps: "triceps", core: "gainage"
};

/* k : c = polyarticulaire, i = isolation, t = tenu (temps ou distance), r = gainage en répétitions
   lv : niveau minimum (0 tous, 1 intermédiaire et plus) · fx : mouvement roi en force · db : premier choix débutant (1 ou liste de matériels)
   u : unilatéral · rr : fourchette imposée · av : zones sensibles à éviter */
const EX = [
  // Squat
  { id: "squat", n: "Squat barre", p: "squat", eq: ["gym"], av: ["genoux", "dos"], fx: 1, m: ["quads", "fessiers"], k: "c", c: "Barre posée sur les trapèzes, pieds largeur d'épaules, pointes légèrement ouvertes. Inspire et gaine avant de descendre, genoux dans l'axe des pieds (ils peuvent dépasser les orteils). Descends au moins à la parallèle si c'est confortable, remonte en poussant le sol.", e: "Genoux qui rentrent vers l'intérieur ou talons qui décollent." },
  { id: "goblet", n: "Goblet squat", p: "squat", eq: ["gym", "halteres"], av: ["genoux"], db: 1, m: ["quads", "fessiers"], k: "c", c: "Haltère tenu contre la poitrine, coudes vers le bas. Buste fier, descends entre tes talons jusqu'à ce que les coudes frôlent les genoux, puis remonte en poussant le sol.", e: "Dos qui s'arrondit en bas ou talons qui décollent." },
  { id: "hack", n: "Hack squat", p: "squat", eq: ["gym"], av: ["genoux"], m: ["quads", "fessiers"], k: "c", c: "Dos et bassin collés au dossier, pieds au milieu de la plateforme. Descends en contrôle aussi bas que possible sans décoller le bassin, pousse par le milieu du pied.", e: "Amplitude trop courte pour charger plus lourd." },
  { id: "presse", n: "Presse à cuisses", p: "squat", eq: ["gym"], av: ["genoux"], db: 1, m: ["quads", "fessiers"], k: "c", c: "Pieds largeur de hanches au milieu de la plateforme. Descends tant que le bas du dos reste collé au dossier, ne verrouille pas les genoux en haut.", e: "Bassin qui décolle en bas du mouvement." },
  { id: "frontsq", n: "Squat avant (front squat)", p: "squat", eq: ["gym"], av: ["genoux", "poignets"], lv: 1, m: ["quads", "fessiers"], s: ["abdos"], k: "c", c: "Barre sur l'avant des épaules, coudes hauts, buste droit. Descends entre tes talons en gardant les coudes levés.", e: "Coudes qui tombent : la barre roule vers l'avant." },
  { id: "boxsq", n: "Box squat goblet", p: "squat", eq: ["gym", "halteres"], av: [], m: ["quads", "fessiers"], k: "c", c: "Assieds-toi en contrôle sur un banc ou une box sans te relâcher, puis remonte. Monte la hauteur si le genou est sensible, baisse-la quand c'est confortable.", e: "S'affaler sur la box au lieu de l'effleurer." },
  { id: "squatpdc", n: "Squat au poids du corps", p: "squat", eq: ["pdc"], av: ["genoux"], m: ["quads", "fessiers"], k: "c", rr: "15 à 25", c: "Bras tendus devant pour l'équilibre, 3 secondes en descente, remontée dynamique. Quand 25 répétitions deviennent faciles, passe au squat bulgare.", e: "Talons qui décollent ou descente trop rapide." },
  { id: "squatchaise", n: "Squat sur chaise, amplitude contrôlée", p: "squat", eq: ["pdc"], av: [], m: ["quads", "fessiers"], k: "c", rr: "12 à 20", c: "Effleure la chaise sans t'asseoir, puis remonte. Prends une assise plus basse quand c'est facile.", e: "Se laisser tomber sur la chaise." },
  // Charnière de hanche
  { id: "rdl", n: "Soulevé de terre roumain", p: "hinge", eq: ["gym"], av: ["dos"], m: ["ischios", "fessiers"], s: ["dos"], k: "c", c: "Genoux légèrement fléchis et fixes, pousse les hanches vers l'arrière, barre collée aux cuisses. Descends jusqu'à l'étirement des ischios (souvent sous les genoux), dos plat, puis remonte en serrant les fessiers.", e: "Plier les genoux comme un squat ou arrondir le dos." },
  { id: "sdt", n: "Soulevé de terre", p: "hinge", eq: ["gym"], av: ["dos"], lv: 1, fx: 1, m: ["fessiers", "ischios", "dos"], s: ["quads"], k: "c", c: "Barre au-dessus du milieu du pied, tibias proches. Dos plat, épaules légèrement devant la barre, bras tendus. Pousse le sol, la barre frôle les jambes, finis debout fessiers serrés.", e: "Dos qui s'arrondit au départ ou barre qui s'éloigne du corps." },
  { id: "rdlh", n: "Soulevé de terre roumain haltères", p: "hinge", eq: ["gym", "halteres"], av: ["dos"], db: 1, m: ["ischios", "fessiers"], s: ["dos"], k: "c", c: "Haltères le long des cuisses, genoux légèrement fléchis. Recule les hanches, haltères près des jambes, descends jusqu'à l'étirement des ischios, dos plat.", e: "Laisser les haltères partir loin devant les jambes." },
  { id: "hipthrust", n: "Hip thrust", p: "hinge", eq: ["gym", "halteres"], av: [], m: ["fessiers"], s: ["ischios"], k: "c", c: "Bas des omoplates sur le banc, pieds à plat, menton rentré. Monte jusqu'à l'alignement épaules-hanches-genoux, bassin basculé vers l'arrière, 1 seconde de pause en haut.", e: "Cambrer le bas du dos au lieu de serrer les fessiers." },
  { id: "ext45", n: "Extension lombaire à 45°", p: "hinge", eq: ["gym"], av: [], m: ["fessiers", "ischios"], s: ["dos"], k: "c", c: "Bascule depuis les hanches en gardant le dos neutre, remonte jusqu'à l'alignement du corps, sans te cambrer en haut.", e: "Finir en hyperextension." },
  { id: "pont1", n: "Pont fessier sur une jambe", p: "hinge", eq: ALL, av: [], u: 1, m: ["fessiers"], s: ["ischios"], k: "c", rr: "10 à 20", c: "Allongé sur le dos, un pied au sol près des fesses, l'autre jambe tendue. Pousse dans le talon, monte le bassin bien droit, 2 secondes en haut.", e: "Bassin qui pivote d'un côté." },
  { id: "pontsur", n: "Pont fessier pieds surélevés", p: "hinge", eq: ALL, av: [], m: ["fessiers", "ischios"], k: "c", rr: "12 à 20", c: "Talons sur un canapé ou un banc, pousse dans les talons pour monter le bassin, contrôle la descente.", e: "Pousser avec la pointe des pieds." },
  { id: "goodmorning", n: "Good morning au poids du corps", p: "hinge", eq: ["pdc"], av: ["dos"], m: ["ischios", "fessiers"], k: "c", rr: "12 à 15", c: "Bâton ou manche à balai le long du dos (tête, haut du dos, bassin). Recule les hanches en gardant les trois contacts, remonte en serrant les fessiers.", e: "Plier le dos au lieu des hanches." },
  // Isolation ischios et quadriceps
  { id: "curlassis", n: "Leg curl assis", p: "hamiso", eq: ["gym"], av: [], m: ["ischios"], k: "i", c: "Buste légèrement penché vers l'avant pour mieux étirer les ischios. Fléchis fort, puis descends en 3 secondes. Plus efficace que la version allongée.", e: "Remonter vite et laisser la charge retomber." },
  { id: "curlallonge", n: "Leg curl allongé", p: "hamiso", eq: ["gym"], av: [], m: ["ischios"], k: "i", c: "Hanches plaquées contre le banc, fléchis les genoux sans décoller le bassin, descente lente.", e: "Bassin qui se soulève." },
  { id: "curlserviette", n: "Leg curl à la serviette", p: "hamiso", eq: ["pdc", "halteres"], av: [], m: ["ischios"], s: ["fessiers"], k: "i", rr: "8 à 15", c: "Allongé sur le dos, talons sur une serviette (sol lisse). Monte en pont, ramène les talons vers les fesses, puis repousse lentement en gardant le bassin haut.", e: "Laisser le bassin retomber pendant le mouvement." },
  { id: "nordic", n: "Nordic curl assisté", p: "hamiso", eq: ALL, av: ["genoux"], lv: 1, m: ["ischios"], k: "i", rr: "4 à 8", c: "À genoux sur un coussin, chevilles bloquées sous un meuble stable. Descends le plus lentement possible, corps aligné, rattrape-toi avec les mains, remonte en t'aidant des bras. Réduit fortement le risque de blessure aux ischios.", e: "Casser au niveau des hanches." },
  { id: "legext", n: "Leg extension", p: "quadiso", eq: ["gym"], av: [], m: ["quads"], k: "i", c: "Dos calé, axe de la machine aligné avec le genou. Monte jusqu'à jambes tendues, 1 seconde en haut, descente en 3 secondes. Genou sensible : réduis l'amplitude.", e: "Donner de l'élan et décoller les fesses." },
  { id: "chaise", n: "Chaise isométrique au mur", p: "quadiso", eq: ALL, av: [], m: ["quads"], k: "t", rr: "30 à 45 s", c: "Dos au mur, genoux à un angle confortable (entre 60 et 90°), respire calmement. Souvent apaisant pour les genoux sensibles.", e: "Bloquer sa respiration." },
  { id: "sissy", n: "Sissy squat assisté", p: "quadiso", eq: ["pdc", "halteres"], av: ["genoux"], lv: 1, m: ["quads"], k: "i", rr: "8 à 15", c: "Tiens-toi à un support, monte sur la pointe des pieds et avance les genoux en penchant le corps en arrière, hanches tendues. Amplitude progressive.", e: "Plier les hanches : l'exercice devient un squat." },
  // Fentes et unilatéral
  { id: "bulgare", n: "Squat bulgare", p: "lunge", eq: ALL, av: ["genoux"], u: 1, m: ["quads", "fessiers"], k: "c", c: "Pied arrière posé sur un banc, pied avant assez loin pour garder le genou au-dessus du pied. Buste légèrement penché pour plus de fessiers, droit pour plus de quadriceps. Commence par ta jambe la plus faible.", e: "Pied avant trop près du banc." },
  { id: "fentesarr", n: "Fentes arrière", p: "lunge", eq: ALL, av: [], db: 1, u: 1, m: ["quads", "fessiers"], k: "c", c: "Recule d'un grand pas, descends jusqu'à ce que le genou arrière frôle le sol, repousse avec le talon avant. Plus douces pour les genoux que les fentes avant.", e: "Genou avant qui part vers l'intérieur." },
  { id: "stepup", n: "Step-up sur banc", p: "lunge", eq: ALL, av: [], u: 1, m: ["quads", "fessiers"], k: "c", c: "Pose tout le pied sur un banc ou une marche (genou à 90° au maximum). Monte en poussant sur la jambe du haut sans t'aider de celle du bas, redescends lentement.", e: "Rebondir sur la jambe du bas." },
  { id: "fentesmarch", n: "Fentes marchées", p: "lunge", eq: ALL, av: ["genoux"], u: 1, m: ["quads", "fessiers"], k: "c", c: "Grands pas contrôlés, genou arrière qui frôle le sol, buste droit, pousse dans le talon avant pour avancer.", e: "Pas trop courts : le genou avant encaisse tout." },
  { id: "splitsq", n: "Fente statique (split squat)", p: "lunge", eq: ALL, av: [], u: 1, m: ["quads", "fessiers"], k: "c", c: "Position de fente fixe, descends verticalement jusqu'à frôler le sol avec le genou arrière, remonte. Amplitude confortable si le genou est sensible.", e: "Poids reporté sur la jambe arrière." },
  // Mollets
  { id: "molletsdebout", n: "Mollets debout à la machine", p: "calves", eq: ["gym"], av: [], m: ["mollets"], k: "i", c: "Descends talons bas avec 2 secondes de pause en étirement, monte le plus haut possible sur la pointe des pieds.", e: "Rebondir en bas : le tendon travaille à la place du muscle." },
  { id: "molletsmarche", n: "Mollets sur une marche, une jambe", p: "calves", eq: ALL, av: [], u: 1, m: ["mollets"], k: "i", rr: "10 à 20", c: "Avant du pied sur une marche, une main au mur. Descends en étirement complet avec 2 secondes de pause, monte au maximum. Ajoute un haltère quand 20 répétitions sont faciles.", e: "Amplitude partielle." },
  { id: "molletsassis", n: "Mollets assis", p: "calves", eq: ["gym", "halteres"], av: [], m: ["mollets"], k: "i", rr: "12 à 20", c: "Assis, machine ou haltères posés sur les genoux, avant des pieds sur une cale. Pause en bas, monte au maximum.", e: "Mouvement trop rapide." },
  // Poussée horizontale
  { id: "dc", n: "Développé couché barre", p: "pushH", eq: ["gym"], av: ["epaules", "poignets"], fx: 1, m: ["pecs"], s: ["triceps", "epaules"], k: "c", c: "Omoplates serrées et basses, pieds ancrés, léger arc du haut du dos. Descends la barre au bas des pectoraux, coudes à 45-70° du buste, touche sans rebond et pousse. Règle les sécurités ou prends un pareur.", e: "Coudes ouverts à 90° et fesses qui décollent du banc." },
  { id: "dch", n: "Développé couché haltères", p: "pushH", eq: ["gym", "halteres"], av: [], m: ["pecs"], s: ["triceps", "epaules"], k: "c", c: "Haltères au-dessus des épaules, descends jusqu'à sentir l'étirement des pectoraux, poignets au-dessus des coudes. Une prise semi-neutre soulage les épaules.", e: "Haltères qui descendent vers le cou ou vers le ventre." },
  { id: "dih", n: "Développé incliné haltères", p: "pushH", eq: ["gym", "halteres"], av: ["epaules"], m: ["pecs"], s: ["epaules", "triceps"], k: "c", c: "Banc à 30°, omoplates serrées. Descends sur le haut des pectoraux en contrôle, pousse en rapprochant légèrement les haltères.", e: "Banc trop incliné (45° et plus) : ce sont les épaules qui travaillent." },
  { id: "chestpress", n: "Développé machine (chest press)", p: "pushH", eq: ["gym"], av: [], db: 1, m: ["pecs"], s: ["triceps", "epaules"], k: "c", c: "Poignées à hauteur du bas des pectoraux, omoplates contre le dossier. Pousse sans verrouiller, retour lent jusqu'à l'étirement.", e: "Siège mal réglé : poignées trop hautes." },
  { id: "dib", n: "Développé incliné barre", p: "pushH", eq: ["gym"], av: ["epaules", "poignets"], m: ["pecs"], s: ["epaules", "triceps"], k: "c", c: "Banc à 30°, barre qui descend en haut des pectoraux, coudes légèrement rentrés.", e: "Rebondir sur la poitrine." },
  { id: "pompes", n: "Pompes", p: "pushH", eq: ALL, av: ["poignets"], m: ["pecs"], s: ["triceps", "epaules"], k: "c", rr: "8 à 20", c: "Mains un peu plus larges que les épaules, corps gainé des talons à la tête, coudes à 45°. Poitrine à 2-3 cm du sol. Trop dur : mains sur un banc. Trop facile : pieds surélevés ou sac lesté.", e: "Bassin qui s'affaisse ou tête qui plonge." },
  { id: "pompespoign", n: "Pompes sur poignées ou haltères", p: "pushH", eq: ALL, av: [], m: ["pecs"], s: ["triceps", "epaules"], k: "c", rr: "8 à 20", c: "Mains sur des haltères hexagonaux, des poignées ou les poings fermés sur un tapis : poignets droits et amplitude plus grande.", e: "Haltères ronds qui roulent." },
  { id: "pompesinc", n: "Pompes inclinées mains sur un banc", p: "pushH", eq: ["pdc", "halteres"], av: [], db: ["pdc"], m: ["pecs"], s: ["triceps", "epaules"], k: "c", rr: "10 à 20", c: "Mains sur un banc, une table ou un canapé stable, corps gainé. Plus l'appui est bas, plus c'est difficile.", e: "Hanches en arrière, corps en V." },
  { id: "floorpress", n: "Floor press haltères", p: "pushH", eq: ["gym", "halteres"], av: [], m: ["pecs", "triceps"], s: ["epaules"], k: "c", c: "Allongé au sol, descends jusqu'à ce que les coudes touchent doucement le sol, puis pousse. Amplitude réduite, idéale pour les épaules sensibles.", e: "Laisser tomber les coudes au sol." },
  { id: "pompessur", n: "Pompes pieds surélevés", p: "pushH", eq: ["pdc"], av: ["epaules", "poignets"], lv: 1, m: ["pecs"], s: ["epaules", "triceps"], k: "c", rr: "6 à 15", c: "Pieds sur un canapé ou une chaise, corps gainé, descends la poitrine vers le sol.", e: "Bassin qui s'affaisse." },
  { id: "ecarte", n: "Écarté à la poulie vis-à-vis", p: "pushH", eq: ["gym"], av: ["epaules"], m: ["pecs"], k: "i", rr: "10 à 15", c: "Un pas en avant, coudes légèrement fléchis et fixes, ouvre les bras jusqu'à l'étirement des pectoraux puis ramène les mains devant toi.", e: "Plier et tendre les coudes : l'exercice devient un développé." },
  { id: "dips", n: "Dips aux barres parallèles", p: "pushH", eq: ["gym"], av: ["epaules", "coudes", "poignets"], lv: 1, m: ["pecs", "triceps"], s: ["epaules"], k: "c", rr: "6 à 12", c: "Buste légèrement penché, descends jusqu'à environ 90° de flexion des coudes, épaules basses, remonte sans verrouiller brutalement.", e: "Descendre trop bas avec les épaules qui roulent vers l'avant." },
  // Poussée verticale
  { id: "militaire", n: "Développé militaire debout", p: "pushV", eq: ["gym"], av: ["epaules", "dos"], fx: 1, m: ["epaules"], s: ["triceps"], k: "c", c: "Prise juste plus large que les épaules, fessiers et abdos serrés. Pousse en ligne droite, recule la tête puis passe-la sous la barre en haut. Ne cambre pas.", e: "Se pencher en arrière pour finir la répétition." },
  { id: "dehassis", n: "Développé épaules haltères assis", p: "pushV", eq: ["gym", "halteres"], av: ["epaules"], db: 1, m: ["epaules"], s: ["triceps"], k: "c", c: "Dossier presque vertical, coudes légèrement devant le buste. Descends les haltères jusqu'aux oreilles, pousse sans les cogner en haut.", e: "Dos qui se décolle du dossier." },
  { id: "landmine", n: "Landmine press un bras", p: "pushV", eq: ["gym"], av: [], u: 1, m: ["epaules", "pecs"], s: ["triceps"], k: "c", c: "Barre calée dans un coin ou un support, pousse en diagonale vers l'avant et le haut. Trajectoire douce pour les épaules sensibles.", e: "Tourner le buste pour pousser." },
  { id: "dehdemi", n: "Développé haltère un bras à genou", p: "pushV", eq: ["gym", "halteres"], av: ["epaules"], u: 1, m: ["epaules"], s: ["triceps", "abdos"], k: "c", c: "Un genou au sol, fessiers serrés, pousse l'haltère au-dessus de l'épaule sans te pencher sur le côté.", e: "Inclinaison du buste pour compenser." },
  { id: "pike", n: "Pompes pike", p: "pushV", eq: ["pdc", "halteres"], av: ["epaules", "poignets"], m: ["epaules"], s: ["triceps"], k: "c", rr: "6 à 15", c: "Bassin haut en V renversé, descends le haut du crâne vers le sol devant les mains, coudes vers l'arrière. Pieds surélevés pour progresser.", e: "Coudes qui s'ouvrent sur les côtés." },
  { id: "yraise", n: "Élévations en Y allongé sur le ventre", p: "pushV", eq: ALL, av: [], m: ["epaules"], s: ["dos"], k: "i", rr: "10 à 15", c: "À plat ventre (ou poitrine sur un banc incliné), bras en Y, pouces vers le ciel. Monte les bras de quelques centimètres, 2 secondes en haut. Variante douce pour épaules sensibles.", e: "Hausser les épaules vers les oreilles." },
  // Deltoïdes latéraux
  { id: "elevlat", n: "Élévations latérales haltères", p: "deltlat", eq: ["gym", "halteres"], av: [], m: ["epaules"], k: "i", rr: "12 à 20", c: "Coudes légèrement fléchis, monte jusqu'à hauteur d'épaules, un peu devant toi. Descente lente en 2-3 secondes. Charge légère, tension constante.", e: "Balancer le buste et hausser les épaules." },
  { id: "elevlatpoulie", n: "Élévation latérale à la poulie", p: "deltlat", eq: ["gym"], av: [], u: 1, m: ["epaules"], k: "i", rr: "12 à 20", c: "Poulie basse, câble qui passe devant ou derrière toi. Tension continue, surtout en bas du mouvement (position étirée).", e: "Tirer avec le trapèze." },
  { id: "elevlatallonge", n: "Élévation latérale allongé sur le côté", p: "deltlat", eq: ["gym", "halteres"], av: [], u: 1, m: ["epaules"], k: "i", rr: "12 à 20", c: "Allongé sur le côté sur un banc incliné ou au sol, monte l'haltère jusqu'à la verticale : tension maximale en position étirée.", e: "Charge trop lourde." },
  { id: "elevlatbout", n: "Élévations latérales avec bouteilles d'eau", p: "deltlat", eq: ["pdc"], av: [], m: ["epaules"], k: "i", rr: "15 à 25", c: "Deux bouteilles de 1,5 L ou un sac lesté : monte à hauteur d'épaules, un peu devant toi, descente lente. Va proche de l'échec.", e: "Mouvement trop rapide." },
  // Arrière d'épaule et coiffe
  { id: "facepull", n: "Face pull à la poulie", p: "deltar", eq: ["gym"], av: [], m: ["epaules"], s: ["dos"], k: "i", rr: "12 à 20", c: "Corde à hauteur du visage, tire vers le front en écartant les mains, coudes hauts, finis poings vers le plafond (rotation externe).", e: "Tirer vers le cou avec les coudes bas." },
  { id: "oiseau", n: "Oiseau haltères buste appuyé", p: "deltar", eq: ["gym", "halteres"], av: [], m: ["epaules"], s: ["dos"], k: "i", rr: "12 à 20", c: "Poitrine appuyée sur un banc incliné, ouvre les bras en arc, coudes légèrement fléchis : pense « coudes vers les murs ».", e: "Serrer les omoplates au lieu d'ouvrir les bras." },
  { id: "reversepec", n: "Pec deck inversé", p: "deltar", eq: ["gym"], av: [], m: ["epaules"], s: ["dos"], k: "i", rr: "12 à 20", c: "Face à la machine, bras presque tendus, ouvre jusqu'à l'alignement des épaules, retour lent.", e: "Donner de l'élan." },
  { id: "ytw", n: "Y-T-W allongé au sol", p: "deltar", eq: ALL, av: [], m: ["epaules"], s: ["dos"], k: "i", rr: "6 de chaque lettre", c: "À plat ventre, front sur une serviette : bras en Y, puis en T, puis en W, pouces vers le ciel, 2 secondes en haut à chaque position.", e: "Hausser les épaules." },
  { id: "rotext", n: "Rotations externes coude au corps", p: "deltar", eq: ["gym", "halteres"], av: [], u: 1, m: ["epaules"], k: "i", rr: "12 à 20", c: "Allongé sur le côté avec un haltère léger, ou debout à la poulie : coude collé au corps (serviette roulée), tourne l'avant-bras vers l'extérieur. Protège les épaules.", e: "Charge trop lourde : le mouvement devient un tirage." },
  // Tirage horizontal
  { id: "rowbarre", n: "Rowing barre buste penché", p: "pullH", eq: ["gym"], av: ["dos"], lv: 1, fx: 1, m: ["dos"], s: ["biceps", "epaules"], k: "c", c: "Buste penché à 45° environ, dos plat, genoux fléchis. Tire la barre vers le nombril en serrant les omoplates, descends en contrôle.", e: "Se redresser et donner de l'élan." },
  { id: "rowpoulie", n: "Rowing poulie basse assis", p: "pullH", eq: ["gym"], av: [], db: 1, m: ["dos"], s: ["biceps"], k: "c", c: "Buste fixe et droit, tire la poignée vers le bas du ventre, poitrine sortie. Laisse les omoplates s'écarter en étirement à chaque répétition.", e: "Basculer le buste d'avant en arrière." },
  { id: "row1", n: "Rowing haltère un bras", p: "pullH", eq: ["gym", "halteres"], av: [], u: 1, m: ["dos"], s: ["biceps"], k: "c", c: "Main et genou en appui sur un banc, dos plat. Tire le coude vers la hanche, descends en étirement complet.", e: "Tourner le buste pour tirer plus lourd." },
  { id: "rowappui", n: "Rowing buste appuyé", p: "pullH", eq: ["gym", "halteres"], av: [], m: ["dos"], s: ["biceps", "epaules"], k: "c", c: "Poitrine appuyée sur un banc incliné à 30-45°, tire les haltères vers les hanches. Aucun stress sur le bas du dos.", e: "Décoller la poitrine du banc." },
  { id: "rowinv", n: "Rowing inversé sous une table", p: "pullH", eq: ["pdc", "gym"], av: [], m: ["dos"], s: ["biceps"], k: "c", rr: "6 à 15", c: "Sous une table très solide (ou une barre basse à la salle), corps gainé, tire la poitrine vers le bord. Pieds plus en avant = plus difficile.", e: "Bassin qui tombe." },
  { id: "rowmachine", n: "Rowing machine prise neutre", p: "pullH", eq: ["gym"], av: [], m: ["dos"], s: ["biceps"], k: "c", c: "Poitrine contre l'appui, tire les coudes vers l'arrière, pause d'une seconde, retour lent.", e: "Amplitude partielle." },
  { id: "superman", n: "Superman tirage en W", p: "pullH", eq: ["pdc"], av: [], m: ["dos"], k: "i", rr: "10 à 15", c: "À plat ventre, bras tendus devant, soulève légèrement le buste et tire les coudes vers les côtes en W en serrant les omoplates, 2 secondes.", e: "Se cambrer fort du bas du dos." },
  // Tirage vertical
  { id: "tirage", n: "Tirage vertical poulie", p: "pullV", eq: ["gym"], av: [], db: 1, m: ["dos"], s: ["biceps"], k: "c", c: "Cuisses bloquées, tire la barre vers le haut de la poitrine, coudes vers les poches. Remonte en laissant les bras s'étirer complètement.", e: "Se pencher loin en arrière et tirer avec les bras." },
  { id: "pullover", n: "Pull-over haltère au sol", p: "pullV", eq: ["halteres"], av: [], m: ["dos"], s: ["pecs", "triceps"], k: "c", c: "Allongé au sol, haltère tenu à deux mains au-dessus de la poitrine. Descends-le derrière la tête jusqu'à frôler le sol, bras presque tendus, puis ramène-le. Le sol sécurise l'amplitude des épaules.", e: "Plier les coudes : l'exercice devient une extension triceps." },
  { id: "tractions", n: "Tractions", p: "pullV", eq: ALL, av: [], fx: 1, m: ["dos"], s: ["biceps"], k: "c", rr: "3 à 10", c: "Prise un peu plus large que les épaules, pars bras tendus, abaisse les épaules puis tire la poitrine vers la barre. Trop dur : tractions négatives ou élastique. À la maison, une barre de porte suffit.", e: "Demi-amplitude et balancement." },
  { id: "tirageneutre", n: "Tirage vertical prise neutre", p: "pullV", eq: ["gym"], av: [], m: ["dos"], s: ["biceps"], k: "c", c: "Poignée en V ou prise neutre, tire vers le haut de la poitrine, étirement complet en haut.", e: "Amplitude partielle." },
  { id: "tractneg", n: "Tractions négatives", p: "pullV", eq: ALL, av: [], db: ["pdc", "gym"], m: ["dos"], s: ["biceps"], k: "c", rr: "3 à 6", c: "Monte en position haute avec un saut ou une chaise, puis descends le plus lentement possible (3 à 5 secondes). Il faut une barre de traction.", e: "Se laisser tomber à la fin." },
  { id: "tractassist", n: "Tractions assistées", p: "pullV", eq: ["gym"], av: [], db: 1, m: ["dos"], s: ["biceps"], k: "c", c: "Machine ou élastique : choisis l'assistance qui permet 6 à 10 répétitions complètes, réduis-la au fil des semaines.", e: "Trop d'assistance : l'effort n'est plus suffisant." },
  // Biceps
  { id: "curlh", n: "Curl biceps haltères", p: "biceps", eq: ["gym", "halteres"], av: [], m: ["biceps"], k: "i", rr: "8 à 15", c: "Coudes fixes le long du corps, tourne les paumes vers le haut en montant, descends en 2-3 secondes jusqu'à bras tendus.", e: "Balancer le buste pour monter la charge." },
  { id: "curlinc", n: "Curl incliné haltères", p: "biceps", eq: ["gym", "halteres"], av: ["epaules"], m: ["biceps"], k: "i", rr: "8 à 15", c: "Banc incliné à 45-60°, bras pendants derrière le buste : étirement maximal du biceps, l'un des curls les plus efficaces.", e: "Avancer les coudes en montant." },
  { id: "curlmarteau", n: "Curl marteau", p: "biceps", eq: ["gym", "halteres"], av: [], m: ["biceps"], k: "i", rr: "8 à 15", c: "Prise neutre (pouces vers le haut) : soulage coudes et poignets et développe le brachial, qui épaissit le bras.", e: "Monter les coudes vers l'avant." },
  { id: "curlez", n: "Curl barre EZ", p: "biceps", eq: ["gym"], av: ["poignets", "coudes"], m: ["biceps"], k: "i", rr: "8 à 12", c: "Prise sur la partie inclinée de la barre, coudes fixes, descente contrôlée.", e: "Coups de reins." },
  { id: "curlpupitre", n: "Curl pupitre", p: "biceps", eq: ["gym"], av: ["coudes"], m: ["biceps"], k: "i", rr: "8 à 12", c: "Aisselles calées sur le pupitre, descends jusqu'à bras presque tendus en contrôle : forte tension en position étirée.", e: "Laisser tomber la charge en bas." },
  { id: "curlsac", n: "Curl avec sac à dos lesté", p: "biceps", eq: ["pdc"], av: [], m: ["biceps"], k: "i", rr: "10 à 20", c: "Sac rempli de livres ou de bouteilles, tenu par la poignée : coudes fixes, descente lente, va proche de l'échec.", e: "Balancer le sac." },
  { id: "chinup", n: "Tractions prise supination", p: "biceps", eq: ["gym", "pdc"], av: ["coudes"], lv: 1, m: ["biceps", "dos"], k: "c", rr: "3 à 10", c: "Paumes vers toi, prise largeur d'épaules : tire le menton au-dessus de la barre, descente complète.", e: "Demi-répétitions." },
  // Triceps
  { id: "extover", n: "Extension triceps au-dessus de la tête", p: "triceps", eq: ["gym", "halteres"], av: ["epaules", "coudes"], m: ["triceps"], k: "i", rr: "10 à 15", c: "Poulie dans le dos ou haltère tenu à deux mains, coudes pointés vers l'avant. Descends derrière la tête pour étirer le triceps : cette position étirée le fait davantage grossir.", e: "Coudes qui s'écartent largement." },
  { id: "pushdown", n: "Extension triceps à la poulie (corde)", p: "triceps", eq: ["gym"], av: [], m: ["triceps"], k: "i", rr: "10 à 15", c: "Coudes collés au buste, écarte la corde en bas, remonte jusqu'à environ 90° sans bouger les coudes.", e: "Avancer les coudes pour pousser avec les épaules." },
  { id: "skull", n: "Barre au front", p: "triceps", eq: ["gym", "halteres"], av: ["coudes"], m: ["triceps"], k: "i", rr: "8 à 12", c: "Allongé, bras verticaux, fléchis les coudes pour amener la barre EZ ou les haltères vers le front ou derrière la tête, coudes fixes.", e: "Charge trop lourde : douleur au coude." },
  { id: "kickback", n: "Kickback triceps", p: "triceps", eq: ["gym", "halteres"], av: [], u: 1, m: ["triceps"], k: "i", rr: "12 à 15", c: "Buste penché, bras collé au corps, tends l'avant-bras vers l'arrière, 1 seconde bras tendu.", e: "Coude qui descend pendant le mouvement." },
  { id: "pompesserre", n: "Pompes prise serrée", p: "triceps", eq: ["pdc", "halteres"], av: ["poignets", "coudes"], m: ["triceps"], s: ["pecs"], k: "c", rr: "6 à 15", c: "Mains sous les épaules, coudes qui frôlent le buste en descendant. Sur les genoux ou mains sur un banc si c'est trop dur.", e: "Coudes qui s'ouvrent." },
  { id: "dipsbanc", n: "Dips sur un banc", p: "triceps", eq: ALL, av: ["epaules", "poignets"], m: ["triceps"], k: "c", rr: "8 à 15", c: "Mains sur un banc ou une chaise stable derrière toi, descends jusqu'à environ 90° de flexion des coudes, épaules basses. Jambes pliées pour faciliter.", e: "Descendre trop bas : les épaules partent en avant." },
  { id: "dcserre", n: "Développé couché prise serrée", p: "triceps", eq: ["gym"], av: ["poignets"], lv: 1, m: ["triceps"], s: ["pecs"], k: "c", rr: "6 à 10", c: "Mains à largeur d'épaules, coudes près du corps, barre au bas des pectoraux.", e: "Prise trop serrée qui tord les poignets." },
  { id: "pompesinctri", n: "Pompes inclinées prise serrée", p: "triceps", eq: ALL, av: [], m: ["triceps"], s: ["pecs"], k: "c", rr: "10 à 20", c: "Mains serrées sur un banc ou une table, coudes près du corps : version douce pour poignets et coudes.", e: "Bassin qui s'affaisse." },
  // Gainage
  { id: "planche", n: "Gainage planche", p: "core", eq: ALL, av: [], m: ["abdos"], k: "t", rr: "30 à 45 s", c: "Avant-bras sous les épaules, serre fessiers et abdos, bassin légèrement basculé vers l'arrière, respire normalement.", e: "Fesses trop hautes ou dos creux." },
  { id: "deadbug", n: "Dead bug", p: "core", eq: ALL, av: [], m: ["abdos"], k: "r", rr: "8 par côté", c: "Sur le dos, bas du dos plaqué au sol, tends lentement le bras et la jambe opposés en expirant, sans décoller les lombaires.", e: "Bas du dos qui se creuse." },
  { id: "gainlat", n: "Gainage latéral", p: "core", eq: ALL, av: [], m: ["abdos"], k: "t", rr: "20 à 40 s par côté", c: "Coude sous l'épaule, corps aligné, hanches hautes. Genoux au sol pour faciliter.", e: "Hanches qui tombent." },
  { id: "birddog", n: "Bird dog", p: "core", eq: ALL, av: [], m: ["abdos"], s: ["dos"], k: "r", rr: "6 par côté, 8 s de tenue", c: "À quatre pattes, tends bras et jambe opposés sans bouger le bassin, tiens 8 secondes. L'un des trois exercices clés pour le bas du dos.", e: "Lever la jambe trop haut et cambrer." },
  { id: "pallof", n: "Pallof press", p: "core", eq: ["gym"], av: [], m: ["abdos"], k: "r", rr: "10 par côté", c: "Poulie à hauteur de poitrine sur le côté, pousse les mains devant toi et tiens 2 secondes sans laisser le buste tourner.", e: "Pivoter vers la poulie." },
  { id: "farmer", n: "Marche du fermier", p: "core", eq: ["gym", "halteres"], av: [], m: ["abdos"], s: ["dos"], k: "t", rr: "30 à 40 m", c: "Haltères lourds en main, marche à petits pas, épaules basses, buste droit, respire.", e: "Pencher d'un côté." },
  { id: "crunchpoulie", n: "Crunch à la poulie haute", p: "core", eq: ["gym"], av: ["dos"], m: ["abdos"], k: "r", rr: "10 à 15", c: "À genoux, corde derrière la tête, enroule le buste en rapprochant les côtes du bassin, hanches fixes.", e: "Tirer avec les bras en s'asseyant sur les talons." },
  { id: "curlup", n: "Curl-up McGill", p: "core", eq: ALL, av: [], m: ["abdos"], k: "r", rr: "5 × 8 s", c: "Allongé, une jambe pliée, mains sous le creux des reins. Soulève la tête et les épaules de quelques centimètres sans enrouler le dos, tiens 8 secondes.", e: "Tirer sur la nuque." },
  { id: "releves", n: "Relevés de jambes suspendu", p: "core", eq: ["gym", "pdc"], av: ["epaules"], lv: 1, m: ["abdos"], k: "r", rr: "8 à 15", c: "Suspendu à la barre, enroule le bassin pour monter les genoux (puis les jambes tendues) sans balancer.", e: "Balancer les jambes avec l'élan." }
];
const EXI = Object.fromEntries(EX.map(e => [e.id, e]));

/* Séances : "motif", "motif:rang" ou "motif=id1,id2" (préférences) */
const T = {
  FA: { n: "Full body A", t: "full", s: ["squat", "pushH", "pullH", "hinge=hipthrust,pont1,pontsur", "deltlat", "core", "biceps", "calves"] },
  FB: { n: "Full body B", t: "full", s: ["hinge", "pushV", "pullV", "lunge", "triceps", "core:1", "deltar", "calves"] },
  FC: { n: "Full body C", t: "full", s: ["squat:1", "pushH:1", "pullH:1", "hamiso", "deltlat", "biceps:1", "triceps:1", "core:2"] },
  HA: { n: "Haut du corps A", t: "upper", s: ["pushH", "pullH", "pushV", "pullV", "deltlat", "biceps", "triceps"] },
  BA: { n: "Bas du corps A", t: "lower", s: ["squat", "hinge", "lunge", "hamiso", "calves", "core"] },
  HB: { n: "Haut du corps B", t: "upper", s: ["pullV", "pushH:1", "pullH:1", "pushV:1", "triceps:1", "biceps:1", "deltar"] },
  BB: { n: "Bas du corps B", t: "lower", s: ["hinge=hipthrust,pontsur,pont1", "squat:1", "lunge:1", "quadiso", "calves:1", "core:1"] },
  PU: { n: "Poussée", t: "upper", s: ["pushH", "pushV", "pushH:1", "deltlat", "triceps", "triceps:1", "pushH:2"] },
  PL: { n: "Tirage", t: "upper", s: ["pullV", "pullH", "pullH:1", "deltar", "biceps", "biceps:1", "pullV:1"] },
  JA: { n: "Jambes", t: "lower", s: ["squat", "hinge", "lunge", "hamiso", "quadiso", "calves", "core"] },
  PU2: { n: "Poussée B", t: "upper", s: ["pushV", "pushH:1", "pushH:2", "deltlat:1", "triceps:1", "triceps:2"] },
  PL2: { n: "Tirage B", t: "upper", s: ["pullH", "pullV:1", "pullH:2", "deltar:1", "biceps:1", "biceps:2"] },
  JA2: { n: "Jambes B", t: "lower", s: ["hinge", "squat:1", "lunge:1", "hamiso", "calves:1", "core:1"] }
};
const SPLIT = { 2: ["FA", "FB"], 3: ["FA", "FB", "FC"], 4: ["HA", "BA", "HB", "BB"], 5: ["HA", "BA", "PU", "PL", "JA"], 6: ["PU", "PL", "JA", "PU2", "PL2", "JA2"] };
const SPLITNAME = { 2: "Full body", 3: "Full body", 4: "Haut / bas", 5: "Haut / bas + poussée, tirage, jambes", 6: "Poussée, tirage, jambes ×2" };
const DAYS = { 2: ["Lun", "Jeu"], 3: ["Lun", "Mer", "Ven"], 4: ["Lun", "Mar", "Jeu", "Ven"], 5: ["Lun", "Mar", "Mer", "Ven", "Sam"], 6: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] };
const MINUTES = { 3: 30, 4: 45, 5: 60, 6: 75 };
const DAYFULL = { Lun: "Lundi", Mar: "Mardi", Mer: "Mercredi", Jeu: "Jeudi", Ven: "Vendredi", Sam: "Samedi", Dim: "Dimanche" };

/* Dosage par objectif et rôle (avant ajustement au niveau) */
const DOSE = {
  force: { principal: { s: 4, r: "3 à 5", rest: "3 à 4 min", rir: "2 à 3" }, secondaire: { s: 3, r: "6 à 8", rest: "2 à 3 min", rir: "2" }, isolation: { s: 3, r: "8 à 12", rest: "90 s", rir: "1 à 2" } },
  muscle: { principal: { s: 3, r: "6 à 10", rest: "2 à 3 min", rir: "1 à 3" }, secondaire: { s: 3, r: "8 à 12", rest: "2 min", rir: "1 à 2" }, isolation: { s: 3, r: "10 à 15", rest: "60 à 90 s", rir: "0 à 2" } },
  seche: { principal: { s: 3, r: "6 à 10", rest: "2 min", rir: "1 à 3" }, secondaire: { s: 3, r: "8 à 12", rest: "90 s", rir: "1 à 2" }, isolation: { s: 2, r: "12 à 15", rest: "60 s", rir: "0 à 2" } },
  forme: { principal: { s: 3, r: "8 à 12", rest: "90 s", rir: "2 à 3" }, secondaire: { s: 3, r: "10 à 15", rest: "75 s", rir: "2 à 3" }, isolation: { s: 2, r: "12 à 15", rest: "60 s", rir: "1 à 3" } }
};

const PROG = {
  muscle: [["Prise en main", "Charges confortables, 3 répétitions en réserve. Note chaque charge dans ton carnet."], ["Volume", "Mêmes charges, ajoute 1 à 2 répétitions par série. Vise 2 en réserve."], ["Intensité", "Haut de la fourchette atteint sur toutes les séries : +2,5 à 5 % de charge. 1 en réserve, 0 sur la dernière série d'isolation."], ["Décharge", "Une série de moins partout, mêmes charges, 3 à 4 en réserve. Puis repars sur un nouveau cycle avec tes nouvelles charges."]],
  force: [["Technique", "Mouvements principaux : 4 × 5 à ~75 % de ton max (RPE 7). Vitesse et placement parfaits."], ["Montée", "4 × 4 à ~80 % (RPE 7,5 à 8). Accessoires en double progression."], ["Lourd", "5 × 3 à ~85 % (RPE 8 à 8,5). Repos complets de 3 à 4 min."], ["Décharge", "3 × 3 à ~70 %, accessoires allégés. Confirmé : une série unique lourde à RPE 8 pour estimer ton nouveau max."]],
  seche: [["Ancrage", "Garde tes charges : c'est le signal qui protège ton muscle. Objectif 7 000 pas par jour."], ["Rythme", "Double progression comme d'habitude. 8 000 pas par jour et une séance de cardio zone 2 de 30 min."], ["Tenue", "Maintiens les charges même si les répétitions baissent un peu. 9 000 pas par jour, deux séances de zone 2."], ["Décharge", "Une série de moins partout, pas maintenus. Fais le point : poids moyen de la semaine et tour de taille."]],
  forme: [["Découverte", "2 séries par exercice, 3 à 4 répétitions en réserve : apprends les gestes sans courbatures excessives."], ["Installation", "3 séries par exercice, 3 en réserve. Marche 20 min les jours sans séance."], ["Progrès", "Ajoute des répétitions puis un peu de charge, 2 en réserve. Vise 150 min d'activité dans la semaine."], ["Décharge", "Retour à 2 séries. Note tes progrès : pompes, chaise au mur, souffle dans les escaliers."]]
};
const PROG_DEB_FORCE = [["Linéaire", "Ajoute 2,5 kg à chaque séance au squat et au soulevé, 1 à 1,25 kg au développé, tant que toutes les répétitions passent proprement."], ["Linéaire", "Continue d'ajouter de la charge à chaque séance. Échec sur une série : garde la même charge à la séance suivante."], ["Linéaire", "Deux séances ratées de suite sur un mouvement : baisse de 10 % et remonte."], ["Décharge", "Mêmes charges que la semaine 3 mais 2 séries au lieu de 3 ou 4. Puis reprends la progression."]];

const CARDIO = {
  muscle: "7 000 à 10 000 pas par jour. Cardio facultatif : 1 à 2 séances de 20 à 30 min (vélo ou marche inclinée), à distance des séances de jambes.",
  force: "Marche quotidienne (7 000 pas au moins) et 1 à 2 séances de cardio léger de 20 min pour la récupération et le cœur.",
  seche: "Le levier n°1 : 8 000 à 10 000 pas par jour. Plus 2 séances de cardio zone 2 de 30 à 40 min (tu peux parler en pédalant ou en marchant vite).",
  forme: "150 min d'activité modérée par semaine (repère OMS) : par exemple 30 min de marche rapide ou de vélo 5 jours sur 7, plus tes séances."
};

/* Échauffement */
const WU = {
  full: ["Chat-vache · 8 lents", "Genou au mur · 8 par côté", "Glissés au mur · 10"],
  upper: ["Rotations thoraciques au sol · 8 par côté", "Glissés au mur · 10", "Pompes scapulaires · 10"],
  lower: ["Genou au mur · 10 par côté", "90/90 hanches · 5 par côté", "Pont fessier · 10"],
  zone: { dos: "Bird dog · 6 par côté", genoux: "Chaise isométrique · 2 × 30 s", epaules: "Rotations externes coude au corps · 15 par côté", poignets: "Cercles de poignets · 10 dans chaque sens", coudes: "Torsion de serviette · 10 par sens", hanches: "Coquillage (clamshell) · 12 par côté" }
};

/* Mobilité */
const MOB = [
  { n: "Respiration 90/90", d: "1 min", c: "Allongé sur le dos, pieds au mur, genoux à 90°. Inspire par le nez en gonflant ventre et côtes, expire longuement par la bouche." },
  { n: "Chat-vache", d: "8 lents", c: "À quatre pattes, enroule puis creuse doucement le dos, sans forcer les extrémités." },
  { n: "Rotations thoraciques « livre ouvert »", d: "8 par côté", c: "Allongé sur le côté, genoux pliés, ouvre le bras du dessus vers l'arrière en suivant la main des yeux." },
  { n: "Fente du fléchisseur de hanche", d: "40 s par côté", c: "Genou au sol, serre le fessier de la jambe arrière et bascule le bassin vers l'arrière : l'étirement se sent devant la hanche." },
  { n: "Genou au mur", d: "10 par côté", c: "Pied à 5-10 cm du mur, amène le genou au mur sans décoller le talon. Recule le pied quand c'est facile." },
  { n: "Glissés au mur", d: "10", c: "Dos, tête et avant-bras contre le mur, fais glisser les bras vers le haut sans décoller le bas du dos." },
  { n: "90/90 hanches", d: "6 transitions par côté", c: "Assis, jambes pliées à 90° devant et derrière, bascule les genoux d'un côté à l'autre en gardant le buste droit." },
  { n: "Charnière de hanche au bâton", d: "10", c: "Bâton le long du dos (tête, haut du dos, bassin), recule les hanches en gardant les trois contacts." }
];
const MOBZ = {
  dos: [{ n: "Bird dog", d: "6 par côté, 8 s de tenue", c: "Bassin immobile, comme si un verre d'eau était posé sur tes reins." }, { n: "Curl-up McGill", d: "5 × 8 s", c: "Une jambe pliée, mains sous les reins, soulève à peine la tête et les épaules." }, { n: "Marche", d: "10 à 20 min par jour", c: "La marche soulage la plupart des lombalgies communes. Au réveil, évite les flexions répétées du dos pendant une heure." }],
  genoux: [{ n: "Chaise isométrique", d: "4 × 30 à 45 s", c: "Angle confortable : effet antalgique souvent rapide." }, { n: "Coquillage (clamshell)", d: "2 × 15 par côté", c: "Allongé sur le côté, genoux pliés, ouvre le genou du dessus sans bouger le bassin : renforce le moyen fessier qui stabilise le genou." }, { n: "Step-down contrôlé", d: "2 × 8 par côté", c: "Descends lentement d'une marche basse, genou dans l'axe du pied." }],
  epaules: [{ n: "Rotations externes", d: "2 × 15 par côté", c: "Coude collé au corps avec une serviette roulée, haltère léger ou élastique, tourne l'avant-bras vers l'extérieur." }, { n: "Pompes scapulaires", d: "2 × 10", c: "Bras tendus, rapproche puis écarte les omoplates sans plier les coudes." }, { n: "Étirement du pectoral à la porte", d: "30 s par côté", c: "Avant-bras sur le cadre de porte, avance doucement le buste." }],
  poignets: [{ n: "Appui à quatre pattes", d: "10 bascules", c: "Mains au sol doigts vers l'avant puis vers les genoux, bascule doucement le poids d'avant en arrière." }, { n: "Étirement fléchisseurs et extenseurs", d: "30 s chaque", c: "Bras tendu, tire doucement les doigts vers toi, paume vers l'avant puis vers le bas." }, { n: "Curl de poignet léger", d: "2 × 15", c: "Avant-bras posé sur la cuisse, petit haltère ou bouteille, monte et descends lentement." }],
  coudes: [{ n: "Torsion de serviette", d: "3 × 10 par sens", c: "Tords une serviette roulée comme pour l'essorer, lentement : renforce les tendons de l'avant-bras." }, { n: "Isométrie du poignet", d: "5 × 45 s", c: "Avant-bras posé, pousse le dos de la main contre l'autre main sans bouger : apaise le coude." }, { n: "Étirement des extenseurs", d: "30 s par côté", c: "Bras tendu, paume vers le bas, plie doucement le poignet vers le bas avec l'autre main." }],
  hanches: [{ n: "90/90 avec rotation", d: "6 par côté", c: "Dans la position 90/90, penche le buste vers le genou avant, dos droit." }, { n: "Étirement du fessier allongé", d: "40 s par côté", c: "Sur le dos, cheville posée sur le genou opposé, tire doucement la cuisse vers toi." }, { n: "Pont fessier avec ouverture", d: "2 × 12", c: "En haut du pont, ouvre légèrement les genoux puis redescends." }]
};
const RECUP = [
  ["Sommeil", "7 à 9 h, à heures régulières. Chambre à 18-19 °C, sombre et calme, écrans réduits l'heure d'avant, caféine avant 14 h."],
  ["Jours sans séance", "Marche 30 à 45 min ou vélo léger, puis la routine mobilité. Bouger léger accélère la récupération."],
  ["Courbatures", "Normales 24 à 72 h après une séance nouvelle, elles ne mesurent pas le progrès. Pas de séance lourde sur un muscle encore très courbaturé."],
  ["Froid", "Objectif muscle : évite bain froid et cryothérapie dans les 4 à 6 h après la muscu, ils freinent un peu la prise de muscle."],
  ["Fatigue", "Une journée sans énergie : garde la séance mais enlève une série par exercice et laisse 3 répétitions en réserve."],
  ["Signal d'arrêt", "Douleur vive, articulaire ou qui augmente : stop, remplace l'exercice. Douleur thoracique ou malaise : 15 ou 112."]
];

/* Nutrition */
const ACT = {
  sed: { l: "Sédentaire", d: "Bureau, moins de 5 000 pas", f: 1.2 },
  leger: { l: "Plutôt actif", d: "5 000 à 10 000 pas", f: 1.375 },
  actif: { l: "Actif", d: "Debout, plus de 10 000 pas", f: 1.55 },
  tres: { l: "Très actif", d: "Métier physique", f: 1.725 }
};
const SOURCES = {
  omni: [["Blanc de poulet cuit", "100 g", 30], ["Thon au naturel", "1 boîte (100 g)", 25], ["Steak haché 5 %", "100 g", 21], ["Œufs", "3", 19], ["Skyr", "150 g", 15], ["Fromage blanc 0 %", "200 g", 15], ["Lentilles cuites", "200 g", 18], ["Whey", "30 g", 24]],
  vege: [["Œufs", "3", 19], ["Cottage cheese", "150 g", 17], ["Skyr", "150 g", 15], ["Fromage blanc 0 %", "200 g", 15], ["Tofu ferme", "150 g", 20], ["Tempeh", "100 g", 19], ["Lentilles cuites", "200 g", 18], ["Emmental", "30 g", 8]],
  vegan: [["Seitan", "100 g", 22], ["Tofu ferme", "150 g", 20], ["Tempeh", "100 g", 19], ["Edamame", "150 g", 17], ["Lentilles cuites", "200 g", 18], ["Pois chiches cuits", "200 g", 16], ["Protéine de pois", "30 g", 24], ["Boisson soja", "250 ml", 8]]
};
/* ===== Fonte Suivi : carnet d'entraînement relié à Fonte ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const clone = o => JSON.parse(JSON.stringify(o));
const f1 = x => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(x);
const f0 = x => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(x));
const num = v => { if (v == null || v === "") return null; const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : null; };
const clampInt = (v, lo, hi) => { const n = num(v); return n == null || n < lo || n > hi ? null : Math.round(n); };
const inVal = v => (v == null ? "" : String(v).replace(".", ","));
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const FONTE_URL = "https://claude.ai/artifact/GZh1f7mSmhsXee1f6ouPEW";
const PRICE = { premium: "4,99 €", bundle: "2,49 €" };
const KEY = "fonte-suivi.v1", KEY_ACTIVE = "fonte-suivi.active";
const FREE_DAYS = 30;
const DAY = 86400000;
const LOWER = ["squat", "hinge", "lunge", "quadiso", "hamiso", "calves"];
const PLATES = ["var(--red)", "var(--blue)", "var(--yellow)", "var(--green)"];
const ICON = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>'
};

/* ===== Moteur Fonte (pour le programme d'exemple et les dosages) ===== */
const LV = { deb: 0, inter: 1, conf: 2 };
function okFor(e, st) { return e.eq.includes(st.eq) && !e.av.some(a => st.pain.includes(a)) && (e.lv || 0) <= LV[st.level]; }
function candidates(p, st) {
  const isDb = e => e.db === 1 || (Array.isArray(e.db) && e.db.includes(st.eq));
  const score = e => (st.goal === "force" && e.fx ? 2 : 0) + (st.level === "deb" && isDb(e) ? 1 : 0);
  return EX.map((e, i) => ({ e, i })).filter(o => o.e.p === p && okFor(o.e, st)).sort((a, b) => score(b.e) - score(a.e) || a.i - b.i).map(o => o.e);
}
function pickSlot(slot, used, st) {
  let p = slot, idx = 0, prefs = null;
  if (slot.includes("=")) { const parts = slot.split("="); p = parts[0]; prefs = parts[1].split(","); }
  else if (slot.includes(":")) { const parts = slot.split(":"); p = parts[0]; idx = +parts[1]; }
  const ok = candidates(p, st);
  if (prefs) for (const id of prefs) { const e = ok.find(x => x.id === id && !used.has(x.id)); if (e) return e; }
  const pool = ok.filter(e => !used.has(e.id));
  return pool.length ? pool[idx % pool.length] : null;
}
function roleOf(e, pos) { if (e.p === "core") return "gainage"; if (e.k === "i" || e.k === "t") return "isolation"; return pos <= 1 ? "principal" : "secondaire"; }
function doseFor(e, role, st) {
  if (role === "gainage") return { sets: st.level === "deb" ? 2 : 3, reps: e.rr || "30 à 45 s", rest: "45 à 60 s", rir: "—" };
  const D = DOSE[st.goal][role];
  let sets = D.s, rir = D.rir;
  if (st.level === "deb") { if (role !== "principal") sets = Math.max(2, sets - 1); else if (st.goal === "force") sets = 3; rir = role === "isolation" ? "1 à 2" : "2 à 3"; }
  if (st.level === "conf") { if (role === "principal") sets += 1; if (role === "isolation") rir = "0 à 1"; }
  return { sets, reps: e.rr || D.r, rest: D.rest, rir };
}
function buildPlan(st) {
  let n = +st.time; if ((st.goal === "seche" || st.goal === "forme") && n >= 4) n++;
  return SPLIT[st.days].map((key, d) => {
    const tpl = T[key], used = new Set(), ex = [];
    for (const slot of tpl.s) {
      if (ex.length >= n) break;
      const e = pickSlot(slot, used, st);
      if (!e) continue;
      used.add(e.id);
      ex.push({ id: e.id, n: e.n, ...doseFor(e, roleOf(e, ex.length), st) });
    }
    return { name: tpl.n, day: DAYS[st.days][d], ex };
  });
}
function band(st) { if (st.goal === "forme") return [4, 10]; if (st.goal === "force") return [6, 15]; return st.level === "deb" ? [6, 12] : [10, 20]; }
const EXAMPLE_FROM = { goal: "muscle", level: "deb", days: "3", time: "4", eq: "gym", pain: [] };
const EXAMPLE = { from: EXAMPLE_FROM, sessions: buildPlan(EXAMPLE_FROM), example: true, paid: false };

/* ===== État ===== */
const defaultsProfile = () => ({ program: null, plan: "free", bundle: false, importedAt: null, lastCode: null });
let profile = defaultsProfile();
let workouts = [];
let active = null;
let view = "seance";
let detailId = null;
let storeMode = "loading", storeReady = false, unsubs = [], dbRef = {};
let demo = null;
let pendingCode = null;
let sample = null, downloads, runtimeDone = false;
let rest = null, restTimer = null, audio = null, wakeLock = null;
let progKey = null;
let ai = { text: "", busy: false, note: "", ctl: null };
let lib = null;
let confirmFn = null;
const isPro = () => profile.plan === "premium";
const program = () => profile.program || EXAMPLE;
const from = () => program().from || EXAMPLE_FROM;

/* ===== Stockage : base de l'artefact, sinon cet appareil ===== */
function loadLocal() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
function saveLocal() { if (storeMode !== "local") return; try { localStorage.setItem(KEY, JSON.stringify({ profile, workouts })); } catch (e) { /* stockage bloqué */ } }
function saveActive() { try { if (active) localStorage.setItem(KEY_ACTIVE, JSON.stringify(active)); else localStorage.removeItem(KEY_ACTIVE); } catch (e) { /* stockage bloqué */ } }
function loadActive() { try { return JSON.parse(localStorage.getItem(KEY_ACTIVE) || "null"); } catch (e) { return null; } }
function useLocal(reason) {
  const fromDb = storeMode === "db";
  storeMode = "local";
  if (!fromDb) { const d = loadLocal(); if (d) { profile = { ...defaultsProfile(), ...(d.profile || {}) }; workouts = Array.isArray(d.workouts) ? d.workouts : []; } }
  saveLocal();
  if (reason) toast(reason);
  if (!storeReady) afterStoreReady(); else renderPassive();
}
async function initStore() {
  const c = window.claude;
  if (!c || typeof c.use !== "function") { useLocal(); return; }
  let dbNs = null, user = null, id = null;
  try { [dbNs, user] = await Promise.all([c.use("db"), c.use("user")]); } catch (e) { /* indisponible */ }
  try { id = user ? await user.id() : null; } catch (e) { id = null; }
  if (!dbNs || !id) { useLocal(); return; }
  try {
    dbRef.prof = dbNs.doc(`data/users/${id}/profile`);
    dbRef.wk = dbNs.doc(`data/users/${id}/log`).collection("workouts");
  } catch (e) { useLocal(); return; }
  storeMode = "db";
  const got = { p: false, w: false };
  const arrived = () => { if (got.p && got.w && !storeReady) afterStoreReady(); else if (storeReady) renderPassive(); };
  unsubs.push(dbRef.prof.onSnapshot(s => { got.p = true; if (s.exists) profile = { ...defaultsProfile(), ...clone(s.data()) }; arrived(); }, dbFail));
  unsubs.push(dbRef.wk.orderBy("startedAt", "desc").limit(1000).onSnapshot(q => { got.w = true; workouts = q.docs.map(d => clone(d.data())); arrived(); }, dbFail));
  setTimeout(() => { if (!storeReady) afterStoreReady(); }, 5000);
}
function dbFail() {
  if (storeMode !== "db") return;
  unsubs.forEach(u => { try { u(); } catch (e) { /* déjà arrêté */ } });
  unsubs = [];
  useLocal("Synchronisation indisponible : tes séances sont enregistrées sur cet appareil.");
}
async function dbWrite(fn) {
  try { await fn(); }
  catch (e) {
    let err = e;
    if (err && err.code === "unavailable") { await new Promise(r => setTimeout(r, 400 + Math.random() * 600)); try { await fn(); return; } catch (e2) { err = e2; } }
    if (err && err.code === "quota_exceeded") { toast("Stockage plein : supprime d'anciennes séances dans l'historique."); return; }
    if (err && err.code === "resource_exhausted") { toast("Trop d'enregistrements d'un coup : réessaie dans un instant."); return; }
    dbFail();
  }
}
let profQueue = Promise.resolve();
function saveProfile() {
  if (storeMode === "db") { const body = clone(profile); profQueue = profQueue.then(() => dbWrite(() => dbRef.prof.set(body))); }
  else saveLocal();
}
function putWorkout(w) {
  workouts = [w, ...workouts.filter(x => x.id !== w.id)].sort((a, b) => b.startedAt - a.startedAt);
  if (storeMode === "db") dbWrite(() => dbRef.wk.doc(w.id).set(clone(w))); else saveLocal();
}
async function wipeAll() {
  const ids = workouts.map(w => w.id);
  workouts = []; profile = defaultsProfile(); demo = null;
  closeSheet(); render();
  if (storeMode === "db") { for (const id of ids) { await dbWrite(() => dbRef.wk.doc(id).delete()); if (storeMode !== "db") break; } saveProfile(); }
  else saveLocal();
  toast("Données effacées.");
}
function removeWorkout(id) {
  workouts = workouts.filter(x => x.id !== id);
  if (storeMode === "db") dbWrite(() => dbRef.wk.doc(id).delete()); else saveLocal();
}
function afterStoreReady() {
  storeReady = true;
  if (!active) { const a = loadActive(); if (a && Array.isArray(a.ex)) active = a; }
  if (active) requestWake();
  const code = hashCode();
  if (code && fp(code) !== profile.lastCode) pendingCode = code;
  render();
}

/* ===== Lien avec Fonte : code de programme ===== */
function fp(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h >>> 0); }
function hashCode() {
  let h = "";
  try { h = decodeURIComponent((location.hash || "").slice(1)); } catch (e) { h = (location.hash || "").slice(1); }
  const m = h.match(/^fonte-(F1[A-Za-z0-9_-]+)$/);
  return m ? m[1] : null;
}
function decodeCode(input) {
  const m = String(input || "").match(/F1[A-Za-z0-9_-]{20,}/);
  if (!m) throw new Error("format");
  let b64 = m[0].slice(2).replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0))));
  if (o.v !== 1 || !Array.isArray(o.s) || !o.s.length) throw new Error("contenu");
  const goal = LABEL.goal[o.g] ? o.g : "muscle", level = LABEL.level[o.l] ? o.l : "deb", eq = LABEL.eq[o.q] ? o.q : "gym";
  const days = String(clampInt(o.d, 2, 6) || o.s.length), time = String(clampInt(o.t, 3, 6) || 4);
  const pain = Array.isArray(o.z) ? o.z.filter(z => ZONES[z]) : [];
  return {
    from: { goal, level, days, time, eq, pain }, paid: o.p === 1, code: m[0],
    sessions: o.s.slice(0, 7).map(s => ({
      name: String(s[0] || "Séance").slice(0, 60), day: String(s[1] || "").slice(0, 3),
      ex: (Array.isArray(s[2]) ? s[2] : []).slice(0, 12).map(x => {
        const e = EXI[x[0]];
        return { id: e ? e.id : null, n: e ? e.n : String(x[5] || "Exercice").slice(0, 80), sets: clampInt(x[1], 1, 10) || 3, reps: String(x[2] || "8 à 12").slice(0, 40), rest: String(x[3] || "90 s").slice(0, 30), rir: String(x[4] || "2").slice(0, 20) };
      })
    }))
  };
}
function importCode(code) {
  let prog;
  try { prog = decodeCode(code); } catch (e) { toast("Code non reconnu : copie-le à nouveau depuis Fonte."); return false; }
  profile.program = { from: prog.from, sessions: prog.sessions, paid: prog.paid };
  profile.bundle = prog.paid;
  profile.importedAt = Date.now();
  profile.lastCode = fp(prog.code);
  pendingCode = null;
  saveProfile();
  render();
  toast(prog.paid ? "Programme importé. Ton offre −50 % sur Premium est active." : "Programme importé.");
  return true;
}

/* ===== Calculs ===== */
function e1rm(w, r) { if (!w || !r) return 0; return r === 1 ? w : w * (1 + Math.min(r, 12) / 30); }
function bestSet(sets) { let b = null; for (const s of sets) { const e = e1rm(s.w, s.r); if (e && (!b || e > b.e)) b = { e, w: s.w, r: s.r }; } return b; }
const keyOf = x => x.id || "c:" + norm(x.n);
function history(key, before) {
  const out = [];
  for (const w of workouts) { if (before && w.startedAt >= before) continue; const x = w.ex.find(y => keyOf(y) === key); if (x && x.sets.length) out.push({ w, x }); }
  return out;
}
function lastPerf(key) { const h = history(key, active ? active.startedAt : null); return h.length ? h[0] : null; }
function parseRange(reps) {
  const s = String(reps || "");
  if (/\bs\b|sec|\bm\b|min/.test(s.replace(/par côté/g, ""))) return null;
  const n = s.match(/\d+/g);
  if (!n) return null;
  return n.length >= 2 ? [+n[0], +n[1]] : [+n[0], +n[0]];
}
function restSec(rest) {
  const s = String(rest || "");
  const n = (s.match(/\d+(?:[.,]\d+)?/g) || []).map(x => +x.replace(",", "."));
  if (!n.length) return 90;
  let v = n.length >= 2 ? (n[0] + n[1]) / 2 : n[0];
  if (/min/.test(s)) v *= 60;
  return Math.max(30, Math.round(v / 15) * 15);
}
const roundTo = (x, step) => Math.round(x / step) * step;
function suggestion(x) {
  const key = keyOf(x), e = EXI[x.id], rng = parseRange(x.target && x.target.reps), rir = x.target ? x.target.rir : "2 à 3";
  const h = history(key, active ? active.startedAt : null);
  if (!h.length) return { txt: `Première fois : choisis une charge qui te laisse ${rir && rir !== "—" ? rir : "2 à 3"} répétitions en réserve à la fin de chaque série.`, w: null };
  const sets = h[0].x.sets.filter(s => s.r);
  const lastW = Math.max(0, ...sets.map(s => s.w || 0));
  if (!rng || !sets.length) return { txt: `Dernière fois : ${setsTxt(sets)}. Fais un peu mieux : une répétition ou un peu plus de temps.`, w: lastW || null };
  const allTop = sets.every(s => s.r >= rng[1]);
  const anyLow = sets.some(s => s.r < rng[0]);
  if (!lastW) return allTop ? { txt: "Haut de la fourchette atteint partout : passe à une variante plus dure ou ajoute du lest.", w: null } : { txt: `Vise une répétition de plus par série (objectif : ${rng[1]} partout).`, w: null };
  const lower = e && LOWER.includes(e.p);
  if (allTop) {
    const inc = Math.max(lower ? 2.5 : 1, lastW * (lower ? 0.05 : 0.025));
    const w = roundTo(lastW + inc, lower ? 2.5 : 0.5);
    return { txt: `Haut de la fourchette atteint partout : passe à ${f1(w)} kg (+${f1(w - lastW)} kg) et repars à ${rng[0]} répétitions.`, w };
  }
  if (anyLow) {
    const prev = h[1] && h[1].x.sets.filter(s => s.r);
    const prevW = prev && prev.length ? Math.max(0, ...prev.map(s => s.w || 0)) : 0;
    if (prev && prevW === lastW && prev.some(s => s.r < rng[0])) {
      const w = roundTo(lastW * 0.95, lower ? 2.5 : 0.5);
      return { txt: `Deux séances sous ${rng[0]} répétitions à ${f1(lastW)} kg : redescends à ${f1(w)} kg et remonte proprement.`, w };
    }
    return { txt: `Garde ${f1(lastW)} kg et vise au moins ${rng[0]} répétitions sur toutes les séries.`, w: lastW };
  }
  return { txt: `Garde ${f1(lastW)} kg et ajoute une répétition par série (objectif : ${rng[1]} partout).`, w: lastW };
}
function setsTxt(sets) {
  if (!sets.length) return "—";
  const ws = [...new Set(sets.map(s => s.w || 0))];
  if (ws.length === 1) return `${ws[0] ? f1(ws[0]) + " kg × " : ""}${sets.map(s => s.r).join(", ")}`;
  return sets.map(s => `${s.w ? f1(s.w) + "×" : ""}${s.r}`).join(", ");
}
function weekStart(ts) { const d = new Date(ts); const day = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - day); return d.getTime(); }
function volOf(w) { return w.ex.reduce((t, x) => t + x.sets.reduce((u, s) => u + (s.w || 0) * (s.r || 0), 0), 0); }
function mmss(sec) { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0"); }
function dateFr(ts, opt) { return new Date(ts).toLocaleDateString("fr-FR", opt || { weekday: "short", day: "numeric", month: "short" }); }
function nextSession() {
  const P = program(), n = P.sessions.length;
  const last = workouts.find(w => w.si != null && w.si < n);
  return last ? (last.si + 1) % n : 0;
}
function streak(list, target) {
  const byWeek = {};
  list.forEach(w => { const k = weekStart(w.startedAt); byWeek[k] = (byWeek[k] || 0) + 1; });
  let ws = weekStart(Date.now()), count = 0;
  if ((byWeek[ws] || 0) >= target) count++;
  ws -= 7 * DAY;
  while ((byWeek[ws] || 0) >= target) { count++; ws -= 7 * DAY; }
  return count;
}
function muscleSets(list, since) {
  const v = Object.fromEntries(Object.keys(MUS).map(k => [k, 0]));
  list.filter(w => w.startedAt >= since).forEach(w => w.ex.forEach(x => {
    const e = EXI[x.id];
    if (!e) return;
    e.m.forEach(k => { v[k] += x.sets.length; });
    (e.s || []).forEach(k => { v[k] += x.sets.length * 0.5; });
  }));
  return v;
}

/* ===== Données d'exemple (jamais enregistrées) ===== */
function makeDemo() {
  const P = program(), st = from(), out = [];
  const base = e => { if (!e) return 10; if (e.rr && e.eq.includes("pdc") && st.eq === "pdc") return 0; return { squat: 50, hinge: 50, lunge: 16, quadiso: 30, hamiso: 25, calves: 40, pushH: 40, pushV: 24, pullH: 35, pullV: 40, deltlat: 7, deltar: 8, biceps: 10, triceps: 12, core: 0 }[e.p] ?? 10; };
  const start = weekStart(Date.now()) - 7 * 7 * DAY;
  let rnd = 7;
  const r01 = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
  for (let wk = 0; wk < 8; wk++) {
    P.sessions.forEach((s, si) => {
      if (r01() < 0.12 && wk < 7) return;
      const dayIdx = Math.max(0, ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].indexOf(s.day));
      const t0 = start + wk * 7 * DAY + dayIdx * DAY + 18 * 3600000;
      if (t0 > Date.now()) return;
      const ex = s.ex.map(x => {
        const e = EXI[x.id], rng = parseRange(x.reps) || [8, 12], b = base(e);
        const w = b ? roundTo(b * (1 + 0.025 * wk) * (0.98 + r01() * 0.04), LOWER.includes(e && e.p) ? 2.5 : 0.5) : null;
        return { id: x.id, n: x.n, target: { sets: x.sets, reps: x.reps, rest: x.rest, rir: x.rir }, note: "", sets: Array.from({ length: x.sets }, (_, j) => ({ w, r: Math.max(rng[0], Math.min(rng[1], Math.round(rng[0] + (rng[1] - rng[0]) * (0.35 + 0.15 * (wk % 3)) - j + r01() * 1.5))) })) };
      });
      const w = { id: "demo" + wk + si, name: s.name, si, startedAt: t0, endedAt: t0 + 50 * 60000, dur: 2700 + Math.round(r01() * 900), ex, prs: [], demo: true };
      w.vol = Math.round(volOf(w)); w.nsets = ex.reduce((t, x) => t + x.sets.length, 0);
      out.push(w);
    });
  }
  return out.sort((a, b) => b.startedAt - a.startedAt);
}

/* ===== Séance en cours ===== */
function newId() { return "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function mkActiveEx(x) {
  const target = { sets: x.sets, reps: x.reps, rest: x.rest, rir: x.rir };
  const item = { id: x.id, n: x.n, target, note: "", showNote: false, sets: [] };
  const sug = suggestion(item), last = lastPerf(keyOf(item)), rng = parseRange(x.reps);
  const n = clampInt(x.sets, 1, 10) || 3;
  for (let j = 0; j < n; j++) {
    const ls = last ? last.x.sets[Math.min(j, last.x.sets.length - 1)] : null;
    const pw = isPro() && sug.w ? sug.w : ls && ls.w ? ls.w : null;
    const pr = ls && ls.r && !(isPro() && sug.w && ls.w && sug.w > ls.w) ? ls.r : rng ? rng[0] : null;
    item.sets.push({ w: null, r: null, done: false, pw, pr });
  }
  return item;
}
function startWorkout(si) {
  if (active) { toast("Une séance est déjà en cours."); setView("seance"); return; }
  const s = program().sessions[si];
  if (!s) return;
  active = { id: newId(), name: s.name, si, startedAt: Date.now(), ex: s.ex.map(mkActiveEx) };
  saveActive(); requestWake(); setView("seance"); window.scrollTo(0, 0);
}
function startFrom(w) {
  if (active) { toast("Une séance est déjà en cours."); setView("seance"); return; }
  active = { id: newId(), name: w.name, si: w.si ?? null, startedAt: Date.now(), ex: w.ex.map(x => mkActiveEx({ id: x.id, n: x.n, ...(x.target || { sets: x.sets.length, reps: "8 à 12", rest: "90 s", rir: "2" }) })) };
  saveActive(); requestWake(); detailId = null; setView("seance"); window.scrollTo(0, 0);
}
function startFree() {
  if (active) { setView("seance"); return; }
  active = { id: newId(), name: "Séance libre", si: null, startedAt: Date.now(), ex: [] };
  saveActive(); requestWake(); setView("seance"); openLibrary("add");
}
function doneCount() { return active ? active.ex.reduce((t, x) => t + x.sets.filter(s => s.done).length, 0) : 0; }
function totalCount() { return active ? active.ex.reduce((t, x) => t + x.sets.length, 0) : 0; }
function prevTxt(x, j) {
  const last = lastPerf(keyOf(x));
  if (!last) return "—";
  const s = last.x.sets[j];
  if (!s) return "—";
  return `${s.w ? f1(s.w) + " × " : ""}${s.r ?? "—"}`;
}
function setRowHTML(x, i, s, j) {
  return `<div class="srow${s.done ? " done" : ""}" data-i="${i}" data-j="${j}"><span class="n">${j + 1}</span><span class="prev">${esc(prevTxt(x, j))}</span>
    <input type="text" inputmode="decimal" autocomplete="off" data-f="w" aria-label="Charge de la série ${j + 1} en kilos" value="${inVal(s.w)}" placeholder="${s.pw != null ? esc(f1(s.pw)) : "kg"}">
    <input type="text" inputmode="numeric" autocomplete="off" data-f="r" aria-label="Répétitions de la série ${j + 1}" value="${s.r ?? ""}" placeholder="${s.pr ?? ""}">
    <button type="button" class="chk" data-act="done" aria-pressed="${s.done ? "true" : "false"}" aria-label="Valider la série ${j + 1}">${ICON.check}</button></div>`;
}
function exCardHTML(x, i) {
  const e = EXI[x.id], t = x.target, timed = e && e.k === "t";
  const tgt = t ? `Objectif : ${t.sets} × ${t.reps}${e && e.u ? " / côté" : ""}${t.rir && t.rir !== "—" ? ` · RIR ${t.rir}` : ""} · repos ${t.rest}` : "";
  const sug = suggestion(x);
  const tip = isPro() ? `<p class="tip-line"><b>Conseil :</b> ${esc(sug.txt)}</p>` : `<p class="tip-line locked">Conseil de charge automatique avec Premium. <button type="button" class="linkbtn" data-act="go-offre">Voir l'offre</button></p>`;
  const cues = e ? `<p>${esc(e.c)}</p><p class="err"><b>Erreur fréquente :</b> ${esc(e.e)}</p>` : `<p>Exercice personnalisé.</p>`;
  const anyDone = x.sets.some(s => s.done);
  return `<article class="exc" id="ex-${i}" data-i="${i}">
    <div class="exhead"><h3>${esc(x.n)}</h3><button type="button" class="iconbtn" data-act="ex-menu" data-i="${i}" aria-expanded="false" aria-controls="exm-${i}" aria-label="Options : ${esc(x.n)}">${ICON.dots}</button></div>
    ${tgt ? `<p class="target">${esc(tgt)}</p>` : ""}${tip}
    <div class="row" id="exm-${i}" hidden><button type="button" class="btn2" data-act="cues" data-i="${i}">Consignes</button><button type="button" class="btn2" data-act="replace" data-i="${i}"${anyDone ? " disabled" : ""}>Remplacer</button>${i > 0 ? `<button type="button" class="btn2" data-act="up" data-i="${i}">Monter</button>` : ""}${i < active.ex.length - 1 ? `<button type="button" class="btn2" data-act="down" data-i="${i}">Descendre</button>` : ""}<button type="button" class="btn2" data-act="remove-ex" data-i="${i}">Retirer</button></div>
    <div class="cues" id="cues-${i}" hidden>${cues}</div>
    <div class="sets"><div class="srow h" aria-hidden="true"><span>#</span><span>Précédent</span><span>kg</span><span>${timed ? "Durée" : "Reps"}</span><span></span></div>${x.sets.map((s, j) => setRowHTML(x, i, s, j)).join("")}</div>
    <div class="exfoot"><button type="button" class="btn2" data-act="add-set" data-i="${i}">+ Série</button>${x.sets.length > 1 ? `<button type="button" class="btn2" data-act="del-set" data-i="${i}">− Série</button>` : ""}<span class="sp"></span><button type="button" class="linkbtn" data-act="note" data-i="${i}">${x.note ? "Note" : "Ajouter une note"}</button>${x.note || x.showNote ? `<textarea class="note-in" data-i="${i}" aria-label="Note pour ${esc(x.n)}" placeholder="Sensations, réglage machine, douleur…">${esc(x.note)}</textarea>` : ""}</div>
  </article>`;
}
function liveHTML() {
  const a = active;
  return `<div class="livehead"><div><b>${esc(a.name)}</b><div class="muted small" id="live-count">${doneCount()} / ${totalCount()} séries validées</div></div><span class="sp"></span><span class="clock" id="clock">${mmss((Date.now() - a.startedAt) / 1000)}</span><button type="button" class="primary red" data-act="finish">Terminer</button></div>
    ${a.ex.length ? a.ex.map((x, i) => exCardHTML(x, i)).join("") : `<div class="card"><p>Ajoute ton premier exercice pour commencer.</p></div>`}
    <div class="row"><button type="button" class="btn2" data-act="add-ex">+ Ajouter un exercice</button><span class="sp"></span><button type="button" class="linkbtn" data-act="discard">Abandonner la séance</button></div>`;
}
function rerenderCard(i) { const el = $("#ex-" + i); if (el) el.outerHTML = exCardHTML(active.ex[i], i); updateCount(); }
function updateCount() { const c = $("#live-count"); if (c) c.textContent = `${doneCount()} / ${totalCount()} séries validées`; }
function toggleDone(i, j) {
  const x = active.ex[i], s = x.sets[j];
  const row = document.querySelector(`.srow[data-i="${i}"][data-j="${j}"]`);
  if (!s.done) {
    if (s.w == null && s.pw != null) s.w = s.pw;
    if (s.r == null && s.pr != null) s.r = s.pr;
    if (s.r == null) { toast("Indique le nombre de répétitions."); const inp = row && row.querySelector('[data-f="r"]'); if (inp) inp.focus(); return; }
    s.done = true;
    ensureAudio();
    startRest(restSec(x.target ? x.target.rest : "90 s"), `Repos · ${x.n}`);
  } else s.done = false;
  saveActive();
  if (row) {
    row.classList.toggle("done", s.done);
    row.querySelector(".chk").setAttribute("aria-pressed", s.done ? "true" : "false");
    row.querySelector('[data-f="w"]').value = inVal(s.w);
    row.querySelector('[data-f="r"]').value = s.r ?? "";
  }
  updateCount();
}
function buildSaved(a) {
  const endedAt = Date.now();
  const ex = a.ex.map(x => ({ id: x.id, n: x.n, target: x.target || null, note: (x.note || "").slice(0, 500), sets: x.sets.filter(s => s.done).map(s => ({ w: s.w ?? null, r: s.r ?? null })) })).filter(x => x.sets.length);
  const prs = [];
  ex.forEach(x => {
    const key = keyOf(x), b = bestSet(x.sets);
    if (!b) return;
    const prev = history(key, a.startedAt).map(h => bestSet(h.x.sets)).filter(Boolean);
    if (prev.length && b.e > Math.max(...prev.map(p => p.e)) + 0.05) prs.push({ key, n: x.n, e: Math.round(b.e * 10) / 10, w: b.w, r: b.r });
  });
  const w = { id: a.id, name: a.name, si: a.si ?? null, startedAt: a.startedAt, endedAt, dur: Math.round((endedAt - a.startedAt) / 1000), ex, prs };
  w.vol = Math.round(volOf(w));
  w.nsets = ex.reduce((t, x) => t + x.sets.length, 0);
  return w;
}
function finishWorkout() {
  if (!doneCount()) { openConfirm("Aucune série validée. Abandonner cette séance ?", "Abandonner", discardWorkout); return; }
  const w = buildSaved(active);
  openSheet(`<h2 id="sheet-title">Bravo, séance terminée</h2>
    <div class="summary-grid"><div class="stat"><span>Durée</span><b>${mmss(w.dur)}</b></div><div class="stat"><span>Séries</span><b>${w.nsets}</b></div><div class="stat"><span>Volume</span><b>${f0(w.vol)} kg</b></div></div>
    ${w.prs.length ? `<div class="card"><h3>${w.prs.length} record${w.prs.length > 1 ? "s" : ""} battu${w.prs.length > 1 ? "s" : ""}</h3><ul style="margin:6px 0 0;padding-left:20px">${w.prs.map(p => `<li><b>${esc(p.n)}</b> : force estimée ${f1(p.e)} kg (${f1(p.w)} kg × ${p.r})</li>`).join("")}</ul></div>` : `<p class="muted">Pas de record aujourd'hui : la régularité fait le travail.</p>`}
    ${totalCount() > doneCount() ? `<p class="muted small">${totalCount() - doneCount()} série(s) non validée(s) ne seront pas enregistrées.</p>` : ""}
    <div class="row"><button type="button" class="btn2" data-act="sheet-close">Continuer la séance</button><span class="sp"></span><button type="button" class="primary" data-act="save-workout">Enregistrer la séance</button></div>`);
  pendingSave = w;
}
let pendingSave = null;
function saveFinished() {
  if (!pendingSave) return;
  const w = pendingSave;
  pendingSave = null;
  putWorkout(w);
  active = null; saveActive(); stopRest(); releaseWake(); closeSheet();
  demo = null;
  render();
  toast(w.prs.length ? `Séance enregistrée · ${w.prs.length} record${w.prs.length > 1 ? "s" : ""}` : "Séance enregistrée");
}
function discardWorkout() { active = null; saveActive(); stopRest(); releaseWake(); closeSheet(); render(); toast("Séance abandonnée."); }

/* ===== Minuteur, son, écran allumé ===== */
function startRest(sec, label) {
  rest = { end: Date.now() + sec * 1000, total: sec, label, over: false };
  $("#rest").hidden = false;
  $("#rest-in").classList.remove("over");
  clearInterval(restTimer);
  restTimer = setInterval(tickRest, 250);
  tickRest();
}
function tickRest() {
  if (!rest) return;
  const left = Math.ceil((rest.end - Date.now()) / 1000);
  if (left <= 0) {
    if (!rest.over) { rest.over = true; beep(); $("#rest-in").classList.add("over"); $("#rest-l").textContent = "Repos terminé : série suivante !"; $("#rest-t").textContent = "0:00"; $("#rest-p").style.width = "100%"; }
    if (left < -15) stopRest();
    return;
  }
  $("#rest-t").textContent = mmss(left);
  $("#rest-l").textContent = rest.label;
  $("#rest-p").style.width = Math.min(100, 100 - left / rest.total * 100) + "%";
}
function stopRest() { rest = null; clearInterval(restTimer); $("#rest").hidden = true; }
function ensureAudio() { try { if (!audio) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audio = new AC(); } if (audio && audio.state === "suspended") audio.resume(); } catch (e) { audio = null; } }
function beep() {
  try {
    if (!audio) return;
    const t = audio.currentTime;
    [0, 0.24].forEach(d => { const o = audio.createOscillator(), g = audio.createGain(); o.type = "sine"; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.3, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.2); o.connect(g); g.connect(audio.destination); o.start(t + d); o.stop(t + d + 0.22); });
  } catch (e) { /* son indisponible */ }
}
async function requestWake() { try { if ("wakeLock" in navigator && active && document.visibilityState === "visible" && !wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); } } catch (e) { wakeLock = null; } }
function releaseWake() { try { if (wakeLock) wakeLock.release(); } catch (e) { /* déjà libéré */ } wakeLock = null; }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && active) requestWake(); });
setInterval(() => { const c = $("#clock"); if (c && active) c.textContent = mmss((Date.now() - active.startedAt) / 1000); }, 1000);

/* ===== Bibliothèque d'exercices ===== */
const PAT_CHIPS = [["", "Tous"], ["squat", "Squat"], ["hinge", "Charnière"], ["lunge", "Fentes"], ["pushH", "Poussée horiz."], ["pushV", "Poussée vert."], ["pullH", "Tirage horiz."], ["pullV", "Tirage vert."], ["deltlat", "Épaules"], ["deltar", "Arrière d'épaule"], ["biceps", "Biceps"], ["triceps", "Triceps"], ["quadiso", "Quadriceps"], ["hamiso", "Ischios"], ["calves", "Mollets"], ["core", "Gainage"]];
function openLibrary(mode, i) {
  const cur = mode === "replace" ? EXI[active.ex[i].id] : null;
  lib = { mode, i, q: "", p: cur ? cur.p : "", eq: from().eq };
  openSheet(`<div class="row"><h2 id="sheet-title">${mode === "replace" ? "Remplacer l'exercice" : "Ajouter un exercice"}</h2><span class="sp"></span><button type="button" class="btn2" data-act="sheet-close">Fermer</button></div>
    <label class="sr" for="lib-q">Rechercher un exercice</label><input id="lib-q" class="search" type="search" placeholder="Rechercher : développé, fessiers, curl…" autocomplete="off">
    <div class="chips" id="lib-eq">${[["gym", "Salle"], ["halteres", "Haltères"], ["pdc", "Poids du corps"], ["", "Tout matériel"]].map(([k, l]) => `<button type="button" data-eq="${k}" aria-pressed="${lib.eq === k}">${l}</button>`).join("")}</div>
    <div class="chips" id="lib-p">${PAT_CHIPS.map(([k, l]) => `<button type="button" data-p="${k}" aria-pressed="${lib.p === k}">${l}</button>`).join("")}</div>
    <div id="lib-list" style="display:grid;gap:6px"></div>`);
  renderLibList();
  const q = $("#lib-q");
  q.addEventListener("input", () => { lib.q = q.value; renderLibList(); });
}
function renderLibList() {
  const q = norm(lib.q);
  let list = EX.filter(e => (!lib.p || e.p === lib.p) && (!lib.eq || e.eq.includes(lib.eq)));
  if (q) list = list.filter(e => norm(`${e.n} ${e.m.map(k => MUS[k]).join(" ")} ${PATTERN[e.p]}`).includes(q));
  const pain = from().pain || [];
  const items = list.slice(0, 60).map(e => { const warn = e.av.filter(a => pain.includes(a)); return `<button type="button" class="lib-item" data-act="lib-pick" data-id="${e.id}"><b>${esc(e.n)}</b><span>${e.m.map(k => MUS[k]).join(", ")}</span>${warn.length ? `<span style="grid-column:1/-1;color:var(--warn)">Déconseillé pour : ${warn.map(z => ZONES[z].toLowerCase()).join(", ")}</span>` : ""}</button>`; }).join("");
  const custom = lib.q.trim() && !list.some(e => norm(e.n) === q) ? `<button type="button" class="lib-item" data-act="lib-custom"><b>Créer « ${esc(lib.q.trim())} »</b><span>Exercice personnalisé</span></button>` : "";
  $("#lib-list").innerHTML = (items || `<p class="muted">Aucun exercice ne correspond.</p>`) + custom;
}
function pickExercise(e, customName) {
  const L = lib, st = from();
  if (!L) return;
  const item = e ? { id: e.id, n: e.n, ...doseFor(e, roleOf(e, 2), st) } : { id: null, n: String(customName).slice(0, 80), sets: 3, reps: "8 à 12", rest: "90 s", rir: "2" };
  if (L.mode === "replace") {
    const old = active.ex[L.i];
    active.ex[L.i] = mkActiveEx({ ...item, ...(old.target || {}), id: item.id, n: item.n });
  } else active.ex.push(mkActiveEx(item));
  saveActive(); closeSheet(); renderSeance(true);
  const idx = L.mode === "replace" ? L.i : active.ex.length - 1;
  const el = $("#ex-" + idx);
  if (el) el.scrollIntoView({ block: "center", behavior: reduceMotion() ? "auto" : "smooth" });
}

/* ===== Feuilles modales et toast ===== */
let lastFocus = null;
function openSheet(html) {
  lastFocus = document.activeElement;
  $("#sheet-box").innerHTML = html;
  $("#sheet").hidden = false;
  const f = $("#sheet-box").querySelector("input, textarea, button.primary, button");
  if (f) f.focus({ preventScroll: true });
}
function closeSheet() { $("#sheet").hidden = true; $("#sheet-box").innerHTML = ""; lib = null; confirmFn = null; if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true }); }
function openConfirm(msg, okLabel, fn) {
  openSheet(`<h2 id="sheet-title">${esc(msg)}</h2><div class="row"><button type="button" class="btn2" data-act="sheet-close">Annuler</button><span class="sp"></span><button type="button" class="primary red" data-act="confirm-ok">${esc(okLabel)}</button></div>`);
  confirmFn = fn;
}
let toastTimer = null;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 4200); }

/* ===== Vues ===== */
function setView(v) {
  view = v;
  document.querySelectorAll(".nav button").forEach(b => { if (b.dataset.view === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  ["seance", "historique", "progres", "offre"].forEach(k => { $("#v-" + k).hidden = k !== v; });
  render(true);
}
function render(force) {
  renderBadge();
  if (view === "seance") renderSeance(force);
  else if (view === "historique") renderHistory();
  else if (view === "progres") renderProgress();
  else renderOffre();
}
function renderPassive() {
  renderBadge();
  if (view === "seance") { if (!active) renderSeance(true); }
  else if (view === "historique") renderHistory();
  else if (view === "progres") { if (!ai.busy) renderProgress(); }
  else renderOffre();
}
function renderBadge() {
  const b = $("#plan-badge");
  b.textContent = isPro() ? (profile.bundle ? "Premium · −50 %" : "Premium") : "Gratuit";
  b.classList.toggle("pro", isPro());
}
function importBanner() {
  if (!pendingCode) return "";
  let p = null;
  try { p = decodeCode(pendingCode); } catch (e) { return ""; }
  return `<div class="banner"><b>Programme Fonte reçu</b><p>${esc(LABEL.goal[p.from.goal])} · ${p.sessions.length} séances · ${esc(LABEL.eq[p.from.eq])}${p.paid ? " · donne droit à −50 % sur Premium" : ""}.${profile.program ? " Il remplacera ton programme actuel." : ""}</p><div class="row"><button type="button" class="primary" data-act="import-pending">Importer ce programme</button><button type="button" class="btn2" data-act="ignore-pending">Ignorer</button></div></div>`;
}
function renderSeance(force) {
  const V = $("#v-seance");
  if (active) { if (force || !V.querySelector(".livehead")) V.innerHTML = liveHTML(); return; }
  if (!storeReady) { V.innerHTML = `<section><h1>Ta séance</h1><p class="muted">Chargement de tes séances…</p></section>`; return; }
  const P = program(), st = from(), nx = nextSession();
  const wkStart = weekStart(Date.now());
  const thisWeek = workouts.filter(w => w.startedAt >= wkStart);
  const target = +st.days || P.sessions.length;
  V.innerHTML = `${importBanner()}
  <section><h1>Ta séance</h1><p class="muted">${P.example ? "Programme d'exemple en attendant ton programme Fonte." : `${esc(LABEL.goal[st.goal])} · ${esc(LABEL.level[st.level])} · ${esc(LABEL.eq[st.eq])}`}</p></section>
  <section class="stats"><div class="stat"><span>Cette semaine</span><b>${thisWeek.length} / ${target}</b></div><div class="stat"><span>Volume semaine</span><b>${f0(thisWeek.reduce((t, w) => t + (w.vol || 0), 0))} kg</b></div><div class="stat"><span>Série en cours</span><b>${streak(workouts, target)} sem.</b></div></section>
  <section class="card"><div class="sechead"><h2>${P.example ? "Programme d'exemple" : "Ton programme Fonte"}</h2>${P.example ? `<button type="button" class="linkbtn" data-act="go-offre">Importer le mien</button>` : ""}</div>
    ${P.sessions.map((s, i) => { const last = workouts.find(w => w.si === i); return `<div class="sess" style="--plate:${PLATES[i % 4]}"><span class="plate" aria-hidden="true"></span><div>${i === nx ? `<span class="next">Prochaine séance</span>` : ""}<b>Séance ${i + 1} · ${esc(s.name)}</b><p>${s.ex.length} exercices${last ? ` · dernière fois ${dateFr(last.startedAt)}` : ""}</p></div><button type="button" class="${i === nx ? "primary red" : "btn2"}" data-act="start" data-si="${i}">Démarrer</button></div>`; }).join("")}
  </section>
  <section class="row"><button type="button" class="btn2" data-act="start-free">Séance libre</button><span class="sp"></span><span class="muted small">${storeMode === "db" ? "Séances synchronisées sur ton compte" : "Séances enregistrées sur cet appareil"}</span></section>`;
}
function renderHistory() {
  const V = $("#v-historique");
  if (detailId) { const w = workouts.find(x => x.id === detailId) || (demo || []).find(x => x.id === detailId); if (w) { V.innerHTML = detailHTML(w); return; } detailId = null; }
  const real = workouts.length > 0, list = real ? workouts : demo;
  if (!list) { V.innerHTML = `<section><h1>Historique</h1><div class="card"><p>Tes séances apparaîtront ici dès que tu en auras terminé une : date, durée, volume et records.</p><div class="row" style="margin-top:10px"><button type="button" class="primary" data-act="go-seance">Démarrer une séance</button><button type="button" class="btn2" data-act="demo">Voir un exemple</button></div></div></section>`; return; }
  const cutoff = Date.now() - FREE_DAYS * DAY;
  const visible = isPro() ? list : list.filter(w => w.startedAt >= cutoff), hidden = isPro() ? [] : list.filter(w => w.startedAt < cutoff);
  const group = arr => { let out = "", cur = ""; arr.forEach(w => { const m = new Date(w.startedAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); if (m !== cur) { out += `<p class="month">${m}</p>`; cur = m; } out += itemHTML(w); }); return out; };
  V.innerHTML = `<section><div class="sechead"><h1>Historique</h1><span class="muted small">${list.length} séance${list.length > 1 ? "s" : ""}</span></div>${!real ? demoBanner() : ""}</section>
    <section>${group(visible) || `<p class="muted">Aucune séance ces 30 derniers jours.</p>`}</section>
    ${hidden.length ? `<section class="locked-list"><div class="body">${group(hidden.slice(0, 4))}</div><div class="gatemsg"><div><b>${hidden.length} séance${hidden.length > 1 ? "s" : ""} plus ancienne${hidden.length > 1 ? "s" : ""}</b><span class="muted small">L'historique complet fait partie de Premium.</span><button type="button" class="unlock" data-act="go-offre">Voir l'offre</button></div></div></section>` : ""}`;
}
function itemHTML(w) {
  const d = new Date(w.startedAt);
  return `<button type="button" class="wk-item" data-act="open-w" data-id="${esc(w.id)}"><span class="d"><b>${d.getDate()}</b><span>${d.toLocaleDateString("fr-FR", { weekday: "short" })}</span></span><span><span class="t">${esc(w.name)}</span><br><span class="m">${mmss(w.dur)} · ${w.nsets} séries · ${f0(w.vol)} kg</span></span>${w.prs && w.prs.length ? `<span class="badge pr">${w.prs.length} record${w.prs.length > 1 ? "s" : ""}</span>` : "<span></span>"}</button>`;
}
function detailHTML(w) {
  return `<section><button type="button" class="linkbtn" data-act="back">← Historique</button><h1>${esc(w.name)}</h1><p class="muted">${dateFr(w.startedAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${mmss(w.dur)} · ${w.nsets} séries · ${f0(w.vol)} kg${w.demo ? " · exemple" : ""}</p></section>
    ${w.prs && w.prs.length ? `<section class="card"><h3>Records</h3><ul style="margin:6px 0 0;padding-left:20px">${w.prs.map(p => `<li><b>${esc(p.n)}</b> : ${f1(p.e)} kg estimés (${f1(p.w)} kg × ${p.r})</li>`).join("")}</ul></section>` : ""}
    <section class="card">${w.ex.map(x => `<div class="detail-ex"><b>${esc(x.n)}</b><ol>${x.sets.map(s => `<li>${s.w ? f1(s.w) + " kg × " : ""}${s.r ?? "—"}</li>`).join("")}</ol>${x.note ? `<p class="muted small">Note : ${esc(x.note)}</p>` : ""}</div>`).join("")}</section>
    ${w.demo ? "" : `<section class="row"><button type="button" class="primary" data-act="redo" data-id="${esc(w.id)}">Refaire cette séance</button><span class="sp"></span><button type="button" class="btn2" data-act="delete-w" data-id="${esc(w.id)}">Supprimer</button></section>`}`;
}
function demoBanner() { return `<div class="banner"><b>Exemple</b><p>Ces séances sont fictives et ne sont pas enregistrées. Tes vraies séances les remplaceront.</p><div class="row"><button type="button" class="btn2" data-act="demo-off">Masquer l'exemple</button></div></div>`; }

/* ===== Graphiques ===== */
function niceStep(range, count) { const raw = range / Math.max(1, count); const p = Math.pow(10, Math.floor(Math.log10(raw || 1))); const n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function barChart(el, bars, target) {
  const W = Math.max(280, el.clientWidth || 320), H = 170, pl = 30, pr = 8, pt = 12, pb = 24;
  const maxV = Math.max(target + 1, ...bars.map(b => b.v));
  const step = niceStep(maxV, 3), top = Math.ceil(maxV / step) * step;
  const Y = v => pt + (1 - v / top) * (H - pt - pb);
  const slot = (W - pl - pr) / bars.length, bw = Math.min(24, slot * 0.6);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Séances par semaine sur 12 semaines">`;
  for (let v = 0; v <= top + 0.001; v += step) s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end">${f1(v)}</text>`;
  bars.forEach((b, i) => {
    const x = pl + slot * i + (slot - bw) / 2, y = Y(b.v), h = Y(0) - y;
    if (b.v > 0) s += `<path d="M${x},${Y(0)} V${y + 4} Q${x},${y} ${x + 4},${y} H${x + bw - 4} Q${x + bw},${y} ${x + bw},${y + 4} V${Y(0)} Z" fill="var(--bar)"/>`;
    s += `<rect class="hit" data-i="${i}" x="${pl + slot * i}" y="${pt}" width="${slot}" height="${H - pt - pb}" fill="transparent" tabindex="0" aria-label="${esc(b.label)} : ${b.v} séance${b.v > 1 ? "s" : ""}"/>`;
    if (i === 0 || i === bars.length - 1 || i % 4 === 0) s += `<text x="${pl + slot * i + slot / 2}" y="${H - 6}" text-anchor="middle">${esc(b.short)}</text>`;
  });
  s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(target)}" y2="${Y(target)}" stroke="var(--green)" stroke-width="2"/><text x="${W - pr}" y="${Y(target) - 6}" text-anchor="end" style="fill:var(--ink)">objectif ${target}</text>`;
  const last = bars[bars.length - 1];
  s += `<text x="${pl + slot * (bars.length - 1) + slot / 2}" y="${Y(last.v) - 6}" text-anchor="middle" style="fill:var(--ink);font-weight:600">${last.v}</text></svg><div class="tip" hidden></div>`;
  el.innerHTML = s;
  const tip = el.querySelector(".tip");
  const show = r => { const b = bars[+r.dataset.i]; tip.innerHTML = `<b>${b.v} séance${b.v > 1 ? "s" : ""}</b><br>${esc(b.label)}`; tip.hidden = false; const x = +r.getAttribute("x") + slot / 2; tip.style.left = Math.min(W - tip.offsetWidth - 4, Math.max(0, x - tip.offsetWidth / 2)) + "px"; tip.style.top = (Y(b.v) - tip.offsetHeight - 10) + "px"; };
  el.querySelectorAll(".hit").forEach(r => { r.addEventListener("pointerenter", () => show(r)); r.addEventListener("focus", () => show(r)); r.addEventListener("pointerleave", () => { tip.hidden = true; }); r.addEventListener("blur", () => { tip.hidden = true; }); });
}
function lineChart(el, pts) {
  const W = Math.max(280, el.clientWidth || 320), H = 210, pl = 40, pr = 16, pt = 16, pb = 26;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v));
  const step = niceStep(Math.max(hi - lo, hi * 0.1, 1), 3);
  const yMin = Math.floor((lo - step * 0.3) / step) * step, yMax = Math.ceil((hi + step * 0.3) / step) * step;
  const X = t => t1 === t0 ? (pl + W - pr) / 2 : pl + (t - t0) / (t1 - t0) * (W - pl - pr);
  const Y = v => pt + (1 - (v - yMin) / (yMax - yMin)) * (H - pt - pb);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Force estimée au fil des séances">`;
  for (let v = yMin; v <= yMax + 0.001; v += step) s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end">${f0(v)}</text>`;
  s += `<text x="${pl}" y="${H - 6}">${dateFr(t0, { day: "numeric", month: "short" })}</text><text x="${W - pr}" y="${H - 6}" text-anchor="end">${dateFr(t1, { day: "numeric", month: "short" })}</text>`;
  const path = pts.map((p, i) => `${i ? "L" : "M"}${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  s += `<path d="${path} L${X(t1).toFixed(1)},${Y(yMin)} L${X(t0).toFixed(1)},${Y(yMin)} Z" fill="var(--bar)" opacity=".1"/><path d="${path}" fill="none" stroke="var(--bar)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  pts.forEach(p => { s += `<circle cx="${X(p.t)}" cy="${Y(p.v)}" r="${p.pr ? 5.5 : 4}" fill="${p.pr ? "var(--yellow)" : "var(--bar)"}" stroke="var(--surface)" stroke-width="2"/>`; });
  const lp = pts[pts.length - 1];
  s += `<text x="${Math.min(W - pr, X(lp.t))}" y="${Y(lp.v) - 10}" text-anchor="end" style="fill:var(--ink);font-weight:600">${f1(lp.v)} kg</text>`;
  s += `<line class="xh" x1="0" x2="0" y1="${pt}" y2="${H - pb}" stroke="var(--muted)" stroke-width="1" visibility="hidden"/><rect class="hit" x="${pl}" y="${pt}" width="${W - pl - pr}" height="${H - pt - pb}" fill="transparent" tabindex="0" aria-label="Survole ou parcours la courbe pour voir chaque séance"/></svg><div class="tip" hidden></div>`;
  el.innerHTML = s;
  const tip = el.querySelector(".tip"), xh = el.querySelector(".xh"), hit = el.querySelector(".hit");
  let cur = pts.length - 1;
  const show = i => { cur = i; const p = pts[i]; xh.setAttribute("x1", X(p.t)); xh.setAttribute("x2", X(p.t)); xh.setAttribute("visibility", "visible"); tip.innerHTML = `<b>${f1(p.v)} kg</b> estimés${p.pr ? " · record" : ""}<br>${dateFr(p.t)} · ${esc(p.set)}`; tip.hidden = false; tip.style.left = Math.min(W - tip.offsetWidth - 4, Math.max(0, X(p.t) - tip.offsetWidth / 2)) + "px"; tip.style.top = Math.max(0, Y(p.v) - tip.offsetHeight - 12) + "px"; };
  const nearest = cx => { let b = 0, bd = Infinity; pts.forEach((p, i) => { const d = Math.abs(X(p.t) - cx); if (d < bd) { bd = d; b = i; } }); return b; };
  hit.addEventListener("pointermove", ev => { const r = el.querySelector("svg").getBoundingClientRect(); show(nearest((ev.clientX - r.left) * (W / r.width))); });
  hit.addEventListener("pointerleave", () => { tip.hidden = true; xh.setAttribute("visibility", "hidden"); });
  hit.addEventListener("focus", () => show(cur));
  hit.addEventListener("blur", () => { tip.hidden = true; xh.setAttribute("visibility", "hidden"); });
  hit.addEventListener("keydown", ev => { if (ev.key === "ArrowRight") { show(Math.min(pts.length - 1, cur + 1)); ev.preventDefault(); } if (ev.key === "ArrowLeft") { show(Math.max(0, cur - 1)); ev.preventDefault(); } });
}
function exSeries(list, key) {
  const asc = list.slice().sort((a, b) => a.startedAt - b.startedAt);
  let best = 0;
  const pts = [];
  asc.forEach(w => { const x = w.ex.find(y => keyOf(y) === key); if (!x) return; const b = bestSet(x.sets); if (!b) return; const pr = pts.length > 0 && b.e > best + 0.05; best = Math.max(best, b.e); pts.push({ t: w.startedAt, v: Math.round(b.e * 10) / 10, pr, set: `${f1(b.w)} kg × ${b.r}` }); });
  return pts;
}

/* ===== Progrès ===== */
function renderProgress() {
  const V = $("#v-progres");
  const real = workouts.length > 0, list = real ? workouts : demo;
  if (!list) { V.innerHTML = `<section><h1>Progrès</h1><div class="card"><p>Après quelques séances, tu verras ici ta régularité, ta force estimée sur chaque exercice, tes records et tes séries par muscle.</p><div class="row" style="margin-top:10px"><button type="button" class="btn2" data-act="demo">Voir un exemple</button></div></div></section>`; return; }
  const st = from(), target = +st.days || program().sessions.length, now = Date.now();
  const ws0 = weekStart(now);
  const bars = Array.from({ length: 12 }, (_, i) => { const ws = ws0 - (11 - i) * 7 * DAY; const v = list.filter(w => w.startedAt >= ws && w.startedAt < ws + 7 * DAY).length; return { v, label: `Semaine du ${dateFr(ws, { day: "numeric", month: "long" })}`, short: dateFr(ws, { day: "numeric", month: "numeric" }) }; });
  const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
  const month = list.filter(w => w.startedAt >= monthStart);
  const counts = {};
  list.forEach(w => w.ex.forEach(x => { if (bestSet(x.sets)) { const k = keyOf(x); counts[k] = counts[k] || { n: x.n, c: 0, id: x.id }; counts[k].c++; } }));
  const exKeys = Object.keys(counts).filter(k => counts[k].c >= 2).sort((a, b) => counts[b].c - counts[a].c);
  if (!progKey || !exKeys.includes(progKey)) progKey = exKeys.find(k => { const e = EXI[counts[k].id]; return e && e.k === "c"; }) || exKeys[0] || null;
  const records = Object.keys(counts).map(k => { let best = null, when = 0, maxW = 0; list.forEach(w => { const x = w.ex.find(y => keyOf(y) === k); if (!x) return; const b = bestSet(x.sets); if (b && (!best || b.e > best.e)) { best = b; when = w.startedAt; } x.sets.forEach(s => { if ((s.w || 0) > maxW) maxW = s.w; }); }); return { k, n: counts[k].n, best, when, maxW }; }).filter(r => r.best && r.maxW).sort((a, b) => b.best.e - a.best.e);
  const [lo, hi] = band(st);
  const mv = muscleSets(list, ws0);
  const mkeys = Object.keys(MUS).filter(k => k !== "abdos");
  const vmax = Math.max(hi + 4, ...mkeys.map(k => mv[k]));
  const sc = v => v / vmax * 100;
  V.innerHTML = `<section><h1>Progrès</h1>${!real ? demoBanner() : ""}</section>
  <section class="stats"><div class="stat"><span>Séances ce mois</span><b>${month.length}</b></div><div class="stat"><span>Records ce mois</span><b>${month.reduce((t, w) => t + (w.prs ? w.prs.length : 0), 0)}</b></div><div class="stat"><span>Série en cours</span><b>${streak(list, target)} sem.</b></div></section>
  <section class="card"><div class="sechead"><h2>Régularité</h2><span class="muted small">séances par semaine</span></div><div class="chart" id="ch-weeks"></div>
    <details><summary>Voir les données</summary><div class="tbl"><table><thead><tr><th>Semaine</th><th class="n">Séances</th></tr></thead><tbody>${bars.map(b => `<tr><td>${esc(b.label)}</td><td class="n">${b.v}</td></tr>`).join("")}</tbody></table></div></details></section>
  <section class="gate ${isPro() ? "" : "locked"}"><div class="body" style="display:grid;gap:22px"${isPro() ? "" : " inert"}>
    <div class="card" style="display:grid;gap:10px"><div class="sechead"><h2>Force estimée</h2><span class="muted small">1RM estimé (formule d'Epley)</span></div>
      ${exKeys.length ? `<label class="sr" for="prog-ex">Exercice</label><select id="prog-ex">${exKeys.map(k => `<option value="${esc(k)}"${k === progKey ? " selected" : ""}>${esc(counts[k].n)}</option>`).join("")}</select><div class="chart" id="ch-e1rm"></div><p class="muted small">Point jaune : record battu ce jour-là.</p>` : `<p class="muted">Fais un exercice au moins deux fois pour voir sa courbe.</p>`}</div>
    <div class="card"><div class="sechead"><h2>Séries par muscle</h2><span class="muted small">cette semaine · cible ${lo} à ${hi}</span></div>
      <div class="vol">${mkeys.map(k => `<div class="vrow"><span class="vname">${MUS[k]}</span><div class="vtrack"><div class="vband" style="left:${sc(lo)}%;width:${sc(hi) - sc(lo)}%"></div>${mv[k] > 0 ? `<div class="vfill" style="width:${sc(mv[k])}%"></div>` : ""}</div><span class="vval${mv[k] < lo ? " low" : ""}">${f1(mv[k])}${mv[k] < lo ? " ↓" : mv[k] > hi ? " ↑" : ""}</span></div>`).join("")}</div>
      <p class="muted small" style="margin-top:8px">Séries validées depuis lundi : 1 pour le muscle visé, 0,5 pour les muscles qui aident. Zone verte : ta cible hebdomadaire.</p></div>
    <div class="card"><h2>Records</h2><div class="tbl"><table><thead><tr><th>Exercice</th><th class="n">Force estimée</th><th class="n">Meilleure série</th><th class="n">Date</th></tr></thead><tbody>${records.slice(0, 15).map(r => `<tr><td>${esc(r.n)}</td><td class="n">${f1(r.best.e)} kg</td><td class="n">${f1(r.best.w)} × ${r.best.r}</td><td class="n">${dateFr(r.when, { day: "numeric", month: "short" })}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="ai" id="ai-box"><div class="sechead"><h2>Analyse du coach</h2><span class="muted small">même expertise que le coach Fonte</span></div>
      <p class="muted small">Le coach lit tes 8 dernières semaines : ce qui progresse, ce qui stagne, et tes ajustements pour les deux prochaines semaines.</p>
      <div class="txt" id="ai-txt">${ai.text ? md(ai.text) : ""}</div>${ai.note ? `<p class="note">${esc(ai.note)}</p>` : ""}
      <div class="row"><button type="button" class="primary" data-act="ai" id="ai-btn"${!real || ai.busy ? " disabled" : ""}>${ai.text ? "Relancer l'analyse" : "Analyser mes progrès"}</button>${ai.busy ? `<button type="button" class="btn2" data-act="ai-stop">Arrêter</button>` : ""}${!real ? `<span class="muted small">Disponible avec tes vraies séances.</span>` : ""}</div></div>
  </div>${isPro() ? "" : `<div class="gatemsg"><div><b>Courbes, records, séries par muscle et analyse du coach</b><span class="muted small">Inclus dans Premium${profile.bundle ? ` à ${PRICE.bundle} par mois avec ton programme` : ""}.</span><button type="button" class="unlock" data-act="go-offre">Voir l'offre</button></div></div>`}</section>`;
  barChart($("#ch-weeks"), bars, target);
  const sel = $("#prog-ex");
  if (sel) {
    const draw = () => { const pts = exSeries(list, progKey); if (pts.length) lineChart($("#ch-e1rm"), pts); };
    sel.addEventListener("change", () => { progKey = sel.value; draw(); });
    draw();
  }
}

/* ===== Offre ===== */
function renderOffre() {
  const V = $("#v-offre"), P = profile.program, st = from();
  const pro = isPro(), bundle = profile.bundle;
  V.innerHTML = `${importBanner()}<section><h1>Ton offre</h1><p class="muted">Fonte Suivi est relié à ton programme Fonte : tes séances, tes charges et tes progrès au même endroit.</p></section>
  <section class="plans">
    <div class="plancard"><div class="sechead"><h3>Gratuit</h3>${!pro ? '<span class="badge">Offre actuelle</span>' : ""}</div><div class="price">0 €</div>
      <ul><li>Enregistrement des séances et minuteur de repos</li><li>Import de ton programme Fonte</li><li>Historique des 30 derniers jours</li><li>Régularité semaine par semaine</li></ul>
      ${pro ? '<button type="button" class="btn2" data-act="plan-free">Revenir au gratuit</button>' : ""}</div>
    <div class="plancard ${bundle ? "best" : ""}"><div class="sechead"><h3>Premium</h3>${pro ? '<span class="badge">Offre actuelle</span>' : bundle ? '<span class="badge pr">−50 % avec ton programme</span>' : ""}</div>
      <div class="price">${bundle ? PRICE.bundle : PRICE.premium} <small>par mois</small> ${bundle ? `<span class="old">${PRICE.premium}</span>` : ""}</div>
      <ul><li>Conseil de charge à chaque exercice (double progression)</li><li>Courbes de force estimée et records</li><li>Séries par muscle comparées à ta cible</li><li>Analyse de tes progrès par le coach IA</li><li>Historique illimité</li></ul>
      ${bundle ? "" : `<p class="muted small">${PRICE.bundle} par mois si tu as débloqué ton programme dans Fonte.</p>`}
      ${pro ? "" : `<button type="button" class="unlock" data-act="plan-pro">Passer à Premium (${bundle ? PRICE.bundle : PRICE.premium} / mois)</button><p class="muted small">Mode démo : activation sans paiement. En production, ce bouton ouvre la page d'abonnement.</p>`}</div>
  </section>
  <section class="card" style="display:grid;gap:10px"><h2>Ton programme Fonte</h2>
    ${P ? `<p><b>${esc(LABEL.goal[st.goal])}</b> · ${esc(LABEL.level[st.level])} · ${P.sessions.length} séances · ${esc(LABEL.eq[st.eq])}${st.pain && st.pain.length ? ` · ménage : ${st.pain.map(z => ZONES[z].toLowerCase()).join(", ")}` : ""}</p><p class="muted small">Importé le ${dateFr(profile.importedAt || Date.now(), { day: "numeric", month: "long", year: "numeric" })}${P.paid ? " · programme débloqué, offre −50 % active" : " · programme gratuit : débloque-le dans Fonte pour obtenir −50 % sur Premium"}.</p>` : `<p class="muted">Tu utilises le programme d'exemple. Importe le tien : dans Fonte, onglet Programme, touche « Ouvrir Fonte Suivi avec mon programme », ou copie le code et colle-le ici.</p>`}
    <label for="code-in" class="small"><b>Code de programme Fonte</b></label><textarea id="code-in" class="code" placeholder="Colle ici le code copié dans Fonte (il commence par F1)"></textarea>
    <div class="row"><button type="button" class="primary" data-act="import-code">Importer</button><a href="${FONTE_URL}" target="_blank" rel="noopener">Ouvrir Fonte</a></div></section>
  <section class="card" style="display:grid;gap:10px"><h2>Tes données</h2><p class="muted small">${storeMode === "db" ? "Tes séances sont enregistrées sur ton compte et synchronisées entre tes appareils. Elles ne sont visibles que par toi." : "Tes séances sont enregistrées sur cet appareil."} ${workouts.length} séance${workouts.length > 1 ? "s" : ""} enregistrée${workouts.length > 1 ? "s" : ""}.</p>
    <div class="row"><button type="button" class="btn2" data-act="csv" id="csv-btn"${runtimeDone && !downloads ? " hidden" : ""}>Exporter mes séances (CSV)</button><button type="button" class="btn2" data-act="wipe">Tout effacer</button></div></section>`;
}

/* ===== Analyse du coach (IA) ===== */
function md(src) {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
  const lines = String(src).replace(/\r/g, "").split("\n");
  let html = "", list = null, para = [];
  const flush = () => { if (para.length) { html += "<p>" + para.map(inline).join("<br>") + "</p>"; para = []; } };
  const close = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const l of lines) {
    let m;
    if ((m = l.match(/^\s*#{1,6}\s+(.*)$/))) { flush(); close(); html += `<h4>${inline(m[1])}</h4>`; }
    else if ((m = l.match(/^\s*[-*•]\s+(.*)$/))) { flush(); if (list !== "ul") { close(); html += "<ul>"; list = "ul"; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = l.match(/^\s*(\d+)[.)]\s+(.*)$/))) { flush(); if (list !== "ol") { close(); html += "<ol>"; list = "ol"; } html += `<li>${inline(m[2])}</li>`; }
    else if (!l.trim()) { flush(); close(); }
    else { close(); para.push(l.replace(/^\|/, "").replace(/\|$/, "").replace(/\|/g, " · ")); }
  }
  flush(); close();
  return html;
}
function analysisData() {
  const st = from(), P = program(), now = Date.now(), since = now - 56 * DAY;
  const W = workouts.filter(w => w.startedAt >= since).sort((a, b) => a.startedAt - b.startedAt);
  const L = [];
  L.push(`Profil : objectif ${LABEL.goal[st.goal]} ; niveau ${LABEL.level[st.level]} ; programme de ${P.sessions.length} séances par semaine (${LABEL.time[st.time] || ""}) ; matériel ${LABEL.eq[st.eq]} ; zones à ménager : ${st.pain && st.pain.length ? st.pain.map(z => ZONES[z].toLowerCase()).join(", ") : "aucune"}${P.example ? " (programme d'exemple)" : ""}.`);
  const ws0 = weekStart(now);
  L.push("Séances par semaine (de la plus ancienne à la semaine en cours) : " + Array.from({ length: 8 }, (_, i) => { const ws = ws0 - (7 - i) * 7 * DAY; return W.filter(w => w.startedAt >= ws && w.startedAt < ws + 7 * DAY).length; }).join(", ") + `. Objectif : ${st.days}.`);
  if (W.length) L.push(`Durée moyenne : ${Math.round(W.reduce((t, w) => t + w.dur, 0) / W.length / 60)} min. Volume moyen : ${f0(W.reduce((t, w) => t + (w.vol || 0), 0) / W.length)} kg par séance.`);
  const counts = {};
  W.forEach(w => w.ex.forEach(x => { const k = keyOf(x); counts[k] = counts[k] || { n: x.n, c: 0, target: x.target }; counts[k].c++; }));
  Object.keys(counts).sort((a, b) => counts[b].c - counts[a].c).slice(0, 10).forEach(k => {
    const pts = exSeries(W, k);
    const h = history(k).slice(0, 3);
    const tgt = counts[k].target ? ` (objectif ${counts[k].target.sets} × ${counts[k].target.reps})` : "";
    const trend = pts.length >= 2 ? ` ; force estimée ${f1(pts[0].v)} → ${f1(pts[pts.length - 1].v)} kg (${pts[pts.length - 1].v >= pts[0].v ? "+" : ""}${f1((pts[pts.length - 1].v / pts[0].v - 1) * 100)} %)` : "";
    L.push(`- ${counts[k].n}${tgt} : ${counts[k].c} séance(s)${trend} ; 3 dernières : ${h.map(o => `${dateFr(o.w.startedAt, { day: "numeric", month: "short" })} ${setsTxt(o.x.sets)}`).join(" | ")}`);
  });
  const mv = muscleSets(workouts, ws0 - 7 * DAY);
  L.push(`Séries par muscle sur les 2 dernières semaines (fractionnelles) : ${Object.keys(MUS).map(k => `${MUS[k]} ${f1(mv[k])}`).join(" ; ")}. Cible hebdomadaire de son profil : ${band(st).join(" à ")} par muscle.`);
  const notes = workouts.flatMap(w => w.ex.filter(x => x.note).map(x => `${dateFr(w.startedAt, { day: "numeric", month: "short" })}, ${x.n} : ${x.note}`)).slice(0, 6);
  if (notes.length) L.push("Notes récentes : " + notes.join(" | "));
  return L.join("\n");
}
async function runAnalysis() {
  if (ai.busy) return;
  if (!sample) { ai.note = "L'analyse du coach n'est pas disponible dans cette vue (connexion à Claude nécessaire)."; renderProgress(); return; }
  const relaunch = !!ai.text;
  ai.busy = true; ai.text = ""; ai.note = ""; ai.ctl = new AbortController();
  renderProgress();
  const txt = $("#ai-txt");
  if (txt) txt.innerHTML = `<p class="thinking">Le coach lit tes séances… (la première fois, Claude te demande d'autoriser la page)</p>`;
  const prompt = CERVEAU + "\n\n=== MISSION DANS FONTE SUIVI ===\nTu es dans Fonte Suivi, le carnet d'entraînement relié à Fonte. Ici tu n'as pas d'outils et tu ne modifies rien : tu analyses les séances enregistrées ci-dessous. Réponds avec ces titres : ### Ce qui progresse ; ### Ce qui stagne (et les causes probables) ; ### Tes ajustements pour les 2 prochaines semaines (charges, séries, exercices précis, en citant ses chiffres) ; ### Récupération et régularité ; puis termine par une ligne « Ta priorité : ... ». 350 mots maximum. Si les données sont trop peu nombreuses pour conclure, dis-le et donne quoi surveiller.\n\n=== SES SÉANCES (8 dernières semaines) ===\n" + analysisData();
  try {
    const res = await sample(prompt, { signal: ai.ctl.signal, cache: relaunch ? false : true, onText: ({ text }) => { ai.text = text; const t = $("#ai-txt"); if (t) t.innerHTML = md(text); } });
    ai.text = res.text;
    if (res.truncated) ai.note = "Analyse coupée : relance-la pour la suite.";
  } catch (e) {
    const code = (e && e.code) || "upstream_error";
    ai.text = code === "refused" ? "" : (e.text || ai.text || "");
    ai.note = { cancelled: "Analyse arrêtée.", not_granted: "Tu n'as pas autorisé la page à utiliser Claude pour cette visite.", sampling_disabled: "Claude n'est pas disponible pour ce compte.", rate_limited: "Trop de demandes ou limite d'utilisation atteinte : réessaie plus tard.", session_expired: "Ta session Claude a expiré : reconnecte-toi puis relance.", refused: "Le coach n'a pas pu produire cette analyse.", prompt_too_large: "Trop de données à analyser d'un coup." }[code] || "Analyse interrompue (problème de connexion). Réessaie.";
    if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(code)) sample = null;
  } finally {
    ai.busy = false; ai.ctl = null;
    if (view === "progres") renderProgress();
  }
}
async function exportCSV() {
  if (!downloads) { toast("Le téléchargement n'est pas disponible dans cette vue."); return; }
  if (!workouts.length) { toast("Aucune séance à exporter pour l'instant."); return; }
  const rows = [["Date", "Séance", "Exercice", "Série", "Charge (kg)", "Répétitions"]];
  workouts.slice().reverse().forEach(w => w.ex.forEach(x => x.sets.forEach((s, j) => rows.push([new Date(w.startedAt).toLocaleDateString("fr-FR"), w.name, x.n, j + 1, s.w == null ? "" : String(s.w).replace(".", ","), s.r ?? ""]))));
  const cell = c => { const v = String(c); return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  const csv = "﻿" + rows.map(r => r.map(cell).join(";")).join("\r\n");
  try {
    const res = await downloads.save({ filename: "fonte-suivi.csv", data: csv });
    if (res && res.status === "saved") toast("Export enregistré.");
  } catch (e) {
    const code = e && e.code;
    if (code === "declined") return;
    if (["unavailable", "not_granted", "capability_disabled", "capability_removed"].includes(code)) { downloads = null; renderOffre(); toast("Le téléchargement n'est pas disponible dans cette vue."); }
    else toast("L'export n'a pas pu être créé.");
  }
}

/* ===== Événements ===== */
document.querySelector(".nav").addEventListener("click", e => { const b = e.target.closest("[data-view]"); if (!b) return; if (b.dataset.view === "historique") detailId = null; setView(b.dataset.view); window.scrollTo(0, 0); });
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (e.target === $("#sheet")) { closeSheet(); return; }
  if (!b) {
    const chip = e.target.closest("#lib-eq [data-eq], #lib-p [data-p]");
    if (chip && lib) { if (chip.dataset.eq != null) lib.eq = chip.dataset.eq; else lib.p = chip.dataset.p; chip.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === chip ? "true" : "false")); renderLibList(); }
    return;
  }
  const act = b.dataset.act, i = b.dataset.i != null ? +b.dataset.i : null;
  switch (act) {
    case "start": startWorkout(+b.dataset.si); break;
    case "start-free": startFree(); break;
    case "done": { const row = b.closest(".srow"); toggleDone(+row.dataset.i, +row.dataset.j); break; }
    case "add-set": { const x = active.ex[i], ls = x.sets[x.sets.length - 1]; x.sets.push({ w: null, r: null, done: false, pw: ls ? (ls.w ?? ls.pw) : null, pr: ls ? (ls.r ?? ls.pr) : null }); saveActive(); rerenderCard(i); break; }
    case "del-set": { const x = active.ex[i]; if (x.sets.length > 1) { x.sets.pop(); saveActive(); rerenderCard(i); } break; }
    case "ex-menu": { const m = $("#exm-" + i); m.hidden = !m.hidden; b.setAttribute("aria-expanded", m.hidden ? "false" : "true"); break; }
    case "cues": { const c = $("#cues-" + i); c.hidden = !c.hidden; break; }
    case "note": { const x = active.ex[i]; x.showNote = true; rerenderCard(i); const t = document.querySelector(`.note-in[data-i="${i}"]`); if (t) t.focus(); break; }
    case "replace": openLibrary("replace", i); break;
    case "up": case "down": { const j = act === "up" ? i - 1 : i + 1; const a = active.ex; [a[i], a[j]] = [a[j], a[i]]; saveActive(); renderSeance(true); break; }
    case "remove-ex": { const x = active.ex[i]; const doIt = () => { active.ex.splice(i, 1); saveActive(); closeSheet(); renderSeance(true); }; if (x.sets.some(s => s.done)) openConfirm(`Retirer « ${x.n} » et ses séries validées ?`, "Retirer", doIt); else doIt(); break; }
    case "add-ex": openLibrary("add"); break;
    case "lib-pick": pickExercise(EXI[b.dataset.id]); break;
    case "lib-custom": pickExercise(null, lib.q.trim()); break;
    case "finish": finishWorkout(); break;
    case "save-workout": saveFinished(); break;
    case "discard": openConfirm("Abandonner la séance en cours ? Rien ne sera enregistré.", "Abandonner", discardWorkout); break;
    case "sheet-close": closeSheet(); break;
    case "confirm-ok": { const fn = confirmFn; confirmFn = null; if (fn) fn(); else closeSheet(); break; }
    case "rest-minus": if (rest) { rest.end -= 15000; rest.total = Math.max(15, rest.total - 15); tickRest(); } break;
    case "rest-plus": if (rest) { rest.end += 15000; rest.total += 15; rest.over = false; $("#rest-in").classList.remove("over"); tickRest(); } break;
    case "rest-skip": stopRest(); break;
    case "go-offre": setView("offre"); window.scrollTo(0, 0); break;
    case "go-seance": setView("seance"); break;
    case "open-w": detailId = b.dataset.id; renderHistory(); window.scrollTo(0, 0); break;
    case "back": detailId = null; renderHistory(); break;
    case "redo": { const w = workouts.find(x => x.id === b.dataset.id); if (w) startFrom(w); break; }
    case "delete-w": openConfirm("Supprimer définitivement cette séance ?", "Supprimer", () => { removeWorkout(b.dataset.id); detailId = null; closeSheet(); renderHistory(); toast("Séance supprimée."); }); break;
    case "demo": demo = makeDemo(); render(); break;
    case "demo-off": demo = null; detailId = null; render(); break;
    case "ai": runAnalysis(); break;
    case "ai-stop": if (ai.ctl) ai.ctl.abort(); break;
    case "plan-pro": profile.plan = "premium"; saveProfile(); render(); toast(profile.bundle ? `Premium activé à ${PRICE.bundle} par mois (démo).` : "Premium activé (démo)."); break;
    case "plan-free": profile.plan = "free"; saveProfile(); render(); break;
    case "import-code": { const v = $("#code-in").value; if (!v.trim()) { toast("Colle d'abord le code copié dans Fonte."); return; } importCode(v); break; }
    case "import-pending": if (pendingCode) importCode(pendingCode); break;
    case "ignore-pending": profile.lastCode = fp(pendingCode || ""); pendingCode = null; saveProfile(); render(); break;
    case "csv": exportCSV(); break;
    case "wipe": openConfirm("Effacer toutes tes séances et ton programme importé ? C'est définitif.", "Tout effacer", wipeAll); break;
  }
});
document.addEventListener("input", e => {
  const t = e.target;
  if (t.matches(".srow input")) {
    const row = t.closest(".srow"), s = active && active.ex[+row.dataset.i].sets[+row.dataset.j];
    if (!s) return;
    s[t.dataset.f] = num(t.value);
    saveActive();
  } else if (t.matches(".note-in")) { const x = active && active.ex[+t.dataset.i]; if (x) { x.note = t.value.slice(0, 500); saveActive(); } }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("#sheet").hidden) closeSheet();
  if (e.key === "Enter" && e.target.matches(".srow input")) { e.preventDefault(); const row = e.target.closest(".srow"); if (e.target.dataset.f === "w") row.querySelector('[data-f="r"]').focus(); else toggleDone(+row.dataset.i, +row.dataset.j); }
});
window.addEventListener("hashchange", () => { const c = hashCode(); if (c && fp(c) !== profile.lastCode) { pendingCode = c; render(); } });

/* ===== Démarrage ===== */
async function initRuntime() {
  const c = window.claude;
  if (!c || typeof c.use !== "function") { runtimeDone = true; downloads = null; return; }
  c.use("downloads").then(d => { downloads = d; }).catch(() => { downloads = null; }).finally(() => { runtimeDone = true; if (view === "offre") renderOffre(); });
  try { sample = await c.use("sample"); } catch (e) { sample = null; }
}
const hot = window.claude && window.claude.hot;
if (hot && typeof hot.snapshot === "function") hot.snapshot(() => ({ fs: 1, active, view }));
function boot(d) {
  if (d && d.fs === 1) { if (d.active) active = d.active; if (d.view) view = d.view; }
  setView(view);
  initStore();
  initRuntime();
}
if (hot && typeof hot.ready === "function") hot.ready(boot); else boot(hot ? hot.data : null);
