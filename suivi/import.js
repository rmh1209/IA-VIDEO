/* ===== Import de l'historique depuis Strong ou Hevy (fichier CSV exporté par ces applis) ===== */
// noms anglais ou français des exercices courants → exercices de la base ; l'ordre compte (du plus précis au plus général)
const IMPORT_RULES = [
  [/leg curl|curl jambes|ischio/, n => (/seated|assis/.test(n) ? "curlassis" : "curlallonge")],
  [/leg extension|extension (des )?jambes|leg ext/, () => "legext"],
  [/calf|mollet/, n => (/seated|assis/.test(n) ? "molletsassis" : "molletsdebout")],
  [/skull|lying tricep|barre au front/, () => "skull"],
  [/push ?down|pushdown|extension.*poulie|corde/, () => "pushdown"],
  [/overhead.*(tricep|extension)|tricep.*overhead|french press|extension.*(tete|nuque)/, () => "extover"],
  [/kickback/, () => "kickback"],
  [/preacher|pupitre/, () => "curlpupitre"],
  [/incline.*curl|curl.*inclin/, () => "curlinc"],
  [/hammer|marteau/, () => "curlmarteau"],
  [/ez.*curl|curl.*ez|barbell curl|curl.*barbell|curl.*barre/, () => "curlez"],
  [/\bcurl/, () => "curlh"],
  [/romanian|roumain|\brdl\b|stiff/, n => (/dumbbell|haltere/.test(n) ? "rdlh" : "rdl")],
  [/deadlift|souleve de terre/, () => "sdt"],
  [/front squat|squat avant/, () => "frontsq"],
  [/goblet/, () => "goblet"],
  [/hack/, () => "hack"],
  [/leg press|presse/, () => "presse"],
  [/bulgar/, () => "bulgare"],
  [/split squat|fente statique/, () => "splitsq"],
  [/step ?up/, () => "stepup"],
  [/walking lunge|fentes? marche/, () => "fentesmarch"],
  [/lunge|fente/, () => "fentesarr"],
  [/squat/, n => (/body ?weight|poids du corps|air squat/.test(n) ? "squatpdc" : "squat")],
  [/hip thrust|glute bridge|pont fessier/, () => "hipthrust"],
  [/good ?morning/, () => "goodmorning"],
  [/close ?grip bench|prise serree/, () => "dcserre"],
  [/inclin/, n => (/dumbbell|haltere/.test(n) ? "dih" : /bench|barbell|barre|developpe/.test(n) ? "dib" : null)],
  [/floor press/, () => "floorpress"],
  [/chest press|developpe machine/, () => "chestpress"],
  [/bench press|developpe couche/, n => (/dumbbell|haltere/.test(n) ? "dch" : "dc")],
  [/reverse fly|rear delt|oiseau|pec deck inverse/, n => (/machine|pec deck/.test(n) ? "reversepec" : "oiseau")],
  [/\bfly|flye|crossover|pec deck|ecarte/, () => "ecarte"],
  [/bench dip|dips? (sur|au) banc/, () => "dipsbanc"],
  [/\bdips?\b/, () => "dips"],
  [/push ?up|pompe/, n => (/pike/.test(n) ? "pike" : "pompes")],
  [/landmine/, () => "landmine"],
  [/overhead press|military|strict press|developpe militaire|shoulder press.*barbell/, () => "militaire"],
  [/shoulder press|arnold|developpe epaules?/, () => "dehassis"],
  [/lateral raise|elevations? laterales?/, n => (/cable|poulie/.test(n) ? "elevlatpoulie" : "elevlat")],
  [/face pull/, () => "facepull"],
  [/external rotation|rotations? externes?/, () => "rotext"],
  [/pull ?over/, () => "pullover"],
  [/bent over row|barbell row|pendlay|rowing barre/, () => "rowbarre"],
  [/seated.*row|cable row|rowing poulie/, () => "rowpoulie"],
  [/chest supported|t ?bar|buste appuye/, () => "rowappui"],
  [/inverted row|rowing inverse/, () => "rowinv"],
  [/machine row|row machine|rowing machine/, () => "rowmachine"],
  [/dumbbell row|one arm|row.*dumbbell|rowing haltere/, () => "row1"],
  [/pull ?down|tirage vertical/, n => (/neutral|close|v ?bar|neutre/.test(n) ? "tirageneutre" : "tirage")],
  [/assisted pull|tractions? assistees?/, () => "tractassist"],
  [/negative|negatives?/, () => "tractneg"],
  [/chin ?up|supination/, () => "chinup"],
  [/pull ?up|traction/, () => "tractions"],
  [/pallof/, () => "pallof"],
  [/farmer|fermier/, () => "farmer"],
  [/cable crunch|crunch.*poulie/, () => "crunchpoulie"],
  [/leg raise|releves? de jambes/, () => "releves"],
  [/side plank|gainage lateral/, () => "gainlat"],
  [/plank|planche|gainage/, () => "planche"],
  [/dead ?bug/, () => "deadbug"],
  [/bird ?dog/, () => "birddog"]
];
function importExercise(name) {
  const n = norm(name);
  const exact = Object.values(EXI).find(e => norm(e.n) === n);
  if (exact) return { id: exact.id, n: exact.n };
  for (const [re, pick] of IMPORT_RULES) {
    if (!re.test(n)) continue;
    const id = pick(n);
    if (id && EXI[id]) return { id, n: EXI[id].n };
  }
  return { id: null, n: String(name).trim().slice(0, 80) || "Exercice" };
}
function csvRows(text) {
  text = String(text).replace(/^﻿/, "");
  const first = text.split(/\r?\n/, 1)[0] || "";
  const delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ";" : ",";
  const rows = [];
  let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
const IMPORT_MONTHS = { jan: 0, janv: 0, feb: 1, fev: 1, fevr: 1, mar: 2, mars: 2, apr: 3, avr: 3, may: 4, mai: 4, jun: 5, juin: 5, jul: 6, juil: 6, aug: 7, aou: 7, aout: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
function importDate(s) {
  s = String(s || "").trim();
  let m = s.match(/^(\d{4})-(\d\d)-(\d\d)(?:[ T](\d\d):(\d\d))?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0)).getTime();
  m = s.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\.?\s+(\d{4}),?\s+(\d{1,2}):(\d\d)/);
  if (m) { const k = norm(m[2]), mo = IMPORT_MONTHS[k] ?? IMPORT_MONTHS[k.slice(0, 4)] ?? IMPORT_MONTHS[k.slice(0, 3)]; if (mo != null) return new Date(+m[3], mo, +m[1], +m[4], +m[5]).getTime(); }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d\d))?/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 12), +(m[5] || 0)).getTime();
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
}
const importDur = s => { const h = /(\d+)\s*h/.exec(s), mn = /(\d+)\s*m/.exec(s), c = /^(\d+):(\d\d)(?::(\d\d))?$/.exec(String(s).trim()); return c ? (+c[1]) * 3600 + (+c[2]) * 60 + (+(c[3] || 0)) : (h ? +h[1] * 3600 : 0) + (mn ? +mn[1] * 60 : 0); };
const importNum = v => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isFinite(n) ? n : null; };

