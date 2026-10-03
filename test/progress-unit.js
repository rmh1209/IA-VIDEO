// Tests unitaires du module de progression (sans navigateur)
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const src = ["src/data.js", "src/progress.js"].map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
const { P, EXI } = new Function(src + "; return { P: PROGRESSION, EXI };")();
const R = {}, ok = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra); };
const DAY = 864e5;
const mon = new Date(2026, 8, 7, 18, 0).getTime(); // lundi 7 septembre 2026, 18 h
const W = (dayOffset, nsets = 10, prs = 0, ex = []) => ({ startedAt: mon + dayOffset * DAY, nsets, prs: Array.from({ length: prs }, () => ({})), ex });

// 1. une séance : 100 points, palier vert
let p = P.points([W(0)], 3, 0);
ok("premiere_seance", p.total === 100 && p.tier.k === "vert" && p.idx === 1, p);
// 2. séance trop courte : 0 point
p = P.points([W(0, 3, 2)], 3, 0);
ok("seance_trop_courte", p.total === 0 && p.tier.k === "vide", p);
// 3. records plafonnés à 3 par séance
p = P.points([W(0, 10, 5)], 3, 0);
ok("records_plafonnes", p.by.records === 150 && p.total === 250, p);
// 4. semaine complète (3 séances) et série de semaines
const four = [];
for (let wk = 0; wk < 4; wk++) for (const d of [0, 2, 4]) four.push(W(wk * 7 + d));
p = P.points(four, 3, 0);
// 12 séances = 1200 ; 4 semaines = 600 ; série : 0 + 50 + 100 + 150 = 300 → 2100
ok("semaines_et_serie", p.by.seances === 1200 && p.by.semaines === 600 && p.by.series === 300 && p.total === 2100 && p.tier.k === "jaune", p.by);
// 5. une semaine manquée casse la série
const gap = four.filter(w => !(w.startedAt >= mon + 14 * DAY && w.startedAt < mon + 21 * DAY));
p = P.points(gap, 3, 0);
ok("serie_cassee", p.by.semaines === 450 && p.by.series === 50, p.by);
// 6. passage de l'heure d'été/hiver : semaines consécutives fin octobre
const oct = new Date(2026, 9, 19, 18).getTime(); // lundi 19 octobre 2026
const dst = [0, 2, 4, 7, 9, 11].map(d => ({ startedAt: oct + d * DAY, nsets: 8, prs: [] }));
p = P.points(dst, 3, 0);
ok("changement_heure", p.by.series === 50 && p.by.semaines === 300, p.by);
// 7. gain et montée de palier
const g = P.gain(four.slice(0, 10), four[10], 3, 0);
ok("gain", g.delta > 0 && g.parts.length >= 1, g);
const g2 = P.gain([], W(0), 3, 0);
ok("montee_palier", g2.tierUp && g2.after.tier.k === "vert" && g2.delta === 100, g2);
// 8. disques gagnés dans l'ordre du logo
ok("disques", JSON.stringify(P.earned(1)) === "[false,false,false,true]" && JSON.stringify(P.earned(4)) === "[true,true,true,true]" && JSON.stringify(P.earned(0)) === "[false,false,false,false]");
// 9. bonus de stade
p = P.points([], 3, 2);
ok("bonus_stade", p.total === 1000, p);
// 10. repères de force
const ws = [{ startedAt: mon, nsets: 6, ex: [
  { id: "squat", sets: [{ w: 80, r: 5 }, { w: 85, r: 3 }] },
  { id: "pompes", sets: [{ w: null, r: 22 }, { w: null, r: 18 }] },
  { id: "planche", sets: [{ w: null, r: 65 }] }
] }];
const F = P.force(ws, { sex: "h", kg: 75 }, "gym");
const sq = F.find(x => x.id === "squat"), po = F.find(x => x.id === "pompes"), pl = F.find(x => x.id === "planche"), sdt = F.find(x => x.id === "sdt");
// squat : e1RM = max(80*(1+5/30)=93.3, 85*(1+3/30)=93.5) → 93.5 / 75 = 1.247 → niveau 1 (≥0.75, <1.25)
ok("force_ratio", sq.level === 1 && Math.abs(sq.best - 93.5) < 0.01 && Math.abs(sq.nextKg - 93.75) < 0.01, sq);
ok("force_reps", po.level === 1 && po.next === 25, po);
ok("force_temps", pl.level === 2 && pl.next === 120, pl);
ok("force_a_mesurer", sdt.level === 0 && sdt.best === 0, sdt);
const Fna = P.force(ws, {}, "gym");
ok("force_sans_profil", Fna.find(x => x.id === "squat").need && !Fna.find(x => x.id === "planche").need, Fna.find(x => x.id === "squat"));
const Fpdc = P.force(ws, { sex: "f", kg: 60 }, "pdc");
ok("force_filtre_materiel", Fpdc.every(x => EXI[x.id].eq.includes("pdc")) && !Fpdc.find(x => x.id === "squat") && Fpdc.find(x => x.id === "pompes").level === 2, Fpdc.map(x => x.id + x.level));
// 11. stades
const st0 = P.stageStatus(four, { n: 1, at: 0 }, 3);
ok("stade_semaine", st0.done === 12 && st0.week === 5 && !st0.deload && !st0.complete, st0);
const nine = four.slice(0, 9);
ok("stade_decharge", P.stageStatus(nine, { n: 1, at: 0 }, 3).deload === true, P.stageStatus(nine, { n: 1, at: 0 }, 3));
const many = Array.from({ length: 24 }, (_, i) => W(i * 2));
const stc = P.stageStatus(many, { n: 2, at: 0 }, 3);
ok("stade_termine", stc.complete && stc.done === 24 && stc.n === 2, stc);
ok("stade_depuis_date", P.stageStatus(many, { n: 1, at: mon + 30 * DAY }, 3).done === 9, P.stageStatus(many, { n: 1, at: mon + 30 * DAY }, 3));
// 12. dosage par stade
const sess = [{ name: "A", ex: [
  { id: "squat", sets: 3, reps: "6 à 10", rest: "2 à 3 min", rir: "1 à 3" },
  { id: "dc", sets: 3, reps: "6 à 10", rest: "2 à 3 min", rir: "1 à 3" },
  { id: "rowpoulie", sets: 3, reps: "8 à 12", rest: "2 min", rir: "1 à 2" },
  { id: "elevlat", sets: 3, reps: "10 à 15", rest: "60 à 90 s", rir: "0 à 2" },
  { id: "planche", sets: 2, reps: "30 à 45 s", rest: "45 à 60 s", rir: "—" },
  { id: null, n: "Perso", sets: 3, reps: "10", rest: "1 min", rir: "2" },
  { id: "curlh", sets: 4, reps: "12", rest: "1 min", rir: "1", fixed: true }
] }];
const s2 = P.applyStage(sess, 2, "muscle")[0].ex, s3 = P.applyStage(sess, 3, "muscle")[0].ex, s1 = P.applyStage(P.applyStage(sess, 3, "muscle"), 1, "muscle")[0].ex;
ok("stade2_volume", s2[0].sets === 4 && s2[0].rir === "0 à 2" && s2[2].sets === 4 && s2[3].sets === 3 && s2[3].rir === "0 à 1" && s2[4].sets === 2 && s2[4].reps === "30 à 45 s", s2);
ok("stade3_intensite", s3[0].reps === "4 à 8" && s3[0].rest === "2 à 3 min" && s3[0].rir === "1 à 2" && s3[0].sets === 3 && s3[2].reps === "8 à 12" && s3[2].rir === "0 à 1" && s3[3].reps === "10 à 15", s3);
ok("stade_retour_base", s1[0].sets === 3 && s1[0].reps === "6 à 10" && s1[0].rir === "1 à 3" && s1[0].b.sets === 3, s1[0]);
ok("stade_respecte_perso", s3[5] === sess[0].ex[5] && s3[6] === sess[0].ex[6], [s3[5], s3[6]]);
const s3f = P.applyStage(sess, 3, "force")[0].ex;
ok("stade3_force", s3f[0].rest === "3 à 5 min", s3f[0]);
const lowR = P.doseAt({ sets: 4, reps: "3 à 5", rest: "3 à 4 min", rir: "2 à 3" }, "principal", 3, "force");
ok("stade3_bornes", lowR.reps === "3 à 5", lowR);
const dl = P.deload({ id: "squat", sets: 3, reps: "6 à 10", rest: "2 min", rir: "1 à 3" });
ok("decharge", dl.sets === 2 && dl.rir === "3 à 4" && dl.reps === "6 à 10", dl);
ok("decharge_gainage", P.deload({ id: "planche", sets: 2, reps: "30 s", rir: "—" }).rir === "—" && P.deload({ id: "planche", sets: 1, reps: "30 s", rir: "—" }).sets === 1);
console.log(JSON.stringify(R, null, 1));
const fails = Object.entries(R).filter(([, v]) => v !== "OK");
process.exitCode = fails.length ? 1 : 0;
