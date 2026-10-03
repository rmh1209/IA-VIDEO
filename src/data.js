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