/* lit le fichier : séances regroupées, exercices reconnus, unité des charges (Strong n'indique pas l'unité) */
function parseImport(text, unit) {
  const rows = csvRows(text);
  if (rows.length < 2) return null;
  const head = rows[0].map(h => h.toLowerCase().replace(/[_\s]+/g, " ").replace(/[()]/g, "").trim());
  const col = (...names) => { for (const n of names) { const i = head.indexOf(n); if (i >= 0) return i; } return -1; };
  const hevy = col("exercise title") >= 0;
  const C = hevy
    ? { date: col("start time"), end: col("end time"), name: col("title"), ex: col("exercise title"), type: col("set type"), kg: col("weight kg"), lb: col("weight lbs"), reps: col("reps"), sec: col("duration seconds"), note: col("exercise notes") }
    : { date: col("date"), name: col("workout name"), dur: col("duration"), ex: col("exercise name"), order: col("set order"), w: col("weight", "weight kg", "poids"), reps: col("reps", "repetitions"), sec: col("seconds", "duration s"), note: col("notes") };
  if (C.date < 0 || C.ex < 0 || C.reps < 0) return null;
  const toKg = (v, lb) => { const n = importNum(v); return n == null || n <= 0 ? null : Math.round((lb ? n * 0.45359237 : n) * 2) / 2; };
  const map = new Map(), names = new Map();
  for (const r of rows.slice(1)) {
    const t = importDate(r[C.date]);
    if (t == null || !r[C.ex]) continue;
    if (hevy && /warm/i.test(r[C.type] || "")) continue;
    if (!hevy && C.order >= 0 && /^[wd]/i.test(String(r[C.order]).trim())) continue;
    const reps = importNum(r[C.reps]), sec = C.sec >= 0 ? importNum(r[C.sec]) : null;
    const rr = reps && reps > 0 ? Math.round(reps) : sec && sec > 0 ? Math.round(sec) : null;
    if (!rr) continue;
    const w = hevy ? (C.kg >= 0 ? toKg(r[C.kg], false) : C.lb >= 0 ? toKg(r[C.lb], true) : null) : C.w >= 0 ? toKg(r[C.w], unit === "lb") : null;
    const key = `${r[C.date]}|${C.name >= 0 ? r[C.name] : ""}`;
    if (!map.has(key)) {
      const end = hevy && C.end >= 0 ? importDate(r[C.end]) : null, dur = end && end > t ? Math.round((end - t) / 1000) : !hevy && C.dur >= 0 ? importDur(r[C.dur]) : 0;
      map.set(key, { name: String(C.name >= 0 ? r[C.name] : "").trim() || "Séance importée", startedAt: t, dur, ex: new Map() });
    }
    const wk = map.get(key), raw = String(r[C.ex]).trim();
    if (!names.has(raw)) names.set(raw, importExercise(raw));
    const m = names.get(raw);
    if (!wk.ex.has(raw)) wk.ex.set(raw, { id: m.id, n: m.n, target: null, note: "", sets: [] });
    const x = wk.ex.get(raw);
    x.sets.push({ w, r: rr });
    if (C.note >= 0 && r[C.note] && !x.note) x.note = String(r[C.note]).slice(0, 500);
  }
  const list = [...map.values()].map(w => ({ ...w, ex: [...w.ex.values()].filter(x => x.sets.length) })).filter(w => w.ex.length).sort((a, b) => a.startedAt - b.startedAt);
  const all = [...names.values()];
  return { source: hevy ? "Hevy" : "Strong", workouts: list, known: all.filter(x => x.id).length, custom: all.filter(x => !x.id).map(x => x.n) };
}
/* ajoute les séances au carnet : sans doublon, avec les records recalculés dans l'ordre */
function applyImport(parsed) {
  const existing = new Set(workouts.map(w => Math.round(w.startedAt / 60000)));
  const fresh = parsed.workouts.filter(w => !existing.has(Math.round(w.startedAt / 60000)));
  const timeline = [...workouts.map(w => ({ w, mine: false })), ...fresh.map(w => ({ w, mine: true }))].sort((a, b) => a.w.startedAt - b.w.startedAt);
  const best = {};
  let n = 0;
  for (const { w, mine } of timeline) {
    const prs = [];
    for (const x of w.ex) {
      const key = keyOf(x), b = bestSet(x.sets);
      if (!b) continue;
      if (mine && best[key] != null && b.e > best[key] + 0.05) prs.push({ key, n: x.n, e: Math.round(b.e * 10) / 10, w: b.w, r: b.r });
      best[key] = Math.max(best[key] || 0, b.e);
    }
    if (!mine) continue;
    const saved = { id: "imp" + w.startedAt.toString(36) + (n++).toString(36), name: w.name.slice(0, 80), si: null, startedAt: w.startedAt, endedAt: w.startedAt + w.dur * 1000, dur: w.dur, ex: w.ex, prs, src: parsed.source };
    saved.vol = Math.round(volOf(saved));
    saved.nsets = saved.ex.reduce((t, x) => t + x.sets.length, 0);
    putWorkout(saved);
  }
  return { added: fresh.length, skipped: parsed.workouts.length - fresh.length };
}
let pendingImport = null;
function importSummaryHTML(p, unit) {
  const d = t => dateFr(t, { day: "numeric", month: "short", year: "numeric" }), W = p.workouts;
  return `<h2 id="sheet-title">Importer depuis ${p.source}</h2>
    <p><b>${W.length} séance${W.length > 1 ? "s" : ""}</b> du ${d(W[0].startedAt)} au ${d(W[W.length - 1].startedAt)}, ${p.known + p.custom.length} exercice${p.known + p.custom.length > 1 ? "s" : ""} : ${p.known} reconnu${p.known > 1 ? "s" : ""}${p.custom.length ? `, ${p.custom.length} ${p.custom.length > 1 ? "gardés tels quels" : "gardé tel quel"} (${esc(p.custom.slice(0, 3).join(", "))}${p.custom.length > 3 ? "…" : ""})` : ""}.</p>
    ${p.source === "Strong" ? `<div class="field"><span class="flabel">Unité des charges dans ce fichier</span><div class="chips" role="group"><button type="button" data-act="import-unit" data-u="kg" aria-pressed="${unit !== "lb"}">Kilos</button><button type="button" data-act="import-unit" data-u="lb" aria-pressed="${unit === "lb"}">Livres (lb)</button></div></div>` : ""}
    <p class="muted small">Tes séances rejoignent ton historique, tes courbes et tes records. Les séances déjà présentes ne sont pas dupliquées.</p>
    <div class="row"><button type="button" class="btn2" data-act="sheet-close">Annuler</button><span class="sp"></span><button type="button" class="primary" data-act="import-go">Importer</button></div>`;
}
document.addEventListener("change", e => {
  if (e.target.id !== "import-csv" || !e.target.files[0]) return;
  const f = e.target.files[0];
  e.target.value = "";
  f.text().then(text => {
    const p = parseImport(text, "kg");
    if (!p || !p.workouts.length) { toast("Ce fichier n'est pas un export Strong ou Hevy (CSV) lisible."); return; }
    pendingImport = { text, unit: "kg", p };
    openSheet(importSummaryHTML(p, "kg"));
  }).catch(() => toast("Lecture du fichier impossible."));
});
document.addEventListener("click", e => {
  const b = e.target.closest('[data-act="import-unit"], [data-act="import-go"]');
  if (!b || !pendingImport) return;
  if (b.dataset.act === "import-unit") {
    pendingImport.unit = b.dataset.u;
    pendingImport.p = parseImport(pendingImport.text, pendingImport.unit);
    $("#sheet-box").innerHTML = importSummaryHTML(pendingImport.p, pendingImport.unit);
    return;
  }
  const r = applyImport(pendingImport.p), src = pendingImport.p.source;
  pendingImport = null;
  closeSheet();
  render(true);
  toast(r.added ? `${r.added} séance${r.added > 1 ? "s" : ""} importée${r.added > 1 ? "s" : ""} depuis ${src}${r.skipped ? ` (${r.skipped} déjà présente${r.skipped > 1 ? "s" : ""})` : ""}.` : "Ces séances sont déjà dans ton carnet.");
});
