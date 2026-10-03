/* ===== Démonstrations : scènes du bas du corps. Profil tourné vers la droite, sol à y = 217, cheville debout à y = 208.
   f : positions clés (fusionnées avec base), tl : [position visée, durée en s, consigne affichée], eq : matériel, z: 1 = devant le corps. ===== */
const DSC = {};
const DST = { root: "ankle", at: [150, 208], kp: "front" };

DSC.squat_bar = {
  base: { ...DST, wristAt: ["shoulder", -8, 0], ep: "down" },
  f: [{ shin: 90, thigh: 90, torso: 88, neck: 90 }, { shin: 58, thigh: 178, torso: 46, neck: 66 }],
  tl: [[1, 1.8, "Descente : inspire et gaine"], [1, .3, "En bas : cuisses à la parallèle"], [0, 1.2, "Remontée : pousse le sol"], [0, .7, "En haut : souffle"]],
  eq: [{ t: "plate", c: ["wrist", 0, 0], r: 19 }],
  g: "barre olympique et rack à squat"
};
DSC.squat_goblet = {
  base: { ...DST, wristAt: ["shoulder", 13, 15], ep: "down" },
  f: [{ shin: 90, thigh: 90, torso: 89, neck: 90 }, { shin: 55, thigh: 184, torso: 62, neck: 75 }],
  tl: [[1, 1.8, "Descends entre tes talons, buste fier"], [1, .3, "Coudes qui frôlent les genoux"], [0, 1.2, "Remonte en poussant le sol"], [0, .6, "Remonte en poussant le sol"]],
  eq: [{ t: "db", c: ["wrist", 3, 0], a: 90, z: 1 }],
  g: "un haltère ou un kettlebell"
};
DSC.squat_front = {
  base: { ...DST, wristAt: ["shoulder", 4, -9], ep: "front" },
  f: [{ shin: 90, thigh: 90, torso: 90, neck: 90 }, { shin: 54, thigh: 182, torso: 68, neck: 80 }],
  tl: [[1, 1.8, "Descends, coudes hauts"], [1, .3, "Buste droit en bas"], [0, 1.2, "Remonte en gardant les coudes levés"], [0, .6, "Remonte en gardant les coudes levés"]],
  eq: [{ t: "plate", c: ["wrist", 0, 0], r: 21 }],
  g: "barre olympique et rack à squat"
};
DSC.box_squat = {
  base: { ...DST, wristAt: ["shoulder", 13, 15], ep: "down" },
  f: [{ shin: 90, thigh: 90, torso: 89, neck: 90 }, { shin: 62, thigh: 175, torso: 60, neck: 74 }],
  tl: [[1, 1.8, "Assieds-toi en contrôle"], [1, .6, "Touche la box sans te relâcher"], [0, 1.2, "Remonte"], [0, .6, "Remonte"]],
  eq: [{ t: "box", x: 100, w: 40, h: 45 }, { t: "db", c: ["wrist", 3, 0], a: 90, z: 1 }],
  g: "un haltère et un banc ou une box"
};
DSC.squat_bw = {
  base: { ...DST },
  f: [{ shin: 90, thigh: 90, torso: 90, neck: 90, uarm: 0, farm: 0 }, { shin: 56, thigh: 184, torso: 58, neck: 72, uarm: 8, farm: 8 }],
  tl: [[1, 3, "Descente en 3 secondes"], [1, .3, "En bas, talons au sol"], [0, .9, "Remontée dynamique"], [0, .6, "Remontée dynamique"]],
  g: "aucun"
};
DSC.chair_squat = {
  base: { ...DST },
  f: [{ shin: 90, thigh: 90, torso: 90, neck: 90, uarm: 0, farm: 0 }, { shin: 64, thigh: 172, torso: 60, neck: 74, uarm: 6, farm: 6 }],
  tl: [[1, 2.2, "Descends vers la chaise"], [1, .3, "Effleure sans t'asseoir"], [0, 1, "Remonte"], [0, .6, "Remonte"]],
  eq: [{ t: "chair", x: 88, y: 171, w: 46, back: 44 }],
  g: "une chaise stable"
};
DSC.hack = {
  base: { root: "ankle", at: [190, 196], foot: 15, kp: "front", torso: 125, neck: 118, wristAt: ["shoulder", 10, 2], ep: "down" },
  f: [{ hipAt: [150, 118] }, { hipAt: [177.6, 157.3] }],
  tl: [[1, 2, "Descends en contrôle, dos collé"], [1, .3, "Le plus bas possible, bassin collé"], [0, 1.3, "Pousse par le milieu du pied"], [0, .6, "Sans verrouiller les genoux"]],
  eq: [
    { t: "l", a: [87.7, 64], b: [191, 211.4], w: 5 },
    { t: "pad", a: ["hip", -3.6, 12.3], b: ["shoulder", -12.8, -0.8], w: 8 },
    { t: "pad", a: ["shoulder", -11.8, -2.8], b: ["shoulder", 1.4, -12], w: 6 },
    { t: "pad", a: [186.5, 206.3], b: [213.6, 199], w: 6 },
    { t: "l", a: [200, 205], b: [200, 217], w: 4 }
  ],
  g: "machine hack squat"
};
DSC.legpress = {
  base: { root: "hip", at: [118, 168], torso: 138, neck: 128, kp: "up", foot: 135, wristAt: ["hip", 8, 6], ep: "back" },
  f: [{ ankleAt: [184, 113] }, { ankleAt: [160, 137] }],
  tl: [[1, 1.8, "Descends : genoux vers la poitrine"], [1, .3, "Bas du dos collé au dossier"], [0, 1.2, "Pousse sans verrouiller les genoux"], [0, .6, "Pousse sans verrouiller les genoux"]],
  eq: [
    { t: "l", a: [140, 196], b: [252, 84], w: 5 }, { t: "l", a: [252, 84], b: [252, 217], w: 5 }, { t: "l", a: [96, 217], b: [252, 217], w: 4 },
    { t: "pad", a: [113.6, 178.9], b: [67.5, 137.4], w: 9 }, { t: "pad", a: [112, 180], b: [148, 176], w: 8 }, { t: "l", a: [110, 184], b: [110, 217], w: 5 },
    { t: "pad", a: ["ankle", 16.3, 3.5], b: ["ankle", -14.8, -27.6], w: 6 }
  ],
  g: "presse à cuisses inclinée"
};

