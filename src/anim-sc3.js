/* ===== Démonstrations : tirages, bras, gainage, puis correspondance exercice → scène ===== */
DSC.row_bar = {
  base: { ...DST, hipAt: [124, 132], torso: 40, neck: 30, ep: "up" },
  f: [{ wristAt: [165, 162] }, { wristAt: [146, 136] }],
  tl: [[1, .9, "Tire vers le nombril, omoplates serrées"], [1, .4, "Coudes vers le plafond"], [0, 1.6, "Descends en contrôle"], [0, .4, "Dos plat, buste à 45°"]],
  eq: [{ t: "plate", c: ["wrist", 0, 0], r: 21 }],
  g: "barre olympique et disques"
};
DSC.row_cable = {
  base: { root: "hip", at: [120, 176], ankleAt: [206, 180], kp: "up", foot: 80, ep: "back" },
  f: [{ torso: 84, neck: 86, wristAt: [180, 150] }, { torso: 94, neck: 92, wristAt: [146, 160] }],
  tl: [[1, 1, "Tire vers le bas du ventre, poitrine sortie"], [1, .4, "Coudes en arrière"], [0, 1.6, "Laisse les omoplates s'écarter"], [0, .4, "Buste fixe"]],
  eq: [
    { t: "bench", x1: 78, x2: 168, y: 184 }, { t: "l", a: [218, 156], b: [218, 210], w: 5 }, { t: "l", a: [218, 210], b: [236, 217], w: 4 },
    { t: "cable", a: [226, 170], b: ["wrist", 0, 0] }, { t: "handle", c: ["wrist", 0, 0], z: 1 }
  ],
  g: "poulie basse assise avec poignée"
};
DSC.row_db1 = {
  base: { root: "hip", at: [104, 120], torso: 15, neck: 10, ankleAt: [124, 208], kp: "front", thigh2: 90, shin2: 0, foot2: 185, wrist2At: [162, 167], ep2: "back", ep: "up" },
  f: [{ wristAt: [157, 170] }, { wristAt: [118, 140] }],
  tl: [[1, 1, "Tire le coude vers la hanche"], [1, .4, "Dos plat"], [0, 1.6, "Descends en étirement complet"], [0, .4, "Descends en étirement complet"]],
  eq: [{ t: "bench", x1: 50, x2: 176, y: 171 }, { t: "db", c: ["wrist", 0, 2], a: 0, z: 1 }],
  g: "un banc et un haltère"
};
DSC.row_chest = {
  base: { root: "hip", at: [120, 150], torso: 35, neck: 28, ankleAt: [84, 208], kp: "front", ep: "up" },
  f: [{ wristAt: [166, 183] }, { wristAt: [136, 150] }],
  tl: [[1, 1, "Tire les haltères vers les hanches"], [1, .4, "Poitrine collée au banc"], [0, 1.6, "Redescends bras tendus"], [0, .4, "Aucun stress sur le bas du dos"]],
  eq: [
    { t: "l", a: [130, 165], b: [130, 217], w: 5 }, { t: "l", a: [168, 136], b: [190, 217], w: 4 },
    { t: "pad", a: [121.4, 162.4], b: [175.4, 124.6], w: 9 }, { t: "db", c: ["wrist", 0, 2], a: 0, z: 1 }
  ],
  g: "banc incliné et deux haltères"
};
DSC.row_inverted = {
  base: { root: "ankle", at: [260, 206], foot: 100, ep: "down", wristAt: [124, 124] },
  f: [{ shin: 172, thigh: 172, torso: 172, neck: 172 }, { shin: 152.7, thigh: 152.7, torso: 152.7, neck: 150 }],
  tl: [[1, 1, "Tire la poitrine vers le bord"], [1, .4, "Corps gainé"], [0, 1.5, "Redescends bras tendus"], [0, .4, "Pieds plus loin = plus dur"]],
  eq: [{ t: "l", a: [30, 122], b: [30, 217], w: 4 }, { t: "l", a: [138, 122], b: [138, 217], w: 4 }, { t: "r", x: 20, y: 114, w: 128, h: 8, rx: 2 }],
  g: "une table très solide ou une barre basse"
};
DSC.row_machine = {
  base: { root: "hip", at: [130, 166], torso: 88, neck: 88, thigh: 180, shin: 90, ep: "back" },
  f: [{ wristAt: [194, 116] }, { wristAt: [150, 118] }],
  tl: [[1, 1, "Tire les coudes vers l'arrière"], [1, 1, "Pause d'une seconde"], [0, 1.6, "Retour lent"], [0, .3, "Retour lent"]],
  eq: [
    { t: "l", a: [236, 50], b: [236, 217], w: 6 }, { t: "l", a: [150, 110], b: [236, 110], w: 3 },
    { t: "pad", a: [145, 98], b: [145, 140], w: 8 }, { t: "pad", a: [104, 175], b: [150, 175], w: 8 }, { t: "l", a: [128, 179], b: [128, 217], w: 5 },
    { t: "handle", c: ["wrist", 0, 0], z: 1 }
  ],
  g: "machine de rowing à appui poitrine"
};
DSC.superman = {
  base: { root: "hip", at: [130, 210], thigh: 0, shin: 0, foot: 185 },
  f: [
    { torso: 0, neck: 8, elbowAt: ["shoulder", 33, -2], wristAt: ["shoulder", 64, -4] },
    { torso: 10, neck: 16, elbowAt: ["shoulder", -17, 5], wristAt: ["shoulder", -4, -16] }
  ],
  tl: [[1, 1, "Soulève le buste, coudes vers les côtes"], [1, 2, "Serre les omoplates 2 s"], [0, 1.2, "Tends les bras devant"], [0, .5, "Tends les bras devant"]],
  eq: [{ t: "mat", x1: 30, x2: 280 }],
  g: "aucun (un tapis)"
};
DSC.pulldown = {
  base: { root: "hip", at: [140, 166], thigh: 180, shin: 92, ep: "down" },
  f: [{ torso: 92, neck: 92, wristAt: [146, 50] }, { torso: 104, neck: 98, wristAt: [142, 104] }],
  tl: [[1, 1, "Tire vers le haut de la poitrine"], [1, .3, "Coudes vers les poches"], [0, 1.6, "Remonte, bras bien étirés"], [0, .4, "Cuisses bloquées"]],
  eq: [
    { t: "l", a: [100, 217], b: [100, 8], w: 6 }, { t: "l", a: [100, 10], b: [146, 10], w: 5 }, { t: "cable", a: [146, 12], b: ["wrist", 0, 0] },
    { t: "pad", a: [116, 175], b: [164, 175], w: 8 }, { t: "l", a: [140, 179], b: [140, 217], w: 5 },
    { t: "pad", a: [170, 155], b: [194, 155], w: 7, z: 1 }, { t: "bar", c: ["wrist", 0, 0], r: 3.5, z: 1 }
  ],
  g: "poste de tirage vertical"
};
DSC.pullover = {
  base: { root: "shoulder", at: [120, 209], torso: 180, neck: 175, ankleAt: [222, 208], kp: "up", ep: "cw" },
  f: [{ wristAt: [124, 147] }, { wristAt: [64, 204] }],
  tl: [[1, 2, "Descends derrière la tête, bras presque tendus"], [1, .3, "Étirement en bas"], [0, 1.4, "Ramène au-dessus de la poitrine"], [0, .5, "Ramène au-dessus de la poitrine"]],
  eq: [{ t: "mat", x1: 40, x2: 260 }, { t: "db", c: { s: ["elbow", "wrist"], a: 1.2, n: 0 }, a: "farm", z: 1 }],
  g: "un haltère et un tapis"
};
const DPULL_EQ = [{ t: "l", a: [96, -14], b: [96, 217], w: 6 }, { t: "l", a: [96, -14], b: [154, -14], w: 5 }, { t: "c", c: [154, -14], r: 4.5, k: "eqd" }];
DSC.pullup = {
  base: { root: "shoulder", wristAt: [154, -14], ep: "down", thigh: 98, shin: 50, foot: -40 },
  f: [{ at: [150, 50], torso: 90, neck: 90 }, { at: [147, 2], torso: 100, neck: 96 }],
  tl: [[1, 1, "Abaisse les épaules puis tire"], [1, .3, "Poitrine vers la barre"], [0, 1.6, "Descente complète, bras tendus"], [0, .5, "Descente complète, bras tendus"]],
  eq: DPULL_EQ,
  g: "une barre de traction"
};
DSC.pullup_neg = {
  base: { root: "shoulder", wristAt: [154, -14], ep: "down", thigh: 98, shin: 50, foot: -40 },
  f: [{ at: [150, 50], torso: 90, neck: 90 }, { at: [147, 2], torso: 100, neck: 96 }],
  tl: [[1, .8, "Monte en haut (saut ou chaise)"], [1, .4, "Position haute"], [0, 4, "Descends le plus lentement possible"], [0, .6, "Bras tendus en bas"]],
  eq: [...DPULL_EQ, { t: "box", x: 108, w: 58, h: 24 }],
  g: "une barre de traction (et une chaise pour monter)"
};
DSC.pullup_assist = {
  base: { root: "shoulder", wristAt: [154, -14], ep: "down", thigh: 98, shin: 50, foot: -40 },
  f: [{ at: [150, 50], torso: 90, neck: 90 }, { at: [147, 2], torso: 100, neck: 96 }],
  tl: [[1, 1, "Tire, l'élastique t'aide en bas"], [1, .3, "Poitrine vers la barre"], [0, 1.6, "Descente complète"], [0, .5, "Réduis l'aide au fil des semaines"]],
  eq: [...DPULL_EQ, { t: "band", a: [154, -14], b: ["knee", 2, 6], z: 1 }],
  g: "machine d'assistance ou élastique"
};

