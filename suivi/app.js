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
const FONTE_URL = (window.FONTE_PWA && window.FONTE_PWA.fonteUrl) || "https://claude.ai/artifact/GZh1f7mSmhsXee1f6ouPEW";
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
function pickSlot(slot, used, st, rot = 0) {
  let p = slot, idx = 0, prefs = null;
  if (slot.includes("=")) { const parts = slot.split("="); p = parts[0]; prefs = parts[1].split(","); }
  else if (slot.includes(":")) { const parts = slot.split(":"); p = parts[0]; idx = +parts[1]; }
  const ok = candidates(p, st);
  if (prefs) { const avail = prefs.map(id => ok.find(x => x.id === id && !used.has(x.id))).filter(Boolean); if (avail.length) return avail[rot % avail.length]; }
  const pool = ok.filter(e => !used.has(e.id));
  return pool.length ? pool[(idx + rot) % pool.length] : null;
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
/* à chaque nouveau cycle, les exercices accessoires changent (même règle que dans Fonte) */
function buildPlan(st) {
  let n = +st.time; if ((st.goal === "seche" || st.goal === "forme") && n >= 4) n++;
  const rot = Math.max(0, (+st.cycle || 1) - 1);
  return SPLIT[st.days].map((key, d) => {
    const tpl = T[key], used = new Set(), ex = [];
    for (const slot of tpl.s) {
      if (ex.length >= n) break;
      const e = pickSlot(slot, used, st, ex.length >= 2 ? rot : 0);
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
const defaultsProfile = () => ({ program: null, plan: "free", bundle: false, importedAt: null, lastCode: null, stage: null, body: null, bar: 20 });
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
/* appli installée avec paiement en ligne : Premium et la réduction viennent des jetons d'achat rangés sur l'appareil */
const PAY = () => !!(window.FONTE_PWA && window.FONTE_PWA.payOn && window.FONTE_PWA.payOn());
const isPro = () => (PAY() ? window.FONTE_PWA.has("premium") : profile.plan === "premium");
const hasBundle = () => (PAY() ? window.FONTE_PWA.has("fonte") : profile.bundle);
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
  shareState();
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
  pullFonte();
  shareState();
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
    from: { goal, level, days, time, eq, pain }, paid: o.p === 1, code: m[0], stage: clampInt(o.k, 1, 3) || 1,
    sessions: o.s.slice(0, 7).map(s => ({
      name: String(s[0] || "Séance").slice(0, 60), day: String(s[1] || "").slice(0, 3),
      ex: (Array.isArray(s[2]) ? s[2] : []).slice(0, 12).map(x => {
        const e = EXI[x[0]];
        const o2 = { id: e ? e.id : null, n: e ? e.n : String(x[5] || "Exercice").slice(0, 80), sets: clampInt(x[1], 1, 10) || 3, reps: String(x[2] || "8 à 12").slice(0, 40), rest: String(x[3] || "90 s").slice(0, 30), rir: String(x[4] || "2").slice(0, 20) };
        if (x[6] != null) o2.b = { sets: clampInt(x[6], 1, 10) || o2.sets, reps: String(x[7] || o2.reps).slice(0, 40), rest: String(x[8] || o2.rest).slice(0, 30), rir: String(x[9] || o2.rir).slice(0, 20) };
        if (x[10] === 1) o2.fixed = true;
        return o2;
      })
    }))
  };
}
function importCode(code, fromApp) {
  let prog;
  try { prog = decodeCode(code); } catch (e) { if (!fromApp) toast("Code non reconnu : copie-le à nouveau depuis Fonte."); return false; }
  const ps = profile.stage, same = profile.program && JSON.stringify(profile.program.from) === JSON.stringify(prog.from);
  profile.stage = ps && same && ps.n === prog.stage ? ps : { n: prog.stage, at: Date.now(), cycle: (ps && ps.cycle) || 1, done: (ps && ps.done) || 0 };
  profile.program = { from: prog.from, sessions: prog.sessions, paid: prog.paid };
  profile.bundle = prog.paid;
  profile.importedAt = Date.now();
  profile.lastCode = fp(prog.code);
  pendingCode = null;
  saveProfile();
  render();
  toast(fromApp ? "Programme mis à jour depuis l'onglet Programme." : prog.paid ? "Programme importé. Ton offre −50 % sur Premium est active." : "Programme importé.");
  return true;
}

/* ===== Calculs ===== */
function e1rm(w, r) { if (!w || !r) return 0; return r === 1 ? w : w * (1 + Math.min(r, 12) / 30); }
function bestSet(sets) { let b = null; for (const s of sets) { const e = e1rm(s.w, s.r); if (e && (!b || e > b.e)) b = { e, w: s.w, r: s.r }; } return b; }
const keyOf = x => x.id || "c:" + norm(x.n);
/* dernière note laissée sur cet exercice (réglage machine, prise…) */
function lastNote(key, before) {
  let best = null;
  for (const w of workouts) { if (before && w.startedAt >= before) continue; const x = w.ex.find(y => keyOf(y) === key && y.note); if (x && (!best || w.startedAt > best.t)) best = { t: w.startedAt, note: x.note }; }
  return best;
}
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
  const dl = stageNow(workouts).deload;
  active = { id: newId(), name: s.name, si, startedAt: Date.now(), deload: dl, ex: (dl ? s.ex.map(PG.deload) : s.ex).map(mkActiveEx) };
  applySS(active);
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
/* ===== Barre et disques, séries d'échauffement ===== */
const BAR_EX = ["squat", "frontsq", "rdl", "sdt", "hipthrust", "dc", "dib", "militaire", "rowbarre", "dcserre"];
const DISQUES = [25, 20, 15, 10, 5, 2.5, 1.25];
const barKg = () => (profile.bar === 15 || profile.bar === 10 ? profile.bar : 20);
const isBarbell = x => BAR_EX.includes(x.id) && (!profile.program || from().eq === "gym");
function platesFor(w, bar = barKg()) {
  if (!(w > 0)) return null;
  if (w < bar) return { light: true };
  let side = Math.round((w - bar) / 2 * 100) / 100;
  const out = [];
  for (const p of DISQUES) while (side >= p - 1e-9) { out.push(p); side = Math.round((side - p) * 100) / 100; }
  return { plates: out, rest: side };
}
function platesTxt(w) {
  const r = platesFor(w);
  if (!r) return "";
  if (r.light) return `moins lourd que la barre (${barKg()} kg)`;
  if (!r.plates.length) return `barre seule (${barKg()} kg)`;
  return `par côté : ${r.plates.map(f1).join(" + ")}${r.rest > 0 ? ` (+ ${f1(r.rest)} kg à compléter)` : ""}`;
}
function nextWeight(x) { const st = x.sets.find(z => !z.done) || x.sets[x.sets.length - 1]; return st ? (st.w ?? st.pw ?? null) : null; }
function platesHTML(x, i) {
  if (!isBarbell(x)) return "";
  const w = nextWeight(x);
  return `<p class="plates" id="pl-${i}"><span>${w ? `${f1(w)} kg · ${esc(platesTxt(w))}` : "Indique une charge pour voir les disques à mettre."}</span> <button type="button" class="linkbtn" data-act="bar">barre de ${barKg()} kg</button></p>`;
}
function warmSets(x, i) {
  const e = EXI[x.id], first = x.sets[0];
  if (i !== 0 || !e || e.k !== "c" || !first) return [];
  const W = first.w ?? first.pw;
  if (!(W > 0)) return [];
  if (isBarbell(x)) {
    const bar = barKg();
    if (W <= bar + 5) return [];
    const steps = [[bar, 10], [W * 0.4, 8], [W * 0.6, 5], [W * 0.8, 3]].map(([w, r]) => [Math.max(bar, Math.round(w / 2.5) * 2.5), r]);
    return steps.filter((st, k) => k === 0 || (st[0] > steps[k - 1][0] && st[0] < W));
  }
  if (W < 10) return [];
  return [[W * 0.5, 8], [W * 0.75, 4]].map(([w, r]) => [Math.round(w), r]).filter(st => st[0] > 0 && st[0] < W);
}
function warmHTML(x, i, open) {
  const ws = warmSets(x, i);
  if (!ws.length) return "";
  const bar = isBarbell(x);
  return `<details class="warm" id="warm-${i}"${open ? " open" : ""}><summary>Échauffement conseillé · ${ws.length} séries légères</summary><ol>${ws.map(([w, r]) => `<li><b>${f1(w)} kg × ${r}</b>${bar ? ` <span class="muted">${esc(platesTxt(w))}</span>` : ""}</li>`).join("")}</ol><p class="muted small">Peu de repos, jamais à l'échec. Ces séries ne comptent pas dans ta séance.</p></details>`;
}
/* ===== Supersets : exercices voisins enchaînés sans repos, le repos vient après le dernier ===== */
const ssRuns = () => {
  const runs = [], ex = active ? active.ex : [];
  for (let i = 0; i < ex.length; i++) {
    if (!ex[i].ss) continue;
    let j = i;
    while (j + 1 < ex.length && ex[j + 1].ss === ex[i].ss) j++;
    if (j > i) runs.push([i, j]);
    i = j;
  }
  return runs;
};
function ssInfo(i) {
  const runs = ssRuns(), k = runs.findIndex(([a, b]) => i >= a && i <= b);
  if (k < 0) return null;
  const [a, b] = runs[k];
  return { letter: String.fromCharCode(65 + k), pos: i - a + 1, size: b - a + 1, last: i === b, next: i < b ? i + 1 : null, first: a };
}
function normalizeSS() {
  const ex = active.ex, keep = new Set();
  ssRuns().forEach(([a, b]) => { for (let k = a; k <= b; k++) keep.add(k); });
  ex.forEach((x, k) => { if (x.ss && !keep.has(k)) delete x.ss; });
}
function toggleSS(i) {
  const ex = active.ex, x = ex[i], y = ex[i + 1];
  if (!x || !y) return;
  if (x.ss && x.ss === y.ss) {
    const fresh = newId();
    for (let k = i + 1; k < ex.length && ex[k].ss === x.ss; k++) ex[k].ss = fresh;
  } else {
    const id = x.ss || newId(), old = y.ss;
    x.ss = id;
    for (let k = i + 1; k < ex.length && (k === i + 1 || (old && ex[k].ss === old)); k++) ex[k].ss = id;
  }
  normalizeSS();
}
/* mémorise les supersets d'une séance du programme pour les prochaines fois */
function rememberSS(si) {
  if (si == null || !active) return;
  const runs = ssRuns().map(([a, b]) => active.ex.slice(a, b + 1).map(x => x.id));
  profile.supersets = { ...(profile.supersets || {}), [si]: runs };
}
function applySS(a) {
  const runs = (profile.supersets || {})[a.si] || [];
  runs.forEach(ids => {
    const start = a.ex.findIndex((x, k) => ids.every((id, m) => a.ex[k + m] && a.ex[k + m].id === id));
    if (start < 0) return;
    const g = newId();
    ids.forEach((id, m) => { a.ex[start + m].ss = g; });
  });
}
function refreshAids(i) {
  const x = active && active.ex[i];
  if (!x) return;
  const pl = $("#pl-" + i), wm = $("#warm-" + i);
  if (pl) pl.outerHTML = platesHTML(x, i);
  const html = warmHTML(x, i, wm && wm.open);
  if (wm) { if (html) wm.outerHTML = html; else wm.remove(); }
  else if (html) { const anchor = $("#pl-" + i) || document.querySelector(`#ex-${i} .tip-line`); if (anchor) anchor.insertAdjacentHTML("afterend", html); }
}
function exCardHTML(x, i) {
  const e = EXI[x.id], t = x.target, timed = e && e.k === "t";
  const tgt = t ? `Objectif : ${t.sets} × ${t.reps}${e && e.u ? " / côté" : ""}${t.rir && t.rir !== "—" ? ` · RIR ${t.rir}` : ""} · repos ${t.rest}` : "";
  const sug = suggestion(x);
  const tip = isPro() ? `<p class="tip-line"><b>Conseil :</b> ${esc(sug.txt)}</p>` : `<p class="tip-line locked">Conseil de charge automatique avec Premium. <button type="button" class="linkbtn" data-act="go-offre">Voir l'offre</button></p>`;
  const cues = e ? `<p>${esc(e.c)}</p><p class="err"><b>Erreur fréquente :</b> ${esc(e.e)}</p>` : `<p>Exercice personnalisé.</p>`;
  const anyDone = x.sets.some(s => s.done), demo = typeof DEMO !== "undefined" && DEMO.has(x.id);
  const ln = !x.note && !x.showNote ? lastNote(keyOf(x), active.startedAt) : null;
  const ss = ssInfo(i);
  return `<article class="exc${ss ? " ss" : ""}" id="ex-${i}" data-i="${i}">${ss ? `<p class="ssbadge">Superset ${ss.letter} · ${ss.letter}${ss.pos} sur ${ss.size}${ss.last ? " · puis repos" : " · enchaîne sans repos"}</p>` : ""}
    <div class="exhead">${demo ? `<button type="button" class="thumb" data-act="cues" data-i="${i}" aria-expanded="false" aria-controls="cues-${i}" aria-label="Démo animée : ${esc(x.n)}">${DEMO.thumb(x.id)}</button>` : ""}<h2 class="exname">${esc(x.n)}</h2><button type="button" class="iconbtn" data-act="ex-menu" data-i="${i}" aria-expanded="false" aria-controls="exm-${i}" aria-label="Options : ${esc(x.n)}">${ICON.dots}</button></div>
    ${tgt ? `<p class="target">${esc(tgt)}</p>` : ""}${ln ? `<p class="lastnote">Ta note du ${dateFr(ln.t, { day: "numeric", month: "short" })} : <q>${esc(ln.note)}</q> <button type="button" class="linkbtn" data-act="note-reuse" data-i="${i}">Reprendre</button></p>` : ""}${tip}${platesHTML(x, i)}${warmHTML(x, i)}
    <div class="row" id="exm-${i}" hidden><button type="button" class="btn2" data-act="cues" data-i="${i}" aria-expanded="false" aria-controls="cues-${i}">${demo ? "Démo et consignes" : "Consignes"}</button><button type="button" class="btn2" data-act="replace" data-i="${i}"${anyDone ? " disabled" : ""}>Remplacer</button>${i > 0 ? `<button type="button" class="btn2" data-act="up" data-i="${i}">Monter</button>` : ""}${i < active.ex.length - 1 ? `<button type="button" class="btn2" data-act="down" data-i="${i}">Descendre</button>` : ""}${i < active.ex.length - 1 ? `<button type="button" class="btn2" data-act="ss-link" data-i="${i}">${x.ss && active.ex[i + 1].ss === x.ss ? "Délier du suivant" : "Superset avec le suivant"}</button>` : ""}<button type="button" class="btn2" data-act="remove-ex" data-i="${i}">Retirer</button></div>
    <div class="cues" id="cues-${i}" hidden>${demo ? `<div class="anim-host" data-ex="${x.id}" data-name="${esc(x.n)}"></div>` : ""}${cues}</div>
    <div class="sets"><div class="srow h" aria-hidden="true"><span>#</span><span>Précédent</span><span>kg</span><span>${timed ? "Durée" : "Reps"}</span><span></span></div>${x.sets.map((s, j) => setRowHTML(x, i, s, j)).join("")}</div>
    <div class="exfoot"><button type="button" class="btn2" data-act="add-set" data-i="${i}">+ Série</button>${x.sets.length > 1 ? `<button type="button" class="btn2" data-act="del-set" data-i="${i}">− Série</button>` : ""}<span class="sp"></span><button type="button" class="linkbtn" data-act="note" data-i="${i}">${x.note ? "Note" : "Ajouter une note"}</button>${x.note || x.showNote ? `<textarea class="note-in" data-i="${i}" aria-label="Note pour ${esc(x.n)}" placeholder="Sensations, réglage machine, douleur…">${esc(x.note)}</textarea>` : ""}</div>
  </article>`;
}
function liveHTML() {
  const a = active;
  return `<div class="livehead"><div><h1 class="lvname">${esc(a.name)}</h1>${a.deload ? ' <span class="badge">Décharge</span>' : ""}<div class="muted small" id="live-count">${doneCount()} / ${totalCount()} séries validées</div></div><span class="sp"></span><span class="clock" id="clock">${mmss((Date.now() - a.startedAt) / 1000)}</span><button type="button" class="primary red" data-act="finish">Terminer</button></div>
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
    const ss = ssInfo(i);
    if (ss && !ss.last) {
      stopRest();
      const nx = active.ex[ss.next];
      toast(`Enchaîne : ${nx.n}`);
      setTimeout(() => { const inp = document.querySelector(`.srow[data-i="${ss.next}"][data-j="${Math.min(j, nx.sets.length - 1)}"] [data-f="w"]`); if (inp) { inp.scrollIntoView({ block: "center", behavior: reduceMotion() ? "auto" : "smooth" }); inp.focus({ preventScroll: true }); } }, 60);
    } else startRest(restSec(x.target ? x.target.rest : "90 s"), ss ? `Repos · superset ${ss.letter}` : `Repos · ${x.n}`);
  } else s.done = false;
  saveActive();
  if (row) {
    row.classList.toggle("done", s.done);
    row.querySelector(".chk").setAttribute("aria-pressed", s.done ? "true" : "false");
    row.querySelector('[data-f="w"]').value = inVal(s.w);
    row.querySelector('[data-f="r"]').value = s.r ?? "";
  }
  refreshAids(i);
  updateCount();
}
function buildSaved(a) {
  const endedAt = Date.now();
  const ex = a.ex.map((x, k) => { const ss = ssInfo(k); return { id: x.id, n: x.n, target: x.target || null, note: (x.note || "").slice(0, 500), ...(ss ? { ss: ss.letter } : {}), sets: x.sets.filter(s => s.done).map(s => ({ w: s.w ?? null, r: s.r ?? null })) }; }).filter(x => x.sets.length);
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
  const w = buildSaved(active), xp = xpHTML(w);
  pendingGain = xp.g;
  openSheet(`<h2 id="sheet-title">Bravo, séance terminée</h2>
    <div class="summary-grid"><div class="stat"><span>Durée</span><b>${mmss(w.dur)}</b></div><div class="stat"><span>Séries</span><b>${w.nsets}</b></div><div class="stat"><span>Volume</span><b>${f0(w.vol)} kg</b></div></div>
    ${xp.html}
    ${w.prs.length ? `<div class="card"><h3>${w.prs.length} record${w.prs.length > 1 ? "s" : ""} battu${w.prs.length > 1 ? "s" : ""}</h3><ul style="margin:6px 0 0;padding-left:20px">${w.prs.map(p => `<li><b>${esc(p.n)}</b> : force estimée ${f1(p.e)} kg (${f1(p.w)} kg × ${p.r})</li>`).join("")}</ul></div>` : `<p class="muted">Pas de record aujourd'hui : la régularité fait le travail.</p>`}
    ${totalCount() > doneCount() ? `<p class="muted small">${totalCount() - doneCount()} série(s) non validée(s) ne seront pas enregistrées.</p>` : ""}
    <div class="row"><button type="button" class="btn2" data-act="sheet-close">Continuer la séance</button><button type="button" class="btn2" data-act="share-w">Partager</button><span class="sp"></span><button type="button" class="primary" data-act="save-workout">Enregistrer la séance</button></div>`);
  pendingSave = w;
}
let pendingSave = null, pendingGain = null;
function saveFinished() {
  if (!pendingSave) return;
  const w = pendingSave;
  pendingSave = null;
  if (active && active.si != null && program().sessions[active.si]) { rememberSS(active.si); saveProfile(); }
  putWorkout(w);
  if (storeMode === "local" && persisted !== true && window.FONTE_PWA && window.FONTE_PWA.protect) window.FONTE_PWA.protect().then(v => { persisted = v; });
  active = null; saveActive(); stopRest(); releaseWake(); closeSheet();
  demo = null;
  render();
  const g = pendingGain;
  pendingGain = null;
  if (g && g.tierUp) toast(`Nouveau palier : ${g.after.tier.n} ! +${f0(g.delta)} points`);
  else toast(`Séance enregistrée${w.prs.length ? ` · ${w.prs.length} record${w.prs.length > 1 ? "s" : ""}` : ""}${g && g.delta ? ` · +${f0(g.delta)} points` : ""}`);
}
function discardWorkout() { active = null; saveActive(); stopRest(); releaseWake(); closeSheet(); render(); toast("Séance abandonnée."); }

/* ===== Minuteur, son, écran allumé ===== */
function startRest(sec, label) {
  rest = { end: Date.now() + sec * 1000, total: sec, label, over: false };
  $("#rest-sr").textContent = "";
  $("#toast").hidden = true; // le minuteur prend la place du message
  clearTimeout(toastTimer);
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
    if (!rest.over) { rest.over = true; beep(); try { if (navigator.vibrate) navigator.vibrate([250, 120, 250]); } catch (e) { /* vibreur absent */ } $("#rest-in").classList.add("over"); $("#rest-l").textContent = "Repos terminé : série suivante !"; $("#rest-sr").textContent = "Repos terminé : série suivante."; $("#rest-t").textContent = "0:00"; $("#rest-p").style.width = "100%"; }
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
document.addEventListener("visibilitychange", () => { if (document.visibilityState !== "visible") return; if (active) requestWake(); tickRest(); });
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
  const items = list.slice(0, 60).map(e => { const warn = e.av.filter(a => pain.includes(a)), demo = typeof DEMO !== "undefined" && DEMO.has(e.id); return `<button type="button" class="lib-item${demo ? " hasdemo" : ""}" data-act="lib-pick" data-id="${e.id}">${demo ? `<span class="thumb" aria-hidden="true">${DEMO.thumb(e.id)}</span>` : ""}<b>${esc(e.n)}</b><span>${e.m.map(k => MUS[k]).join(", ")}</span>${warn.length ? `<span class="warn">Déconseillé pour : ${warn.map(z => ZONES[z].toLowerCase()).join(", ")}</span>` : ""}</button>`; }).join("");
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
/* garde le focus clavier dans une fenêtre modale */
function trapTab(e, box) {
  const f = [...box.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')].filter(el => el.getClientRects().length);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1], inside = box.contains(document.activeElement);
  if (e.shiftKey && (!inside || document.activeElement === first)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (!inside || document.activeElement === last)) { e.preventDefault(); first.focus(); }
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
  b.textContent = isPro() ? (hasBundle() ? "Premium · −50 %" : "Premium") : "Gratuit";
  b.classList.toggle("pro", isPro());
  const p = ptsNow(workouts), on = PG.earned(p.idx);
  document.querySelectorAll(".brand .minibar i").forEach((el, i) => el.classList.toggle("off", !on[i]));
  const t = $("#tier-pill");
  if (t) { t.textContent = p.tier.n; t.setAttribute("aria-label", `Ton palier : ${p.tier.n}, ${f0(p.total)} points`); t.classList.toggle("gold", !!p.tier.gold); }
}
function importBanner() {
  if (!pendingCode) return "";
  let p = null;
  try { p = decodeCode(pendingCode); } catch (e) { return ""; }
  return `<div class="banner"><b>Programme Fonte reçu</b><p>${esc(LABEL.goal[p.from.goal])} · ${p.sessions.length} séances · ${esc(LABEL.eq[p.from.eq])}${p.paid ? " · donne droit à −50 % sur Premium" : ""}.${profile.program ? " Il remplacera ton programme actuel." : ""}</p><div class="row"><button type="button" class="primary" data-act="import-pending">Importer ce programme</button><button type="button" class="btn2" data-act="ignore-pending">Ignorer</button></div></div>`;
}
/* ===== Sauvegarde : dans l'appli installée, les séances ne sont que sur ce téléphone ===== */
let persisted = null;
function backupDue() {
  const F = window.FONTE_PWA;
  if (!F || !F.backupInfo || storeMode !== "local" || workouts.length < 5) return false;
  const b = F.backupInfo(), now = Date.now();
  return now - (b.le || 0) > 30 * DAY && now > (b.rappel || 0);
}
function backupBanner() {
  if (!backupDue()) return "";
  const F = window.FONTE_PWA, b = F.backupInfo(), n = workouts.length;
  return `<div class="banner"><b>Mets tes séances à l'abri</b><p>Tes ${n} séances ne sont enregistrées que sur ce téléphone${b.le ? ` (dernière sauvegarde le ${dateFr(b.le, { day: "numeric", month: "long" })})` : ""}. Télécharge une sauvegarde à garder dans Fichiers, Drive ou tes e-mails : tu pourras la réimporter sur n'importe quel téléphone.${F.apple() && !F.installed() ? " Installe aussi l'appli sur ton écran d'accueil : Safari peut effacer les données d'un site non installé après 7 jours sans visite." : ""}</p><div class="row"><button type="button" class="primary" data-act="backup-now">Sauvegarder</button><button type="button" class="btn2" data-act="backup-later">Plus tard</button></div></div>`;
}
function exportBackup() {
  window.FONTE_PWA.exportAll().then(() => { toast("Sauvegarde téléchargée : garde le fichier en lieu sûr."); render(); }).catch(() => toast("Le téléchargement n'a pas pu se faire."));
}
function renderSeance(force) {
  const V = $("#v-seance");
  if (active) { if (force || !V.querySelector(".livehead")) V.innerHTML = liveHTML(); return; }
  if (!storeReady) { V.innerHTML = `<section><h1>Ta séance</h1><p class="muted">Chargement de tes séances…</p></section>`; return; }
  const P = program(), st = from(), nx = nextSession();
  const wkStart = weekStart(Date.now());
  const thisWeek = workouts.filter(w => w.startedAt >= wkStart);
  const target = +st.days || P.sessions.length;
  V.innerHTML = `${importBanner()}${backupBanner()}
  <section><h1>Ta séance</h1><p class="muted">${P.example ? "Programme d'exemple en attendant ton programme Fonte." : `${esc(LABEL.goal[st.goal])} · ${esc(LABEL.level[st.level])} · ${esc(LABEL.eq[st.eq])}`}</p></section>
  <section class="stats"><div class="stat"><span>Cette semaine</span><b>${thisWeek.length} / ${target}</b></div><div class="stat"><span>Volume semaine</span><b>${f0(thisWeek.reduce((t, w) => t + (w.vol || 0), 0))} kg</b></div><div class="stat"><span>Série en cours</span><b>${streak(workouts, target)} sem.</b></div></section>
  ${homeProgressHTML()}
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
    ${w.demo ? "" : `<section class="row"><button type="button" class="primary" data-act="redo" data-id="${esc(w.id)}">Refaire cette séance</button><button type="button" class="btn2" data-act="share-w" data-id="${esc(w.id)}">Partager</button><span class="sp"></span><button type="button" class="btn2" data-act="delete-w" data-id="${esc(w.id)}">Supprimer</button></section>`}`;
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
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="group" aria-label="Séances par semaine sur 12 semaines">`;
  for (let v = 0; v <= top + 0.001; v += step) s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end">${f1(v)}</text>`;
  bars.forEach((b, i) => {
    const x = pl + slot * i + (slot - bw) / 2, y = Y(b.v), h = Y(0) - y;
    if (b.v > 0) s += `<path d="M${x},${Y(0)} V${y + 4} Q${x},${y} ${x + 4},${y} H${x + bw - 4} Q${x + bw},${y} ${x + bw},${y + 4} V${Y(0)} Z" fill="var(--bar)"/>`;
    s += `<rect class="hit" data-i="${i}" x="${pl + slot * i}" y="${pt}" width="${slot}" height="${H - pt - pb}" fill="transparent" tabindex="0" role="img" aria-label="${esc(b.label)} : ${b.v} séance${b.v > 1 ? "s" : ""}"/>`;
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
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="group" aria-label="Force estimée au fil des séances">`;
  for (let v = yMin; v <= yMax + 0.001; v += step) s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end">${f0(v)}</text>`;
  s += `<text x="${pl}" y="${H - 6}">${dateFr(t0, { day: "numeric", month: "short" })}</text><text x="${W - pr}" y="${H - 6}" text-anchor="end">${dateFr(t1, { day: "numeric", month: "short" })}</text>`;
  const path = pts.map((p, i) => `${i ? "L" : "M"}${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  s += `<path d="${path} L${X(t1).toFixed(1)},${Y(yMin)} L${X(t0).toFixed(1)},${Y(yMin)} Z" fill="var(--bar)" opacity=".1"/><path d="${path}" fill="none" stroke="var(--bar)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  pts.forEach(p => { s += `<circle cx="${X(p.t)}" cy="${Y(p.v)}" r="${p.pr ? 5.5 : 4}" fill="${p.pr ? "var(--yellow)" : "var(--bar)"}" stroke="var(--surface)" stroke-width="2"/>`; });
  const lp = pts[pts.length - 1];
  s += `<text x="${Math.min(W - pr, X(lp.t))}" y="${Y(lp.v) - 10}" text-anchor="end" style="fill:var(--ink);font-weight:600">${f1(lp.v)} kg</text>`;
  s += `<line class="xh" x1="0" x2="0" y1="${pt}" y2="${H - pb}" stroke="var(--muted)" stroke-width="1" visibility="hidden"/><rect class="hit" x="${pl}" y="${pt}" width="${W - pl - pr}" height="${H - pt - pb}" fill="transparent" tabindex="0" role="img" aria-label="Courbe de force : flèches gauche et droite pour parcourir les séances"/></svg><div class="tip" hidden aria-live="polite"></div>`;
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
/* ===== Bilan du mois : séances, volume, points gagnés, plus forte progression, records ===== */
let recapOffset = 0;
function monthBounds(off) { const d = new Date(); return [new Date(d.getFullYear(), d.getMonth() - off, 1).getTime(), new Date(d.getFullYear(), d.getMonth() - off + 1, 1).getTime()]; }
function monthStats(list, off) {
  const [a, b] = monthBounds(off), ws = list.filter(w => w.startedAt >= a && w.startedAt < b), before = list.filter(w => w.startedAt < a);
  const bestOf = (arr, k) => Math.max(0, ...arr.map(w => { const x = w.ex.find(y => keyOf(y) === k), bs = x && bestSet(x.sets); return bs ? bs.e : 0; }));
  let top = null;
  for (const k of new Set(ws.flatMap(w => w.ex.map(keyOf)))) {
    const bm = bestOf(ws, k), bb = bestOf(before, k);
    if (bb > 0 && bm > bb && (!top || (bm - bb) / bb > top.gain)) top = { n: (ws.flatMap(w => w.ex).find(x => keyOf(x) === k) || {}).n, gain: (bm - bb) / bb, from: bb, to: bm };
  }
  let pts = 0;
  try { pts = ptsNow(list.filter(w => w.startedAt < b)).total - ptsNow(before).total; } catch (e) { pts = 0; }
  return { a, n: ws.length, vol: ws.reduce((t, w) => t + (w.vol || volOf(w)), 0), prs: ws.flatMap(w => w.prs || []), top, pts };
}
function recapHTML(list) {
  const cur = monthStats(list, recapOffset), prev = monthStats(list, recapOffset + 1);
  const name = new Date(cur.a).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const volTxt = v => (v >= 10000 ? `${f1(v / 1000)} t` : `${f0(v)} kg`);
  const delta = (x, y, fmt) => (y ? `<em class="${x >= y ? "up" : "down"}">${x >= y ? "+" : "−"}${fmt(Math.abs(x - y))} sur un mois</em>` : "");
  const oldest = list.length ? Math.min(...list.map(w => w.startedAt)) : Date.now();
  const de = /^[aeiouyàâéèêîôû]/i.test(name) ? "d'" : "de ";
  return `<section class="card recap"><div class="sechead"><h2>Bilan ${de}${esc(name)}</h2><div class="row"><button type="button" class="iconbtn" data-act="recap-prev"${cur.a > oldest ? "" : " disabled"} aria-label="Mois précédent">‹</button><button type="button" class="iconbtn" data-act="recap-next"${recapOffset ? "" : " disabled"} aria-label="Mois suivant">›</button></div></div>
    ${cur.n ? `<div class="recap-grid"><div class="stat"><span>Séances</span><b>${cur.n}</b>${delta(cur.n, prev.n, f0)}</div><div class="stat"><span>Volume soulevé</span><b>${volTxt(cur.vol)}</b>${delta(cur.vol, prev.vol, volTxt)}</div><div class="stat"><span>Points gagnés</span><b>+${f0(cur.pts)}</b></div></div>
    ${cur.top ? `<p><b>Plus forte progression</b> : ${esc(cur.top.n)}, force estimée ${f1(cur.top.from)} → ${f1(cur.top.to)} kg (+${f0(cur.top.gain * 100)} %).</p>` : ""}
    ${cur.prs.length ? `<p><b>${cur.prs.length} record${cur.prs.length > 1 ? "s" : ""}</b> : ${esc([...new Set(cur.prs.map(p => p.n))].slice(0, 3).join(", "))}${new Set(cur.prs.map(p => p.n)).size > 3 ? "…" : ""}.</p>` : ""}`
    : `<p class="muted">Aucune séance enregistrée en ${esc(name.split(" ")[0])}.</p>`}</section>`;
}
function renderProgress() {
  const V = $("#v-progres");
  const real = workouts.length > 0, list = real ? workouts : demo;
  if (!list) { V.innerHTML = `<section><h1>Progrès</h1></section>${tiersCardHTML([])}${stageCardHTML([], true)}<section><div class="card"><p>Après quelques séances, tu verras aussi ta régularité, ta force estimée sur chaque exercice, tes records et tes séries par muscle.</p><div class="row" style="margin-top:10px"><button type="button" class="btn2" data-act="demo">Voir un exemple</button></div></div></section>${forceCardHTML([], true)}`; return; }
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
  ${tiersCardHTML(list)}${stageCardHTML(list, real)}${recapHTML(list)}
  <section class="stats"><div class="stat"><span>Séances ce mois</span><b>${month.length}</b></div><div class="stat"><span>Records ce mois</span><b>${month.reduce((t, w) => t + (w.prs ? w.prs.length : 0), 0)}</b></div><div class="stat"><span>Série en cours</span><b>${streak(list, target)} sem.</b></div></section>
  <section class="card"><div class="sechead"><h2>Régularité</h2><span class="muted small">séances par semaine</span></div><div class="chart" id="ch-weeks"></div>
    <details><summary>Voir les données</summary><div class="tbl" tabindex="0" role="region" aria-label="Séances par semaine"><table><thead><tr><th>Semaine</th><th class="n">Séances</th></tr></thead><tbody>${bars.map(b => `<tr><td>${esc(b.label)}</td><td class="n">${b.v}</td></tr>`).join("")}</tbody></table></div></details></section>
  ${forceCardHTML(list, real)}
  <section class="gate ${isPro() ? "" : "locked"}"><div class="body" style="display:grid;gap:22px"${isPro() ? "" : " inert"}>
    <div class="card" style="display:grid;gap:10px"><div class="sechead"><h2>Force estimée</h2><span class="muted small">1RM estimé (formule d'Epley)</span></div>
      ${exKeys.length ? `<label class="sr" for="prog-ex">Exercice</label><select id="prog-ex">${exKeys.map(k => `<option value="${esc(k)}"${k === progKey ? " selected" : ""}>${esc(counts[k].n)}</option>`).join("")}</select><div class="chart" id="ch-e1rm"></div><p class="muted small">Point jaune : record battu ce jour-là.</p>` : `<p class="muted">Fais un exercice au moins deux fois pour voir sa courbe.</p>`}</div>
    <div class="card"><div class="sechead"><h2>Séries par muscle</h2><span class="muted small">cette semaine · cible ${lo} à ${hi}</span></div>
      <div class="vol">${mkeys.map(k => `<div class="vrow"><span class="vname">${MUS[k]}</span><div class="vtrack"><div class="vband" style="left:${sc(lo)}%;width:${sc(hi) - sc(lo)}%"></div>${mv[k] > 0 ? `<div class="vfill" style="width:${sc(mv[k])}%"></div>` : ""}</div><span class="vval${mv[k] < lo ? " low" : ""}">${f1(mv[k])}${mv[k] < lo ? " ↓" : mv[k] > hi ? " ↑" : ""}</span></div>`).join("")}</div>
      <p class="muted small" style="margin-top:8px">Séries validées depuis lundi : 1 pour le muscle visé, 0,5 pour les muscles qui aident. Zone verte : ta cible hebdomadaire.</p></div>
    <div class="card"><h2>Records</h2><div class="tbl" tabindex="0" role="region" aria-label="Tableau des records"><table><thead><tr><th>Exercice</th><th class="n">Force estimée</th><th class="n">Meilleure série</th><th class="n">Date</th></tr></thead><tbody>${records.slice(0, 15).map(r => `<tr><td>${esc(r.n)}</td><td class="n">${f1(r.best.e)} kg</td><td class="n">${f1(r.best.w)} × ${r.best.r}</td><td class="n">${dateFr(r.when, { day: "numeric", month: "short" })}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="ai" id="ai-box"><div class="sechead"><h2>Analyse du coach</h2><span class="muted small">même expertise que le coach Fonte</span></div>
      <p class="muted small">Le coach lit tes 8 dernières semaines : ce qui progresse, ce qui stagne, et tes ajustements pour les deux prochaines semaines.</p>
      ${ai.consent && window.FONTE_PWA && window.FONTE_PWA.needsConsent() ? window.FONTE_PWA.consentHTML("Avant l'analyse de tes séances") : ""}
      <div class="txt" id="ai-txt">${ai.text ? md(ai.text) : ""}</div>${ai.note ? `<p class="note">${esc(ai.note)}</p>` : ""}
      <div class="row"><button type="button" class="primary" data-act="ai" id="ai-btn"${!real || ai.busy ? " disabled" : ""}>${ai.text ? "Relancer l'analyse" : "Analyser mes progrès"}</button>${ai.busy ? `<button type="button" class="btn2" data-act="ai-stop">Arrêter</button>` : ""}${!real ? `<span class="muted small">Disponible avec tes vraies séances.</span>` : ""}</div></div>
  </div>${isPro() ? "" : `<div class="gatemsg"><div><b>Courbes, records, séries par muscle et analyse du coach</b><span class="muted small">Inclus dans Premium${hasBundle() ? ` à ${PRICE.bundle} par mois avec ton programme` : ""}.</span><button type="button" class="unlock" data-act="go-offre">Voir l'offre</button></div></div>`}</section>`;
  barChart($("#ch-weeks"), bars, target);
  const sel = $("#prog-ex");
  if (sel) {
    const draw = () => { const pts = exSeries(list, progKey); if (pts.length) lineChart($("#ch-e1rm"), pts); };
    sel.addEventListener("change", () => { progKey = sel.value; draw(); });
    draw();
  }
}

/* ===== Offre ===== */
function accessHTML() {
  if (!PAY()) return "";
  const F = window.FONTE_PWA, f = F.has("fonte"), p = F.has("premium"), code = F.accessCode();
  const mail = `mailto:?subject=${encodeURIComponent("Mon code d'accès Fonte")}&body=${encodeURIComponent("Code d'accès Fonte, à coller dans l'appli (Offre > Retrouver mes achats) :\n\n" + code)}`;
  return `<section class="card acces" id="acces"><h2>Tes achats</h2>
    <ul class="achats"><li class="${f ? "ok" : ""}"><b>Programme Fonte</b><span>${f ? "Débloqué, à vie" : "Pas encore débloqué"}</span></li><li class="${p ? "ok" : ""}"><b>Premium</b><span>${p ? "Actif" : "Inactif"}</span></li></ul>
    ${code ? `<p class="muted small">Ton code d'accès te permet de retrouver tes achats sur un autre téléphone ou après une réinstallation. Garde-le en lieu sûr et ne le partage pas.</p>
    <div class="row"><button type="button" class="primary" data-act="code-copy">Copier mon code d'accès</button><a class="btn2" href="${mail}">Me l'envoyer par e-mail</a></div>` : ""}
    <details class="restore"><summary>Déjà payé sur un autre téléphone ? Retrouver mes achats</summary>
      <label for="restore-in" class="small"><b>Ton code d'accès</b></label><textarea id="restore-in" class="code" placeholder="Colle ici ton code d'accès Fonte"></textarea>
      <div class="row"><button type="button" class="btn2" data-act="restore">Retrouver mes achats</button></div></details></section>`;
}
function premiumStatusHTML(until) {
  const c = window.FONTE_PWA.cancelInfo(), d = t => dateFr(t, { day: "numeric", month: "long", year: "numeric" });
  if (c && c.fin) return `<p class="small"><b>Résiliation enregistrée</b> : Premium reste actif jusqu'au ${d(c.fin)}, sans autre prélèvement.</p><button type="button" class="btn2" data-act="portal">Gérer mon abonnement</button>`;
  return `<p class="small"><b>Actif</b>${until ? `, prochain renouvellement le ${d(until)}` : ""}.</p>
    <div class="row"><button type="button" class="btn2" data-act="portal">Gérer mon abonnement</button><button type="button" class="btn2 danger" data-act="resilier">Résilier mon abonnement</button></div>
    <p class="muted small">Gérer : changer de carte, voir tes factures. Résilier : sans frais, effet à la fin du mois payé.</p>`;
}
function portalLoginHTML() {
  const u = window.FONTE_PWA && window.FONTE_PWA.payOn() && window.FONTE_PWA.portalLogin();
  return u ? `<p class="muted small">Abonné·e sur un autre téléphone ? <a href="${esc(u)}" rel="noopener">Gère ou résilie ton abonnement par e-mail</a>.</p>` : "";
}
/* tes données : tout est sur ce téléphone ; export (portabilité), sauvegarde, effacement, accord pour le coach */
function dataHTML() {
  if (!window.FONTE_PWA) return "";
  const F = window.FONTE_PWA, c = F.consentInfo(), b = F.backupInfo ? F.backupInfo() : {};
  return `<div class="datatools">
    <p class="small"><b>Sauvegarde</b> : ${b.le ? `dernière le ${dateFr(b.le, { day: "numeric", month: "long", year: "numeric" })}` : "aucune pour l'instant"}.${persisted ? " Stockage protégé sur cet appareil : le navigateur ne l'efface pas pour faire de la place." : ""}</p>
    <p class="small"><b>Coach IA</b> : ${c ? `accord donné le ${dateFr(c.t, { day: "numeric", month: "long", year: "numeric" })}. <button type="button" class="linkbtn" data-act="accord-off">Retirer mon accord</button>` : "pas d'accord donné : le coach ne reçoit rien de toi."}</p>
    <div class="row"><button type="button" class="btn2" data-act="data-export">Télécharger toutes mes données</button><label class="btn2 filebtn">Importer une sauvegarde<input type="file" accept="application/json,.json" id="data-import" hidden></label></div>
    <div class="row"><button type="button" class="btn2 danger" data-act="data-erase">Supprimer toutes mes données de ce téléphone</button></div>
    <p class="muted small">Identifiant de cet appareil (utile si tu nous écris au sujet de tes données) : <code>${esc(F.device())}</code>. <a href="legal/confidentialite.html">Confidentialité</a></p></div>`;
}
function busyBtn(b, label) { const old = b.textContent; b.disabled = true; b.textContent = label; return () => { b.disabled = false; b.textContent = old; }; }
function openPortal(b) {
  const undo = busyBtn(b, "Ouverture…");
  window.FONTE_PWA.portal().catch(() => { undo(); toast("La gestion de l'abonnement n'a pas pu s'ouvrir. Réessaie dans un moment."); });
}
async function copyAccess() {
  const c = window.FONTE_PWA.accessCode();
  try { await navigator.clipboard.writeText(c); toast("Code d'accès copié. Range-le en lieu sûr."); }
  catch (e) { window.prompt("Copie ton code d'accès :", c); }
}
async function restoreAccess(b) {
  const v = $("#restore-in").value.trim();
  if (!v) { toast("Colle d'abord ton code d'accès."); return; }
  const undo = busyBtn(b, "Vérification…");
  try {
    const r = await window.FONTE_PWA.restore(v);
    toast(r.premium ? "Achats retrouvés : Premium est actif." : "Achat retrouvé : ton programme Fonte est débloqué.");
  } catch (e) {
    undo();
    toast(e.code === "ended" ? "Cet abonnement Premium est terminé." : e.code === "invalid_code" ? "Code non reconnu : vérifie que tu l'as copié en entier." : "Vérification impossible pour le moment (connexion). Réessaie.");
  }
}
addEventListener("fonte:config", () => { if (PAY()) render(); });
addEventListener("fonte:accord", e => { if (e.detail && e.detail.ok && ai.consent) { ai.consent = false; render(); runAnalysis(); } else render(); });
document.addEventListener("change", e => {
  if (e.target.id !== "data-import" || !e.target.files[0]) return;
  const f = e.target.files[0];
  openConfirm("Remplacer les données de ce téléphone par cette sauvegarde ?", "Importer", () => {
    window.FONTE_PWA.importAll(f).then(() => location.reload()).catch(() => { closeSheet(); toast("Ce fichier n'est pas une sauvegarde Fonte."); });
  });
  e.target.value = "";
});
addEventListener("fonte:acces", e => {
  const d = e.detail || {};
  render();
  if (d.nouveau === "premium") toast(hasBundle() ? `Bienvenue dans Premium, à ${PRICE.bundle} par mois avec ton programme !` : "Bienvenue dans Premium !");
  else if (d.annule) toast("Paiement annulé : rien n'a été débité.");
  else if (d.attente) toast("Paiement en cours de validation : Premium s'activera tout seul dès qu'il sera confirmé.");
  else if (d.erreur) toast("Paiement reçu ? On n'a pas pu le vérifier (connexion). Nouvel essai à la prochaine ouverture.");
  else if (d.premium === "termine") toast("Ton abonnement Premium est terminé.");
});
function renderOffre() {
  const V = $("#v-offre"), P = profile.program, st = from();
  const pro = isPro(), bundle = hasBundle(), pay = PAY(), until = pay && pro ? window.FONTE_PWA.premiumUntil() : 0;
  V.innerHTML = `${importBanner()}<section><h1>Ton offre</h1><p class="muted">Fonte Suivi est relié à ton programme Fonte : tes séances, tes charges et tes progrès au même endroit.</p></section>
  <section class="plans"><h2 class="sr">Les formules</h2>
    <div class="plancard"><div class="sechead"><h3>Gratuit</h3>${!pro ? '<span class="badge">Offre actuelle</span>' : ""}</div><div class="price">0 €</div>
      <ul><li>Enregistrement des séances et minuteur de repos</li><li>Import de ton programme Fonte</li><li>Historique des 30 derniers jours</li><li>Régularité semaine par semaine</li></ul>
      ${pro && !pay ? '<button type="button" class="btn2" data-act="plan-free">Revenir au gratuit</button>' : ""}</div>
    <div class="plancard ${bundle ? "best" : ""}"><div class="sechead"><h3>Premium</h3>${pro ? '<span class="badge">Offre actuelle</span>' : bundle ? '<span class="badge pr">−50 % avec ton programme</span>' : ""}</div>
      <div class="price">${bundle ? PRICE.bundle : PRICE.premium} <small>par mois</small> ${bundle ? `<span class="old">${PRICE.premium}</span>` : ""}</div>
      <ul><li>Conseil de charge à chaque exercice (double progression)</li><li>Courbes de force estimée et records</li><li>Séries par muscle comparées à ta cible</li><li>Analyse de tes progrès par le coach IA</li><li>Historique illimité</li></ul>
      ${bundle ? "" : `<p class="muted small">${PRICE.bundle} par mois si tu as débloqué ton programme dans Fonte.</p>`}
      ${pro ? (pay ? premiumStatusHTML(until) : "")
        : `<button type="button" class="unlock" data-act="plan-pro">Passer à Premium (${bundle ? PRICE.bundle : PRICE.premium} / mois)</button><p class="muted small">${pay ? "Sans engagement, résiliable à tout moment en trois clics. Paiement sécurisé avec Stripe." : window.FONTE_PWA ? "Abonnement en ligne bientôt disponible." : "Mode démo : activation sans paiement. En production, ce bouton ouvre la page d'abonnement."}</p>`}</div>
  </section>${portalLoginHTML()}${accessHTML()}
  <section class="card" style="display:grid;gap:10px"><h2>Ton programme Fonte</h2>
    ${P ? `<p><b>${esc(LABEL.goal[st.goal])}</b> · ${esc(LABEL.level[st.level])} · ${P.sessions.length} séances · ${esc(LABEL.eq[st.eq])}${st.pain && st.pain.length ? ` · ménage : ${st.pain.map(z => ZONES[z].toLowerCase()).join(", ")}` : ""}</p><p class="muted small">Importé le ${dateFr(profile.importedAt || Date.now(), { day: "numeric", month: "long", year: "numeric" })}${P.paid ? " · programme débloqué, offre −50 % active" : " · programme gratuit : débloque-le dans Fonte pour obtenir −50 % sur Premium"}.</p>` : `<p class="muted">Tu utilises le programme d'exemple. Importe le tien : dans Fonte, onglet Programme, touche « Ouvrir Fonte Suivi avec mon programme », ou copie le code et colle-le ici.</p>`}
    <label for="code-in" class="small"><b>Code de programme Fonte</b></label><textarea id="code-in" class="code" placeholder="Colle ici le code copié dans Fonte (il commence par F1)"></textarea>
    <div class="row"><button type="button" class="primary" data-act="import-code">Importer</button><a href="${FONTE_URL}"${window.FONTE_PWA ? "" : ' target="_blank" rel="noopener"'}>Ouvrir Fonte</a></div></section>
  <section class="card" style="display:grid;gap:10px"><h2>Tes données</h2><p class="muted small">${storeMode === "db" ? "Tes séances sont enregistrées sur ton compte et synchronisées entre tes appareils. Elles ne sont visibles que par toi." : "Tes séances sont enregistrées sur cet appareil."} ${workouts.length} séance${workouts.length > 1 ? "s" : ""} enregistrée${workouts.length > 1 ? "s" : ""}.</p>
    <div class="row"><button type="button" class="btn2" data-act="csv" id="csv-btn"${runtimeDone && !downloads ? " hidden" : ""}>Exporter mes séances (CSV)</button><button type="button" class="btn2" data-act="wipe">Effacer mes séances</button></div>
    <div class="row"><label class="btn2 filebtn">Importer depuis Strong ou Hevy<input type="file" accept=".csv,text/csv" id="import-csv" hidden></label><span class="muted small">Ton historique te suit : exporte-le en CSV depuis l'autre appli.</span></div>${dataHTML()}</section>`;
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
  const pp = ptsNow(workouts), ss = stageNow(workouts);
  L.push(`Progression dans l'appli : palier ${pp.tier.n} (${f0(pp.total)} points) ; stade ${ss.n} ${ss.info.name}, semaine ${ss.week} sur ${PG.WEEKS} (${ss.done}/${ss.need} séances)${ss.deload ? ", semaine de décharge en cours" : ""}${ss.cycle > 1 ? `, cycle ${ss.cycle}` : ""}.`);
  const ff = PG.force(workouts, profile.body, st.eq).filter(f => f.best);
  if (ff.length) L.push("Repères de force : " + ff.map(f => `${f.n} ${f.level ? PG.LEVELS[f.level].toLowerCase() : "en route"} (${f.t === "ratio" ? `${f1(f.best)} kg estimés` : f.t === "reps" ? `${f0(f.best)} répétitions` : `${f0(f.best)} s`})`).join(" ; ") + ".");
  const notes = workouts.flatMap(w => w.ex.filter(x => x.note).map(x => `${dateFr(w.startedAt, { day: "numeric", month: "short" })}, ${x.n} : ${x.note}`)).slice(0, 6);
  if (notes.length) L.push("Notes récentes : " + notes.join(" | "));
  return L.join("\n");
}
async function runAnalysis() {
  if (ai.busy) return;
  if (window.FONTE_PWA && window.FONTE_PWA.needsConsent() && sample) { ai.consent = true; renderProgress(); return; }
  if (!sample) { ai.note = window.FONTE_PWA ? "L'analyse du coach arrive bientôt dans l'appli." : "L'analyse du coach n'est pas disponible dans cette vue (connexion à Claude nécessaire)."; renderProgress(); return; }
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
    ai.note = { cancelled: "Analyse arrêtée.", not_granted: "Tu n'as pas autorisé la page à utiliser Claude pour cette visite.", sampling_disabled: "Claude n'est pas disponible pour ce compte.", rate_limited: "Trop de demandes ou limite d'utilisation atteinte : réessaie plus tard.", session_expired: "Ta session Claude a expiré : reconnecte-toi puis relance.", refused: "Le coach n'a pas pu produire cette analyse.", prompt_too_large: "Trop de données à analyser d'un coup.", premium_required: "L'analyse du coach fait partie de Premium.", daily_limit: "Tu as lancé beaucoup d'analyses aujourd'hui : réessaie demain.", overloaded: "Le coach est très demandé en ce moment : réessaie dans un instant.", coach_off: "L'analyse du coach n'est pas disponible pour le moment.", empty_completion: "Pas d'analyse cette fois : relance-la." }[code] || "Analyse interrompue (problème de connexion). Réessaie.";
    if (window.FONTE_PWA && code === "rate_limited") ai.note = "Trop de demandes d'un coup : réessaie dans un moment.";
    if (code === "premium_required" && PAY()) window.FONTE_PWA.refresh(true);
    if (code === "consent_required") { ai.note = ""; ai.consent = true; }
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
    const sx = e.target.closest("#body-form [data-sex]");
    if (sx) { sx.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === sx ? "true" : "false")); return; }
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
    case "cues": {
      const c = $("#cues-" + i), host = c.querySelector(".anim-host");
      c.hidden = !c.hidden;
      document.querySelectorAll(`[data-act="cues"][data-i="${i}"]`).forEach(x => x.setAttribute("aria-expanded", c.hidden ? "false" : "true"));
      if (host) c.hidden ? DEMO.unmount(host) : DEMO.mount(host, host.dataset.ex, host.dataset.name);
      if (!c.hidden) c.scrollIntoView({ block: "nearest", behavior: "smooth" });
      break;
    }
    case "note-reuse": { const x = active.ex[i], ln = lastNote(keyOf(x), active.startedAt); if (ln) { x.note = ln.note; x.showNote = true; saveActive(); rerenderCard(i); } break; }
    case "note": { const x = active.ex[i]; x.showNote = true; rerenderCard(i); const t = document.querySelector(`.note-in[data-i="${i}"]`); if (t) t.focus(); break; }
    case "replace": openLibrary("replace", i); break;
    case "up": case "down": { const j = act === "up" ? i - 1 : i + 1; const a = active.ex; [a[i], a[j]] = [a[j], a[i]]; delete a[i].ss; delete a[j].ss; normalizeSS(); saveActive(); renderSeance(true); break; }
    case "ss-link": { toggleSS(i); saveActive(); renderSeance(true); const inf = ssInfo(i); toast(inf ? `Superset ${inf.letter} : enchaîne ces exercices, repos après le dernier.` : "Exercices déliés."); break; }
    case "remove-ex": { const x = active.ex[i]; const doIt = () => { active.ex.splice(i, 1); normalizeSS(); saveActive(); closeSheet(); renderSeance(true); }; if (x.sets.some(s => s.done)) openConfirm(`Retirer « ${x.n} » et ses séries validées ?`, "Retirer", doIt); else doIt(); break; }
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
    case "go-progres": setView("progres"); window.scrollTo(0, 0); break;
    case "recap-prev": recapOffset++; renderProgress(); break;
    case "recap-next": recapOffset = Math.max(0, recapOffset - 1); renderProgress(); break;
    case "stage-next": nextStage(); break;
    case "open-w": detailId = b.dataset.id; renderHistory(); window.scrollTo(0, 0); break;
    case "back": detailId = null; renderHistory(); break;
    case "redo": { const w = workouts.find(x => x.id === b.dataset.id); if (w) startFrom(w); break; }
    case "delete-w": openConfirm("Supprimer définitivement cette séance ?", "Supprimer", () => { removeWorkout(b.dataset.id); detailId = null; closeSheet(); renderHistory(); toast("Séance supprimée."); }); break;
    case "demo": demo = makeDemo(); render(); break;
    case "demo-off": demo = null; detailId = null; render(); break;
    case "ai": runAnalysis(); break;
    case "ai-stop": if (ai.ctl) ai.ctl.abort(); break;
    case "plan-pro": if (PAY()) { window.FONTE_PWA.checkout("premium"); break; } if (window.FONTE_PWA) { toast("L'abonnement en ligne arrive bientôt."); break; } profile.plan = "premium"; saveProfile(); render(); toast(profile.bundle ? `Premium activé à ${PRICE.bundle} par mois (démo).` : "Premium activé (démo)."); break;
    case "plan-free": if (PAY()) { openPortal(b); break; } profile.plan = "free"; saveProfile(); render(); break;
    case "portal": openPortal(b); break;
    case "bar": profile.bar = barKg() === 20 ? 15 : barKg() === 15 ? 10 : 20; saveProfile(); if (active) active.ex.forEach((x, k) => refreshAids(k)); toast(`Barre de ${barKg()} kg.`); break;
    case "resilier": window.FONTE_PWA.cancelFlow(); break;
    case "data-export": case "backup-now": exportBackup(); break;
    case "backup-later": window.FONTE_PWA.backupLater(14); render(); break;
    case "data-erase": openConfirm("Supprimer toutes tes données de ce téléphone : programme, séances, conversations, accord et achats ? Copie d'abord ton code d'accès si tu as acheté quelque chose. C'est définitif.", "Tout supprimer", () => { window.FONTE_PWA.eraseAll(); location.reload(); }); break;
    case "accord-off": window.FONTE_PWA.withdrawConsent(); toast("Accord retiré : le coach ne recevra plus rien de toi."); break;
    case "code-copy": copyAccess(); break;
    case "restore": restoreAccess(b); break;
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
    if (t.dataset.f === "w") refreshAids(+row.dataset.i);
  } else if (t.matches(".note-in")) { const x = active && active.ex[+t.dataset.i]; if (x) { x.note = t.value.slice(0, 500); saveActive(); } }
});
document.addEventListener("submit", e => { if (e.target.id === "body-form") { e.preventDefault(); saveBody(); } });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pullFonte(); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("#sheet").hidden) closeSheet();
  if (e.key === "Tab" && !$("#sheet").hidden) trapTab(e, $("#sheet-box"));
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
  else { const hv = { "#progres": "progres", "#historique": "historique", "#offre": "offre", "#seance": "seance" }[location.hash]; if (hv) view = hv; }
  setView(view);
  initStore();
  initRuntime();
  if (window.FONTE_PWA && window.FONTE_PWA.persisted) window.FONTE_PWA.persisted().then(v => { persisted = v; if (view === "offre") renderOffre(); });
}
if (hot && typeof hot.ready === "function") hot.ready(boot); else boot(hot ? hot.data : null);
