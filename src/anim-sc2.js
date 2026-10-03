/* ===== Démonstrations : poussées et épaules ===== */
DSC.bench_bar = {
  base: { root: "hip", at: [162, 160], torso: 180, neck: 178, ankleAt: [214, 208], kp: "up", ep: "down" },
  f: [{ wristAt: [110, 98], uaK: 1 }, { wristAt: [124, 146], uaK: .7 }],
  tl: [[1, 1.8, "Descends au bas des pectoraux"], [1, .25, "Touche sans rebond"], [0, 1.1, "Pousse, omoplates serrées"], [0, .6, "Pieds ancrés au sol"]],
  eq: [{ t: "bench", x1: 64, x2: 190, y: 168 }, { t: "plate", c: ["wrist", 0, 0], r: 22 }],
  g: "banc plat, barre olympique et rack"
};
DSC.bench_db = {
  base: { root: "hip", at: [162, 160], torso: 180, neck: 178, ankleAt: [214, 208], kp: "up", ep: "down" },
  f: [{ wristAt: [108, 100], uaK: 1 }, { wristAt: [120, 146], uaK: .7 }],
  tl: [[1, 1.8, "Descends jusqu'à l'étirement des pectoraux"], [1, .25, "Poignets au-dessus des coudes"], [0, 1.1, "Pousse"], [0, .6, "Omoplates serrées"]],
  eq: [{ t: "bench", x1: 64, x2: 190, y: 168 }, { t: "dbe", c: ["wrist", 0, 0], z: 1 }],
  g: "banc plat et deux haltères"
};
DSC.incline_db = {
  base: { root: "hip", at: [160, 162], torso: 150, neck: 150, ankleAt: [214, 208], kp: "up", ep: "down" },
  f: [{ wristAt: [118, 76], uaK: 1 }, { wristAt: [122, 124], uaK: .72 }],
  tl: [[1, 1.8, "Descends sur le haut des pectoraux"], [1, .25, "Étirement en bas"], [0, 1.1, "Pousse en rapprochant les haltères"], [0, .6, "Banc à 30°"]],
  eq: [
    { t: "l", a: [128, 160], b: [128, 217], w: 4 }, { t: "l", a: [172, 178], b: [172, 217], w: 4 },
    { t: "pad", a: [158, 173.5], b: [97.3, 138.5], w: 8 }, { t: "pad", a: [154, 174], b: [190, 174], w: 8 },
    { t: "dbe", c: ["wrist", 0, 0], z: 1 }
  ],
  g: "banc incliné à 30° et deux haltères"
};
DSC.incline_bar = {
  base: { root: "hip", at: [160, 162], torso: 150, neck: 150, ankleAt: [214, 208], kp: "up", ep: "down" },
  f: [{ wristAt: [118, 76], uaK: 1 }, { wristAt: [126, 122], uaK: .72 }],
  tl: [[1, 1.8, "Descends en haut des pectoraux"], [1, .25, "Coudes légèrement rentrés"], [0, 1.1, "Pousse"], [0, .6, "Banc à 30°"]],
  eq: [
    { t: "l", a: [128, 160], b: [128, 217], w: 4 }, { t: "l", a: [172, 178], b: [172, 217], w: 4 },
    { t: "pad", a: [158, 173.5], b: [97.3, 138.5], w: 8 }, { t: "pad", a: [154, 174], b: [190, 174], w: 8 },
    { t: "plate", c: ["wrist", 0, 0], r: 22 }
  ],
  g: "banc incliné et barre olympique"
};
DSC.chest_press = {
  base: { root: "hip", at: [128, 164], torso: 96, neck: 94, thigh: 180, shin: 90, ep: "back" },
  f: [{ wristAt: [150, 118], uaK: .85 }, { wristAt: [186, 114], uaK: 1 }],
  tl: [[1, 1, "Pousse sans verrouiller"], [1, .2, "Bras presque tendus"], [0, 2, "Retour lent jusqu'à l'étirement"], [0, .4, "Omoplates contre le dossier"]],
  eq: [
    { t: "l", a: [224, 56], b: [224, 217], w: 6 }, { t: "l", a: [150, 110], b: [224, 110], w: 3 },
    { t: "pad", a: [117, 165], b: [111, 106], w: 8 }, { t: "pad", a: [104, 173], b: [154, 173], w: 8 }, { t: "l", a: [128, 177], b: [128, 217], w: 5 },
    { t: "handle", c: ["wrist", 0, 0], z: 1 }
  ],
  g: "machine chest press"
};