DSC.rdl_bar = {
  base: { ...DST, straight: true },
  f: [{ hipAt: [149, 120], torso: 88, neck: 88, wristAt: [153, 200] }, { hipAt: [118, 126], torso: 22, neck: 30, wristAt: [158, 220] }],
  tl: [[1, 2, "Recule les hanches, barre collée aux cuisses"], [1, .3, "Étirement des ischios, dos plat"], [0, 1.2, "Remonte en serrant les fessiers"], [0, .6, "Remonte en serrant les fessiers"]],
  eq: [{ t: "plate", c: ["wrist", 0, 0], r: 21 }],
  g: "barre olympique et disques"
};
DSC.rdl_db = {
  base: { ...DST, straight: true },
  f: [{ hipAt: [149, 120], torso: 88, neck: 88, wristAt: [153, 200] }, { hipAt: [118, 126], torso: 22, neck: 30, wristAt: [158, 220] }],
  tl: [[1, 2, "Recule les hanches, haltères près des jambes"], [1, .3, "Étirement des ischios, dos plat"], [0, 1.2, "Remonte en serrant les fessiers"], [0, .6, "Remonte en serrant les fessiers"]],
  eq: [{ t: "db", c: ["wrist", 0, 2], a: 0, z: 1 }],
  g: "deux haltères"
};
DSC.deadlift = {
  base: { ...DST, straight: true },
  f: [{ hipAt: [116, 153], torso: 25, neck: 42, wristAt: [158, 240] }, { hipAt: [150, 118], torso: 90, neck: 90, wristAt: [151, 200] }],
  tl: [[1, 1.4, "Pousse le sol, la barre frôle les jambes"], [1, .5, "Debout, fessiers serrés"], [0, 1.6, "Redescends en reculant les hanches"], [0, .7, "Dos plat, épaules devant la barre"]],
  eq: [{ t: "plate", c: ["wrist", 0, 0], r: 22 }],
  g: "barre olympique et disques", th: 0
};
DSC.good_morning = {
  base: { ...DST, wristAt: { s: ["hip", "shoulder"], a: 1.12, n: -10 }, ep: "down", wrist2At: { s: ["hip", "shoulder"], a: .06, n: -12 }, ep2: "back" },
  f: [{ hipAt: [150, 119], torso: 89, neck: 89 }, { hipAt: [122, 124], torso: 28, neck: 30 }],
  tl: [[1, 2, "Recule les hanches, bâton collé au dos"], [1, .3, "Tête, haut du dos, bassin : 3 contacts"], [0, 1.3, "Remonte en serrant les fessiers"], [0, .6, "Remonte en serrant les fessiers"]],
  eq: [{ t: "l", a: { s: ["hip", "shoulder"], a: -.12, n: -9.5 }, b: { s: ["hip", "shoulder"], a: 1.55, n: -9.5 }, w: 3, c: "eqd", z: 1 }],
  g: "un bâton ou un manche à balai"
};
DSC.hip_thrust = {
  base: { root: "shoulder", at: [98, 166], ankleAt: [197, 209], kp: "up", wristAt: ["hip", 2, -14], ep: "down", neck: 150 },
  f: [{ torso: 142 }, { torso: 180 }],
  tl: [[1, 1, "Pousse dans les talons"], [1, 1, "1 s en haut, bassin basculé"], [0, 1.6, "Redescends en contrôle"], [0, .4, "Menton rentré"]],
  eq: [{ t: "bench", x1: 38, x2: 102, y: 172 }, { t: "plate", c: ["hip", 0, -18], r: 21 }],
  g: "un banc et une barre (ou un haltère sur les hanches)"
};
DSC.back_ext = {
  base: { root: "ankle", at: [92, 190], shin: 45, thigh: 45, foot: -45, uarmR: 195, farmR: -165 },
  f: [{ torso: 45, neck: 45 }, { torso: -40, neck: -45 }],
  tl: [[1, 1.8, "Bascule depuis les hanches, dos neutre"], [1, .3, "En bas"], [0, 1.3, "Remonte jusqu'à l'alignement"], [0, .6, "Sans te cambrer"]],
  eq: [
    { t: "l", a: [98, 214], b: [166, 150], w: 5 }, { t: "l", a: [132, 182], b: [132, 217], w: 5 },
    { t: "pad", a: [152.1, 145.5], b: [164.8, 132.8], w: 9 }, { t: "pad", a: [81.4, 192.2], b: [101.2, 212], w: 5 },
    { t: "c", c: [90.5, 180.1], r: 6, z: 1 }
  ],
  g: "banc à lombaires à 45°", th: 0
};
DSC.bridge_1leg = {
  base: { root: "shoulder", at: [92, 209], neck: 175, ankleAt: [178, 208], kp: "up", thigh2: 215, shin2: 215, foot2: 125, wristAt: [152, 212], uaK: .92, faK: .92, ep: "up" },
  f: [{ torso: 180 }, { torso: 210 }],
  tl: [[1, 1, "Pousse dans le talon, bassin droit"], [1, 2, "Tiens 2 s en haut"], [0, 1.4, "Redescends lentement"], [0, .5, "Redescends lentement"]],
  eq: [{ t: "mat", x1: 50, x2: 270 }],
  g: "aucun (un tapis)"
};
DSC.bridge_elev = {
  base: { root: "shoulder", at: [92, 209], neck: 175, ankleAt: [196, 171], kp: "up", foot: 50, wristAt: [152, 212], uaK: .92, faK: .92, ep: "up" },
  f: [{ torso: 180 }, { torso: 206 }],
  tl: [[1, 1, "Pousse dans les talons"], [1, .8, "Bassin en haut"], [0, 1.6, "Contrôle la descente"], [0, .4, "Contrôle la descente"]],
  eq: [{ t: "box", x: 182, w: 56, h: 40 }],
  g: "un banc, un canapé ou une chaise"
};