DSC.curl_db = {
  base: { ...DST, shin: 90, thigh: 90, torso: 90, neck: 90, uarm: 272 },
  f: [{ farm: 274 }, { farm: 422 }],
  tl: [[1, 1, "Monte, coudes fixes, paumes vers le haut"], [1, .3, "Contracte en haut"], [0, 2.5, "Descends en 2-3 s jusqu'à bras tendus"], [0, .3, "Descends en 2-3 s jusqu'à bras tendus"]],
  eq: [{ t: "dbe", c: ["wrist", 0, 0], z: 1 }],
  g: "deux haltères"
};
DSC.curl_hammer = {
  base: { ...DST, shin: 90, thigh: 90, torso: 90, neck: 90, uarm: 272 },
  f: [{ farm: 274 }, { farm: 422 }],
  tl: [[1, 1, "Monte, pouces vers le haut"], [1, .3, "Coudes fixes"], [0, 2.5, "Descends lentement"], [0, .3, "Descends lentement"]],
  eq: [{ t: "db", c: ["wrist", 0, 0], a: "farm+90", z: 1 }],
  g: "deux haltères"
};
DSC.curl_incline = {
  base: { root: "hip", at: [160, 166], torso: 125, neck: 115, thigh: 180, shin: 92, uarm: 270 },
  f: [{ farm: 272 }, { farm: 420 }],
  tl: [[1, 1, "Monte, bras derrière le buste"], [1, .3, "Contracte"], [0, 2.4, "Descends : étirement maximal"], [0, .3, "Descends : étirement maximal"]],
  eq: [
    { t: "l", a: [170, 180], b: [170, 217], w: 5 }, { t: "l", a: [126, 140], b: [112, 217], w: 4 },
    { t: "pad", a: [153.3, 175.6], b: [115.4, 121.5], w: 8 }, { t: "pad", a: [150, 176], b: [196, 176], w: 8 },
    { t: "dbe", c: ["wrist", 0, 0], z: 1 }
  ],
  g: "banc incliné et deux haltères"
};
DSC.curl_bar = {
  base: { ...DST, shin: 90, thigh: 90, torso: 90, neck: 90, uarm: 272 },
  f: [{ farm: 274 }, { farm: 422 }],
  tl: [[1, 1, "Monte, coudes fixes"], [1, .3, "Contracte en haut"], [0, 2.4, "Descente contrôlée"], [0, .3, "Descente contrôlée"]],
  eq: [{ t: "plate", c: ["wrist", 0, 0], r: 12 }],
  g: "barre EZ"
};
DSC.curl_preacher = {
  base: { root: "hip", at: [120, 164], torso: 80, neck: 84, thigh: 180, shin: 90, uarm: -45 },
  f: [{ farm: -50 }, { farm: 75 }],
  tl: [[1, 1, "Monte, aisselles calées"], [1, .3, "Contracte"], [0, 2.4, "Descends jusqu'à bras presque tendus"], [0, .3, "Forte tension en bas"]],
  eq: [
    { t: "l", a: [140, 146], b: [140, 217], w: 5 }, { t: "pad", a: [128.7, 122.9], b: [149.1, 143.3], w: 9 },
    { t: "pad", a: [96, 173], b: [140, 173], w: 8 }, { t: "l", a: [112, 177], b: [112, 217], w: 5 },
    { t: "plate", c: ["wrist", 0, 0], r: 12 }
  ],
  g: "pupitre à biceps et barre EZ"
};
DSC.curl_bag = {
  base: { ...DST, shin: 90, thigh: 90, torso: 90, neck: 90, uarm: 272, uarm2: 272, farm2: 274 },
  f: [{ farm: 274 }, { farm: 422 }],
  tl: [[1, 1, "Monte, coude fixe"], [1, .3, "Contracte"], [0, 2.4, "Descente lente"], [0, .3, "Va proche de l'échec"]],
  eq: [{ t: "bag", c: ["wrist", 0, 0], z: 1 }],
  g: "un sac à dos lesté (livres, bouteilles)"
};
DSC.tri_overhead = {
  base: { ...DST, shin: 90, thigh: 90, torso: 90, neck: 90, uarm: 96 },
  f: [{ farm: 250 }, { farm: 93 }],
  tl: [[1, 1, "Tends les bras au-dessus de la tête"], [1, .3, "Coudes pointés vers l'avant"], [0, 2.2, "Descends derrière la tête : étirement"], [0, .4, "Descends derrière la tête : étirement"]],
  eq: [{ t: "db", c: { s: ["elbow", "wrist"], a: 1.15, n: 0 }, a: "farm", z: 1 }],
  g: "un haltère (ou la poulie)", th: 0
};
DSC.pushdown = {
  base: { ...DST, shin: 90, thigh: 90, torso: 84, neck: 86, uarm: 272 },
  f: [{ farm: 10 }, { farm: -84 }],
  tl: [[1, .9, "Tends les bras, écarte la corde en bas"], [1, .4, "Coudes collés au buste"], [0, 1.6, "Remonte jusqu'à 90°"], [0, .2, "Remonte jusqu'à 90°"]],
  eq: [{ t: "tower", x: 196, top: 6, w: 20 }, { t: "cable", a: [196, 14], b: ["wrist", 0, 0] }, { t: "rope", c: ["wrist", 0, 0], z: 1 }],
  g: "poulie haute avec corde"
};
DSC.skull = {
  base: { root: "hip", at: [162, 160], torso: 180, neck: 178, ankleAt: [214, 208], kp: "up", uarm: 100 },
  f: [{ farm: 98 }, { farm: 205 }],
  tl: [[1, 1.8, "Fléchis les coudes vers le front"], [1, .3, "Coudes fixes"], [0, 1.1, "Tends les bras"], [0, .5, "Bras verticaux"]],
  eq: [{ t: "bench", x1: 64, x2: 190, y: 168 }, { t: "plate", c: ["wrist", 0, 0], r: 12 }],
  g: "banc plat et barre EZ (ou haltères)"
};
DSC.kickback = {
  base: { root: "hip", at: [104, 120], torso: 15, neck: 10, ankleAt: [124, 208], kp: "front", thigh2: 90, shin2: 0, foot2: 185, wrist2At: [162, 167], ep2: "back", uarm: 192 },
  f: [{ farm: 272 }, { farm: 192 }],
  tl: [[1, .9, "Tends l'avant-bras vers l'arrière"], [1, 1, "1 seconde bras tendu"], [0, 1.5, "Reviens, bras collé au corps"], [0, .3, "Reviens, bras collé au corps"]],
  eq: [{ t: "bench", x1: 50, x2: 176, y: 171 }, { t: "db", c: ["wrist", 0, 0], a: "farm+90", z: 1 }],
  g: "un banc et un haltère"
};
DSC.bench_dips = {
  base: { root: "shoulder", torso: 90, neck: 90, ankleAt: [212, 208], kp: "up", wristAt: [144, 163], ep: "back" },
  f: [{ at: [146, 100] }, { at: [154, 133] }],
  tl: [[1, 1.6, "Descends jusqu'à 90° aux coudes"], [1, .2, "Épaules basses"], [0, 1, "Pousse sur les mains"], [0, .5, "Jambes pliées = plus facile"]],
  eq: [{ t: "bench", x1: 76, x2: 150, y: 166 }],
  g: "un banc ou une chaise stable"
};