DSC.pushup = {
  base: { root: "toe", at: [72, 214], wristAt: [212, 211], ep: "back" },
  f: [{ foot: -70.6, shin: 19.4, thigh: 19.4, torso: 19.4, neck: 19.4 }, { foot: -92, shin: -2, thigh: -2, torso: -2, neck: 0 }],
  tl: [[1, 1.6, "Descends, corps gainé"], [1, .2, "Poitrine à 2-3 cm du sol"], [0, 1, "Pousse le sol"], [0, .5, "Coudes à 45°"]],
  g: "aucun"
};
DSC.pushup_handles = {
  base: { root: "toe", at: [72, 214], wristAt: [212, 205], ep: "back" },
  f: [{ foot: -68, shin: 22, thigh: 22, torso: 22, neck: 22 }, { foot: -92, shin: -2, thigh: -2, torso: -2, neck: 0 }],
  tl: [[1, 1.6, "Descends plus bas que les mains"], [1, .2, "Poignets droits"], [0, 1, "Pousse"], [0, .5, "Corps gainé"]],
  eq: [{ t: "l", a: [204, 216], b: [212, 207], w: 3 }, { t: "l", a: [220, 216], b: [212, 207], w: 3 }, { t: "bar", c: [212, 206], r: 3.5 }],
  g: "poignées de pompes ou haltères hexagonaux"
};
DSC.pushup_incline = {
  base: { root: "toe", at: [60, 214], wristAt: [186, 164], ep: "back" },
  f: [{ foot: -50, shin: 40, thigh: 40, torso: 40, neck: 40 }, { foot: -72, shin: 18, thigh: 18, torso: 18, neck: 18 }],
  tl: [[1, 1.6, "Descends la poitrine vers le bord"], [1, .2, "Corps gainé"], [0, 1, "Pousse"], [0, .5, "Plus l'appui est bas, plus c'est dur"]],
  eq: [{ t: "bench", x1: 150, x2: 240, y: 167 }],
  g: "un banc, une table ou un canapé stable"
};
DSC.pushup_decline = {
  base: { root: "toe", at: [80, 169], wristAt: [214, 211], ep: "back" },
  f: [{ foot: -88, shin: 2, thigh: 2, torso: 2, neck: 2 }, { foot: -108, shin: -18, thigh: -18, torso: -18, neck: -14 }],
  tl: [[1, 1.6, "Descends la poitrine vers le sol"], [1, .2, "Corps gainé"], [0, 1, "Pousse"], [0, .5, "Pieds surélevés"]],
  eq: [{ t: "chair", x: 40, y: 172, w: 52, back: 40 }],
  g: "une chaise ou un canapé"
};
DSC.floor_press = {
  base: { root: "shoulder", at: [104, 209], torso: 180, neck: 175, ankleAt: [208, 208], kp: "up", ep: "down" },
  f: [{ wristAt: [106, 147], uaK: 1 }, { wristAt: [127.5, 181], uaK: .72 }],
  tl: [[1, 1.6, "Descends jusqu'à poser les coudes"], [1, .3, "Coudes au sol en douceur"], [0, 1, "Pousse"], [0, .5, "Pousse"]],
  eq: [{ t: "mat", x1: 50, x2: 250 }, { t: "dbe", c: ["wrist", 0, 0], z: 1 }],
  g: "deux haltères et un tapis"
};
DSC.dips = {
  base: { root: "shoulder", wristAt: [164, 80], ep: "back", thigh: 80, shin: 15, foot: -60 },
  f: [{ at: [160, 20], torso: 84, neck: 86 }, { at: [170, 54], torso: 70, neck: 74 }],
  tl: [[1, 1.6, "Descends jusqu'à 90° aux coudes"], [1, .2, "Épaules basses"], [0, 1.1, "Remonte sans verrouiller brutalement"], [0, .5, "Buste légèrement penché"]],
  eq: [{ t: "l", a: [118, 80], b: [222, 80], w: 5 }, { t: "l", a: [128, 80], b: [128, 217], w: 5 }, { t: "l", a: [212, 80], b: [212, 217], w: 5 }],
  g: "barres parallèles"
};
DSC.cable_fly = {
  view: "front", vlab: "vue de face",
  base: { at: [160, 122] },
  f: [{ armL: { e: [30, 8], h: [58, 12] } }, { armL: { e: [8, 24], h: [-16, 40] } }],
  tl: [[1, 1.3, "Ramène les mains devant toi"], [1, .4, "Serre les pectoraux"], [0, 1.8, "Ouvre jusqu'à l'étirement, coudes fixes"], [0, .4, "Ouvre jusqu'à l'étirement, coudes fixes"]],
  eq: [
    { t: "tower", x: 20, top: 40, w: 20 }, { t: "tower", x: 280, top: 40, w: 20 },
    { t: "cable", a: [40, 52], b: ["wristL", 0, 0] }, { t: "cable", a: [280, 52], b: ["wristR", 0, 0] },
    { t: "c", c: ["wristL", 0, 0], r: 3.5, k: "eqd", z: 1 }, { t: "c", c: ["wristR", 0, 0], r: 3.5, k: "eqd", z: 1 }
  ],
  g: "poulies vis-à-vis (deux colonnes)"
};