DSC.legcurl_seated = {
  base: { root: "hip", at: [130, 150], torso: 80, neck: 84, thigh: 180, wristAt: ["hip", 14, 6], ep: "back" },
  f: [{ shin: 162, foot: 72 }, { shin: 74, foot: -16 }],
  tl: [[1, 1, "Fléchis fort"], [1, .4, "Talons sous le siège"], [0, 3, "Retour en 3 secondes"], [0, .5, "Retour en 3 secondes"]],
  eq: [
    { t: "l", a: [176, 150], b: [176, 217], w: 5 }, { t: "l", a: [125, 165], b: [125, 217], w: 5 },
    { t: "pad", a: [100, 161], b: [150, 161], w: 8 }, { t: "pad", a: [119.5, 146.1], b: [128.9, 92.9], w: 8 },
    { t: "pad", a: ["knee", -26, -12], b: ["knee", 2, -12], w: 7, z: 1 },
    { t: "l", a: ["knee", 0, 0], b: { s: ["ankle", "knee"], a: .12, n: -9 }, w: 4 },
    { t: "c", c: { s: ["ankle", "knee"], a: .12, n: -9 }, r: 6.5, z: 1 }, { t: "c", c: ["knee", 0, 0], r: 3.5, k: "eqd", z: 1 }
  ],
  g: "machine leg curl assis"
};
DSC.legcurl_lying = {
  base: { root: "hip", at: [150, 171], torso: 4, neck: -8, thigh: 0, wristAt: [222, 194], ep: "back" },
  f: [{ shin: 0, foot: -90 }, { shin: 260, foot: 170 }],
  tl: [[1, 1, "Fléchis sans décoller le bassin"], [1, .4, "Talons vers les fesses"], [0, 2.6, "Descente lente"], [0, .5, "Descente lente"]],
  eq: [
    { t: "bench", x1: 92, x2: 238, y: 178 },
    { t: "l", a: ["knee", 0, 5], b: { s: ["ankle", "knee"], a: .1, n: -8 }, w: 4 },
    { t: "c", c: { s: ["ankle", "knee"], a: .1, n: -8 }, r: 6.5, z: 1 }, { t: "c", c: ["knee", 0, 5], r: 3.5, k: "eqd", z: 1 }
  ],
  g: "machine leg curl allongé"
};
DSC.towel_curl = {
  base: { root: "shoulder", at: [92, 209], neck: 175, kp: "up", foot: 70, wristAt: [152, 212], uaK: .92, faK: .92, ep: "up" },
  f: [{ torso: 196, ankleAt: [222, 208] }, { torso: 212, ankleAt: [182, 208] }],
  tl: [[1, 1.2, "Bassin haut, ramène les talons"], [1, .3, "Talons vers les fesses"], [0, 2, "Repousse lentement, bassin haut"], [0, .4, "Repousse lentement, bassin haut"]],
  eq: [{ t: "l", a: ["ankle", -8, 8.5], b: ["ankle", 13, 8.5], w: 3.5, c: "eqd" }],
  g: "une serviette sur un sol lisse"
};
DSC.nordic = {
  base: { root: "knee", at: [120, 208], shin: 0, foot: 190, ep: "down" },
  f: [{ thigh: 90, torso: 90, neck: 90, wristAt: ["shoulder", 22, 16] }, { thigh: 30, torso: 30, neck: 30, wristAt: ["shoulder", 18, 56] }],
  tl: [[1, 3.5, "Descends le plus lentement possible"], [1, .3, "Rattrape-toi avec les mains"], [0, 1.2, "Remonte en poussant des mains"], [0, .6, "Corps aligné des genoux à la tête"]],
  eq: [{ t: "r", x: 96, y: 211, w: 48, h: 6, rx: 3 }, { t: "l", a: [76, 199], b: [76, 140], w: 5 }, { t: "c", c: [76, 199], r: 6, z: 1 }],
  g: "un coussin et un meuble lourd pour bloquer les chevilles"
};
DSC.leg_ext = {
  base: { root: "hip", at: [120, 160], torso: 100, neck: 96, thigh: 180, wristAt: ["hip", 10, 8], ep: "back" },
  f: [{ shin: 80, foot: -10 }, { shin: 180, foot: 90 }],
  tl: [[1, 1, "Monte jusqu'à jambes tendues"], [1, 1, "1 seconde en haut"], [0, 3, "Descente en 3 secondes"], [0, .4, "Descente en 3 secondes"]],
  eq: [
    { t: "l", a: [124, 174], b: [124, 217], w: 5 }, { t: "pad", a: [96, 170], b: [168, 170], w: 8 }, { t: "pad", a: [109.2, 161.9], b: [99.5, 106.7], w: 8 },
    { t: "l", a: ["knee", 0, 0], b: { s: ["ankle", "knee"], a: .12, n: 8 }, w: 4 },
    { t: "c", c: { s: ["ankle", "knee"], a: .12, n: 8 }, r: 6.5, z: 1 }, { t: "c", c: ["knee", 0, 0], r: 3.5, k: "eqd", z: 1 }
  ],
  g: "machine leg extension"
};
DSC.wall_sit = {
  base: { root: "ankle", at: [154, 208], kp: "front", torso: 90, neck: 90, uarmR: 195, farmR: -165 },
  f: [{ hipAt: [111, 126] }, { hipAt: [108, 164] }],
  tl: [[1, 1.5, "Glisse le dos contre le mur"], [1, 4, "Tiens la position, respire calmement"], [0, 1.2, "Remonte"], [0, .8, "Remonte"]],
  eq: [{ t: "wall", x: 100, top: 30 }],
  g: "un mur"
};
DSC.sissy = {
  base: { root: "toe", at: [170, 214], foot: -35, wristAt: [198, 108], ep: "down", uarm2: 270, farm2: 270 },
  f: [{ shin: 88, thigh: 90, torso: 90, neck: 90 }, { shin: 38, thigh: 128, torso: 128, neck: 110 }],
  tl: [[1, 2.2, "Genoux en avant, corps penché en arrière"], [1, .3, "Hanches tendues"], [0, 1.3, "Remonte"], [0, .6, "Remonte"]],
  eq: [{ t: "l", a: [200, 217], b: [200, 56], w: 5 }],
  g: "un support stable pour la main"
};