DSC.plank = {
  base: { root: "toe", at: [70, 214], uarm: 270, farm: 0 },
  f: [{ foot: -84, hipAt: [163, 206], torso: 30.7, neck: 30 }, { foot: -82.8, hipAt: [163.6, 186.2], torso: 7.2, neck: 8 }],
  tl: [[0, .6, "Avant-bras sous les épaules"], [1, 1, "Monte : corps aligné des talons à la tête"], [1, 4, "Serre fessiers et abdos, respire"], [0, 1, "Repose"]],
  eq: [{ t: "mat", x1: 40, x2: 280 }],
  g: "aucun (un tapis)"
};
DSC.dead_bug = {
  base: { root: "hip", at: [176, 209], torso: 180, neck: 178, foot: 90, foot2: 90 },
  f: [
    { thigh: 270, shin: 180, thigh2: 270, shin2: 180, uarm: 90, farm: 90, uarm2: 90, farm2: 90 },
    { thigh: 192, shin: 192, thigh2: 270, shin2: 180, uarm: 90, farm: 90, uarm2: 172, farm2: 172 },
    { thigh: 270, shin: 180, thigh2: 192, shin2: 192, uarm: 172, farm: 172, uarm2: 90, farm2: 90 }
  ],
  tl: [[1, 2, "Tends bras et jambe opposés en expirant"], [1, .4, "Lombaires plaquées au sol"], [0, 1.4, "Reviens"], [2, 2, "Change de côté"], [2, .4, "Lombaires plaquées au sol"], [0, 1.4, "Reviens"]],
  eq: [{ t: "mat", x1: 40, x2: 290 }],
  g: "aucun (un tapis)"
};
DSC.side_plank = {
  vlab: "vue de face",
  base: { root: "ankle", at: [60, 206], foot: 60, uarm: 270, farm: 300, faK: .3, uarm2: 90, farm2: 90, fa2K: 1 },
  f: [{ hipAt: [150, 204], torso: 26.2, neck: 26 }, { hipAt: [148.5, 189.4], torso: 10.6, neck: 12 }],
  tl: [[0, .5, "Coude sous l'épaule"], [1, 1, "Monte les hanches"], [1, 4, "Tiens, corps aligné"], [0, 1, "Repose"]],
  eq: [{ t: "mat", x1: 40, x2: 260 }],
  g: "aucun (un tapis)"
};
DSC.bird_dog = {
  base: { root: "knee", at: [104, 209], shin: 0, foot: 185, thigh: 90, torso: 17, neck: 12 },
  f: [{ uarm: 270, farm: 270, thigh2: 90, shin2: 0, foot2: 185 }, { uarm: 375, farm: 375, thigh2: -8, shin2: -8, foot2: 270 }],
  tl: [[1, 1.2, "Tends bras et jambe opposés"], [1, 2.5, "Tiens sans bouger le bassin"], [0, 1, "Reviens, puis change de côté"], [0, .6, "À quatre pattes, dos neutre"]],
  eq: [{ t: "mat", x1: 30, x2: 270 }],
  g: "aucun (un tapis)"
};
DSC.pallof = {
  view: "top", vlab: "vue de dessus", noGround: true,
  base: {},
  f: [{ ext: 0 }, { ext: 1 }],
  tl: [[1, 1, "Pousse les mains devant toi"], [1, 2, "Tiens 2 s sans laisser le buste tourner"], [0, 1, "Ramène les mains"], [0, .5, "Ramène les mains"]],
  g: "poulie réglée à hauteur de poitrine"
};
DSC.farmer = {
  base: { root: "hip", uarm: 270, farm: 270, torso: 90, neck: 90 },
  f: [
    { at: [150, 122], thigh: 110, shin: 105, foot: 15, thigh2: 70, shin2: 55, foot2: -30 },
    { at: [150, 118], thigh: 90, shin: 90, foot: 0, thigh2: 100, shin2: 60, foot2: -20 },
    { at: [150, 122], thigh: 70, shin: 55, foot: -30, thigh2: 110, shin2: 105, foot2: 15 },
    { at: [150, 118], thigh: 100, shin: 60, foot: -20, thigh2: 90, shin2: 90, foot2: 0 }
  ],
  tl: [[1, .35, "Petits pas, épaules basses"], [2, .35, "Petits pas, épaules basses"], [3, .35, "Buste droit, respire"], [0, .35, "Buste droit, respire"]],
  eq: [{ t: "db", c: ["wrist", 0, 2], a: 0, z: 1 }],
  g: "deux haltères lourds", th: 0
};
DSC.cable_crunch = {
  base: { root: "knee", at: [160, 209], shin: 0, foot: 185, thigh: 95, ep: "down", wristAt: ["head", 7, 9] },
  f: [{ torso: 75, neck: 80 }, { torso: 22, neck: -15 }],
  tl: [[1, 1.2, "Enroule le buste, côtes vers le bassin"], [1, .4, "Hanches fixes"], [0, 1.6, "Déroule lentement"], [0, .3, "Déroule lentement"]],
  eq: [{ t: "tower", x: 262, top: 10, w: 20 }, { t: "cable", a: [262, 20], b: ["wrist", 0, 0] }, { t: "rope", c: ["wrist", 0, 0], z: 1 }],
  g: "poulie haute avec corde"
};
DSC.curl_up = {
  base: { root: "hip", at: [176, 209], ankleAt: [214, 208], kp: "up", thigh2: 180, shin2: 180, foot2: 90, wristAt: ["hip", -16, 4], uaK: .6, faK: .62, ep: "up" },
  f: [{ torso: 180, neck: 178 }, { torso: 172, neck: 168 }],
  tl: [[1, .8, "Soulève tête et épaules de quelques cm"], [1, 3, "Tiens 8 s sans enrouler le dos"], [0, .8, "Repose"], [0, .8, "Repose"]],
  eq: [{ t: "mat", x1: 40, x2: 290 }],
  g: "aucun (un tapis)"
};
DSC.leg_raise = {
  base: { root: "shoulder", at: [150, 50], wristAt: [154, -14], ep: "down" },
  f: [{ torso: 90, neck: 90, thigh: 95, shin: 95, foot: -10 }, { torso: 98, neck: 94, thigh: 200, shin: 80, foot: -20 }],
  tl: [[1, 1.2, "Enroule le bassin, genoux vers la poitrine"], [1, .4, "En haut"], [0, 1.8, "Redescends sans balancer"], [0, .5, "Redescends sans balancer"]],
  eq: DPULL_EQ,
  g: "une barre de traction"
};