DSC.ohp_bar = {
  base: { ...DST, shin: 90, thigh: 90, torso: 90, ep: "down" },
  f: [{ wristAt: ["shoulder", 9, -6], neck: 90 }, { wristAt: ["shoulder", 13, -34], neck: 104 }, { wristAt: ["shoulder", 1, -63], neck: 90 }],
  tl: [[1, .5, "Pousse, tête légèrement en arrière"], [2, .6, "Passe la tête sous la barre"], [2, .5, "Bras verrouillés, abdos serrés"], [1, .7, "Redescends"], [0, .8, "Barre sur le haut des pectoraux"], [0, .5, "Fessiers et abdos serrés"]],
  eq: [{ t: "plate", c: ["wrist", 0, 0], r: 21 }],
  g: "barre olympique", th: 2
};
DSC.ohp_db_seated = {
  base: { root: "hip", at: [140, 166], torso: 92, neck: 92, thigh: 180, shin: 95, ep: "down" },
  f: [{ wristAt: ["shoulder", 6, -14] }, { wristAt: ["shoulder", 2, -62] }],
  tl: [[1, 1, "Pousse au-dessus de la tête"], [1, .2, "Sans cogner les haltères"], [0, 1.8, "Redescends jusqu'aux oreilles"], [0, .4, "Coudes légèrement devant le buste"]],
  eq: [
    { t: "pad", a: [129, 166], b: [127, 102], w: 8 }, { t: "pad", a: [118, 175], b: [166, 175], w: 8 }, { t: "l", a: [140, 179], b: [140, 217], w: 5 },
    { t: "dbe", c: ["wrist", 0, 0], z: 1 }
  ],
  g: "banc à dossier droit et deux haltères"
};
DSC.landmine = {
  base: { ...DST, at: [140, 208], shin: 90, thigh: 90, torso: 82, neck: 84, ep: "down", uarm2: 270, farm2: 270 },
  f: [{ wristAt: ["shoulder", 10, 0] }, { wristAt: ["shoulder", 50, -38] }],
  tl: [[1, 1.1, "Pousse en diagonale vers l'avant et le haut"], [1, .3, "Bras tendu"], [0, 1.5, "Redescends à l'épaule"], [0, .4, "Gainage serré"]],
  eq: [{ t: "land", pivot: [337.6, 214], c: ["wrist", 0, 0], len: 246 }],
  g: "barre calée dans un support landmine ou un coin"
};
DSC.ohp_kneel = {
  base: { root: "hip", at: [138, 162], torso: 90, neck: 90, ankleAt: [188, 208], kp: "up", thigh2: 90, shin2: 0, foot2: 185, wrist2At: ["hip", 6, -4], ep2: "back", ep: "down" },
  f: [{ wristAt: ["shoulder", 6, -14] }, { wristAt: ["shoulder", 1, -62] }],
  tl: [[1, 1, "Pousse au-dessus de l'épaule"], [1, .3, "Sans te pencher sur le côté"], [0, 1.6, "Redescends"], [0, .4, "Fessiers serrés"]],
  eq: [{ t: "mat", x1: 70, x2: 230 }, { t: "dbe", c: ["wrist", 0, 0], z: 1 }],
  g: "un haltère et un tapis"
};
DSC.pike = {
  base: { root: "toe", at: [80, 214], wristAt: [180, 211], ep: "back" },
  f: [{ foot: -28, shin: 62, thigh: 62, torso: -52, neck: -52 }, { foot: -50, shin: 40, thigh: 40, torso: -53, neck: -70 }],
  tl: [[1, 1.6, "Descends le crâne vers le sol"], [1, .2, "Devant les mains"], [0, 1.1, "Repousse, bassin haut"], [0, .5, "V renversé"]],
  g: "aucun"
};
DSC.y_raise = {
  base: { root: "hip", at: [140, 210], torso: 0, neck: 10, thigh: 0, shin: 0, foot: 185, uaK: .9, faK: .9 },
  f: [{ uarm: 0, farm: 0 }, { uarm: 18, farm: 18 }],
  tl: [[1, .8, "Monte les bras de quelques cm"], [1, 2, "Tiens 2 s, pouces vers le ciel"], [0, 1, "Repose"], [0, .6, "Repose"]],
  eq: [{ t: "mat", x1: 30, x2: 280 }],
  g: "aucun (un tapis)"
};
DSC.lat_raise = {
  view: "front", vlab: "vue de face",
  base: { at: [160, 122] },
  f: [{ armL: { u: [8, 33], f: [10, 31] } }, { armL: { u: [88, 33], f: [80, 31] } }],
  tl: [[1, 1, "Monte jusqu'à hauteur d'épaules"], [1, .2, "Coudes légèrement fléchis"], [0, 2.5, "Descente lente en 2-3 s"], [0, .3, "Descente lente en 2-3 s"]],
  eq: [{ t: "dbe", c: ["wristL", 0, 0], z: 1 }, { t: "dbe", c: ["wristR", 0, 0], z: 1 }],
  g: "deux haltères légers"
};
DSC.lat_raise_bottle = {
  view: "front", vlab: "vue de face",
  base: { at: [160, 122] },
  f: [{ armL: { u: [8, 33], f: [10, 31] } }, { armL: { u: [88, 33], f: [80, 31] } }],
  tl: [[1, 1, "Monte à hauteur d'épaules"], [1, .2, "Un peu devant toi"], [0, 2.5, "Descente lente, proche de l'échec"], [0, .3, "Descente lente, proche de l'échec"]],
  eq: [{ t: "bottle", c: ["wristL", 0, 0], z: 1 }, { t: "bottle", c: ["wristR", 0, 0], z: 1 }],
  g: "deux bouteilles d'eau de 1,5 L"
};
DSC.lat_raise_cable = {
  view: "front", vlab: "vue de face",
  base: { at: [150, 122], armR: { e: [6, 30], h: [-4, 48] } },
  f: [{ armL: { u: [-14, 33], f: [-20, 31] } }, { armL: { u: [86, 33], f: [82, 31] } }],
  tl: [[1, 1.1, "Monte à hauteur d'épaule"], [1, .2, "Tension continue"], [0, 2.2, "Redescends lentement"], [0, .3, "Surtout en bas du mouvement"]],
  eq: [{ t: "tower", x: 252, top: 60, w: 18 }, { t: "cable", a: [252, 204], b: ["wristL", 0, 0], z: 1 }, { t: "c", c: ["wristL", 0, 0], r: 3.5, k: "eqd", z: 1 }],
  g: "poulie basse avec poignée"
};
DSC.lat_raise_one = {
  vlab: "vue de face",
  base: { root: "hip", at: [176, 207], torso: 172, neck: 172, thigh: 180, shin: 180, foot: 90, uarm2: 200, farm2: 90 },
  f: [{ uarm: -8, farm: -8 }, { uarm: 88, farm: 88 }],
  tl: [[1, 1.2, "Monte l'haltère jusqu'à la verticale"], [1, .3, "Bras vertical"], [0, 2, "Redescends lentement"], [0, .5, "Tension en position étirée"]],
  eq: [{ t: "mat", x1: 60, x2: 290 }, { t: "dbe", c: ["wrist", 0, 0], z: 1 }],
  g: "un haltère léger, un banc incliné ou le sol"
};
DSC.face_pull = {
  base: { ...DST, at: [130, 208], shin: 90, thigh: 90, torso: 95, neck: 92, ep: "back" },
  f: [{ wristAt: ["shoulder", 62, -8] }, { wristAt: ["shoulder", 8, -26] }],
  tl: [[1, 1, "Tire vers le front en écartant les mains"], [1, .6, "Coudes hauts, poings vers le plafond"], [0, 1.6, "Retour contrôlé"], [0, .3, "Retour contrôlé"]],
  eq: [{ t: "tower", x: 286, top: 20, w: 20 }, { t: "cable", a: [286, 50], b: ["wrist", 0, 0] }, { t: "rope", c: ["wrist", 0, 0], z: 1 }],
  g: "poulie haute avec corde"
};
DSC.rear_fly = {
  view: "front", vlab: "vue de face",
  base: { at: [160, 128], torsoK: .7, neckK: .85, legs: "none" },
  f: [{ armL: { u: [6, 33], f: [8, 31] } }, { armL: { u: [84, 33], f: [92, 31] } }],
  tl: [[1, 1.2, "Ouvre les bras en arc"], [1, .5, "Coudes vers les murs"], [0, 1.8, "Redescends lentement"], [0, .3, "Redescends lentement"]],
  eq: [
    { t: "r", x: 145, y: 92, w: 30, h: 66, rx: 6 }, { t: "l", a: [150, 158], b: [136, 217], w: 4 }, { t: "l", a: [170, 158], b: [184, 217], w: 4 },
    { t: "dbe", c: ["wristL", 0, 0], z: 1 }, { t: "dbe", c: ["wristR", 0, 0], z: 1 }
  ],
  g: "banc incliné et deux haltères légers"
};
DSC.rear_fly_machine = {
  view: "front", vlab: "vue de dos",
  base: { at: [160, 140], legs: "none" },
  f: [{ armL: { e: [-2, 4], h: [-10, 6] } }, { armL: { e: [32, 1], h: [63, 2] } }],
  tl: [[1, 1.2, "Ouvre jusqu'à l'alignement des épaules"], [1, .4, "Bras presque tendus"], [0, 1.8, "Retour lent"], [0, .3, "Retour lent"]],
  eq: [
    { t: "r", x: 150, y: 30, w: 20, h: 187, rx: 2 }, { t: "l", a: [160, 44], b: ["wristL", 0, 0], w: 4 }, { t: "l", a: [160, 44], b: ["wristR", 0, 0], w: 4 },
    { t: "r", x: 136, y: 144, w: 48, h: 9, rx: 3 }, { t: "l", a: [160, 153], b: [160, 217], w: 5 },
    { t: "handle", c: ["wristL", 0, 0], z: 1 }, { t: "handle", c: ["wristR", 0, 0], z: 1 }
  ],
  g: "machine pec deck réglée en inversé"
};
DSC.ytw = {
  view: "front", vlab: "vue de dessus", noGround: true,
  base: { at: [160, 138] },
  f: [{ armL: { u: [150, 31], f: [150, 29] } }, { armL: { u: [90, 31], f: [90, 29] } }, { armL: { u: [40, 28], f: [140, 27] } }],
  tl: [[0, 2, "Allongé sur le ventre, bras en Y : 2 s en haut"], [1, .8, "Passe en T"], [1, 2, "T : 2 s en haut, pouces vers le ciel"], [2, .8, "Passe en W"], [2, 2, "W : 2 s en haut"], [0, .8, "Reviens en Y"]],
  eq: [{ t: "r", x: 96, y: 26, w: 128, h: 210, rx: 10, k: "mat" }],
  g: "aucun (une serviette sous le front)", th: 0
};
DSC.ext_rot = {
  vlab: "vue de face",
  base: { root: "hip", at: [180, 207], torso: 180, neck: 176, thigh: 180, shin: 180, foot: 90, elbowAt: ["shoulder", 32, -3], uarm2: 200, farm2: 90 },
  f: [{ wristAt: ["shoulder", 34, 12] }, { wristAt: ["shoulder", 33, -33] }],
  tl: [[1, 1.2, "Tourne l'avant-bras vers le haut"], [1, .4, "Coude collé au corps"], [0, 1.8, "Redescends lentement"], [0, .4, "Redescends lentement"]],
  eq: [{ t: "mat", x1: 60, x2: 290 }, { t: "dbe", c: ["wrist", 0, 0], z: 1 }],
  g: "un haltère léger et une serviette roulée"
};