DSC.bulgarian = {
  base: { ...DST, at: [182, 208], toe2At: [80, 167], foot2: 182, kp2: "down", uarm: 272, farm: 272 },
  f: [{ hipAt: [150, 124], torso: 84, neck: 86 }, { hipAt: [146, 166], torso: 72, neck: 78 }],
  tl: [[1, 1.8, "Descends à la verticale"], [1, .3, "Genou avant au-dessus du pied"], [0, 1.2, "Pousse dans le pied avant"], [0, .5, "Pousse dans le pied avant"]],
  eq: [{ t: "bench", x1: 40, x2: 100, y: 172 }, { t: "db", c: ["wrist", 0, 2], a: 0, z: 1 }],
  g: "un banc (haltères en option)"
};
DSC.lunge_back = {
  base: { ...DST, at: [186, 208], kp2: "down", wristAt: ["hip", 6, -6], ep: "back" },
  f: [
    { hipAt: [186, 119], torso: 90, neck: 90, toe2At: [202, 214], foot2: 0 },
    { hipAt: [170, 128], torso: 88, neck: 88, toe2At: [124, 194], foot2: -25 },
    { hipAt: [142, 168], torso: 86, neck: 86, toe2At: [96, 214], foot2: -40 }
  ],
  tl: [[1, .7, "Recule d'un grand pas"], [2, 1, "Descends : genou arrière vers le sol"], [2, .3, "Genou arrière qui frôle le sol"], [1, .8, "Repousse avec le talon avant"], [0, .5, "Reviens debout"], [0, .5, "Reviens debout"]],
  g: "aucun (haltères en option)", th: 2
};
DSC.split_squat = {
  base: { ...DST, at: [186, 208], toe2At: [96, 214], foot2: -40, kp2: "down", wristAt: ["hip", 6, -6], ep: "back" },
  f: [{ hipAt: [145, 133], torso: 88, neck: 88 }, { hipAt: [142, 168], torso: 86, neck: 86 }],
  tl: [[1, 1.6, "Descends à la verticale"], [1, .3, "Genou arrière qui frôle le sol"], [0, 1.1, "Remonte en poussant le talon avant"], [0, .5, "Remonte en poussant le talon avant"]],
  g: "aucun (haltères en option)"
};
DSC.step_up = {
  base: { root: "ankle", at: [192, 151], kp: "front", kp2: "front", uarm: 272, farm: 272 },
  f: [{ hipAt: [148, 121], torso: 84, neck: 86, ankle2At: [150, 208] }, { hipAt: [190, 66], torso: 88, neck: 88, ankle2At: [172, 146] }],
  tl: [[1, 1.2, "Monte avec la jambe du haut"], [1, .3, "Debout sur le banc"], [0, 1.6, "Redescends lentement"], [0, .5, "Tout le pied posé sur le banc"]],
  eq: [{ t: "box", x: 172, w: 78, h: 57 }],
  g: "un banc ou une marche stable"
};