/* exercice de la base → scène (plusieurs exercices proches partagent une scène ; les muscles en rouge suivent l'exercice) */
const DSC_MAP = {
  squat: "squat_bar", goblet: "squat_goblet", hack: "hack", presse: "legpress", frontsq: "squat_front", boxsq: "box_squat", squatpdc: "squat_bw", squatchaise: "chair_squat",
  rdl: "rdl_bar", sdt: "deadlift", rdlh: "rdl_db", hipthrust: "hip_thrust", ext45: "back_ext", pont1: "bridge_1leg", pontsur: "bridge_elev", goodmorning: "good_morning",
  curlassis: "legcurl_seated", curlallonge: "legcurl_lying", curlserviette: "towel_curl", nordic: "nordic", legext: "leg_ext", chaise: "wall_sit", sissy: "sissy",
  bulgare: "bulgarian", fentesarr: "lunge_back", stepup: "step_up", fentesmarch: "split_squat", splitsq: "split_squat",
  molletsdebout: "calf_machine", molletsmarche: "calf_step", molletsassis: "calf_seated",
  dc: "bench_bar", dch: "bench_db", dih: "incline_db", chestpress: "chest_press", dib: "incline_bar", pompes: "pushup", pompespoign: "pushup_handles", pompesinc: "pushup_incline",
  floorpress: "floor_press", pompessur: "pushup_decline", ecarte: "cable_fly", dips: "dips",
  militaire: "ohp_bar", dehassis: "ohp_db_seated", landmine: "landmine", dehdemi: "ohp_kneel", pike: "pike", yraise: "y_raise",
  elevlat: "lat_raise", elevlatpoulie: "lat_raise_cable", elevlatallonge: "lat_raise_one", elevlatbout: "lat_raise_bottle",
  facepull: "face_pull", oiseau: "rear_fly", reversepec: "rear_fly_machine", ytw: "ytw", rotext: "ext_rot",
  rowbarre: "row_bar", rowpoulie: "row_cable", row1: "row_db1", rowappui: "row_chest", rowinv: "row_inverted", rowmachine: "row_machine", superman: "superman",
  tirage: "pulldown", pullover: "pullover", tractions: "pullup", tirageneutre: "pulldown", tractneg: "pullup_neg", tractassist: "pullup_assist",
  curlh: "curl_db", curlinc: "curl_incline", curlmarteau: "curl_hammer", curlez: "curl_bar", curlpupitre: "curl_preacher", curlsac: "curl_bag", chinup: "pullup",
  extover: "tri_overhead", pushdown: "pushdown", skull: "skull", kickback: "kickback", pompesserre: "pushup", dipsbanc: "bench_dips", dcserre: "bench_bar", pompesinctri: "pushup_incline",
  planche: "plank", deadbug: "dead_bug", gainlat: "side_plank", birddog: "bird_dog", pallof: "pallof", farmer: "farmer", crunchpoulie: "cable_crunch", curlup: "curl_up", releves: "leg_raise"
};
/* consignes propres à un exercice quand il partage la scène d'un autre */
const DSC_OV = {
  fentesmarch: { tl: [[1, 1.6, "Avance d'un grand pas et descends"], [1, .3, "Genou arrière qui frôle le sol"], [0, 1.1, "Pousse dans le talon avant pour avancer"], [0, .5, "Buste droit"]] },
  pompesserre: { tl: [[1, 1.6, "Coudes qui frôlent le buste"], [1, .2, "Poitrine près du sol"], [0, 1, "Pousse le sol"], [0, .5, "Mains sous les épaules"]] },
  dcserre: { g: "banc plat et barre olympique", tl: [[1, 1.8, "Coudes près du corps"], [1, .25, "Barre au bas des pectoraux"], [0, 1.1, "Pousse"], [0, .6, "Mains à largeur d'épaules"]] },
  pompesinctri: { tl: [[1, 1.6, "Mains serrées, coudes près du corps"], [1, .2, "Poitrine vers le bord"], [0, 1, "Pousse"], [0, .5, "Version douce pour poignets et coudes"]] },
  tirageneutre: { g: "poste de tirage vertical avec poignée en V", tl: [[1, 1, "Prise neutre, tire vers le haut de la poitrine"], [1, .3, "Coudes vers les poches"], [0, 1.6, "Étirement complet en haut"], [0, .4, "Cuisses bloquées"]] },
  chinup: { tl: [[1, 1, "Paumes vers toi, tire le menton au-dessus"], [1, .3, "En haut"], [0, 1.6, "Descente complète"], [0, .5, "Descente complète"]] }
};