DSC.calf_machine = {
  base: { root: "toe", at: [168, 200], shin: 90, thigh: 90, torso: 90, neck: 90, wristAt: ["shoulder", 6, -8], ep: "down" },
  f: [{ foot: 25 }, { foot: -40 }],
  tl: [[1, 1, "Monte au maximum sur la pointe"], [1, .5, "En haut"], [0, 1.5, "Descends talons bas"], [0, 2, "Pause 2 s en étirement"]],
  eq: [
    { t: "box", x: 158, w: 42, h: 14 }, { t: "l", a: [104, 40], b: [104, 217], w: 6 },
    { t: "l", a: [104, 44], b: ["shoulder", -11, -9], w: 5 }, { t: "pad", a: ["shoulder", -11, -9], b: ["shoulder", 9, -9], w: 7 }
  ],
  g: "machine à mollets debout"
};
DSC.calf_step = {
  base: { root: "toe", at: [168, 186], shin: 90, thigh: 90, torso: 90, neck: 90, thigh2: 95, shin2: 40, foot2: -50, wristAt: [192, 70], ep: "down" },
  f: [{ foot: 30 }, { foot: -40 }],
  tl: [[1, 1, "Monte au maximum"], [1, .5, "En haut"], [0, 1.5, "Descends en étirement complet"], [0, 2, "Pause 2 s en bas"]],
  eq: [{ t: "box", x: 150, w: 50, h: 28 }, { t: "wall", x: 196, top: 30, side: 1 }],
  g: "une marche et un mur"
};
DSC.calf_seated = {
  base: { root: "hip", at: [140, 162], toeAt: [196, 200], kp: "up", torso: 88, neck: 88, wristAt: { s: ["knee", "hip"], a: .3, n: 15 }, ep: "down" },
  f: [{ foot: 25 }, { foot: -35 }],
  tl: [[1, 1, "Monte au maximum"], [1, .4, "En haut"], [0, 1.4, "Redescends"], [0, 1.2, "Pause en bas"]],
  eq: [
    { t: "pad", a: [108, 171], b: [160, 171], w: 8 }, { t: "l", a: [130, 175], b: [130, 217], w: 5 }, { t: "box", x: 188, w: 34, h: 14 },
    { t: "pad", a: { s: ["knee", "hip"], a: 0, n: 9 }, b: { s: ["knee", "hip"], a: .45, n: 9 }, w: 8, z: 1 }
  ],
  g: "machine à mollets assis (ou haltères sur les genoux)"
};
