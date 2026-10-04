/* ===== Utilitaires ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const clone = o => JSON.parse(JSON.stringify(o));
const n0 = x => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(x));
const n1 = x => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(x);
const clampNum = (v, lo, hi) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
const clampInt = (v, lo, hi) => { const n = clampNum(v, lo, hi); return n == null ? null : Math.round(n); };
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const PLATES = ["var(--red)", "var(--blue)", "var(--yellow)", "var(--green)"];
const REG = { omni: "Omnivore", vege: "Végétarien", vegan: "Végan" };
const LV = { deb: 0, inter: 1, conf: 2 };
const FREE_Q = 3;
const SUIVI_URL = "https://claude.ai/artifact/9evmjcLc5J4Seh4DZtXq5f";
const SUIVI_PRICE = { premium: "4,99 €", bundle: "2,49 €" };
const KEY = "fonte.v2";
const SYN = { lombaires: "dos", lombaire: "dos", "bas du dos": "dos", dos: "dos", genou: "genoux", genoux: "genoux", epaule: "epaules", epaules: "epaules", poignet: "poignets", poignets: "poignets", coude: "coudes", coudes: "coudes", hanche: "hanches", hanches: "hanches" };

/* ===== État ===== */
let state = { goal: "muscle", level: "deb", days: "3", time: "4", eq: "gym", pain: [], stage: 1, cycle: 1 };
let plan = null;
let unlocked = false;
let nutri = { sexe: "h", age: 30, taille: 178, poids: 75, act: "leger", reg: "omni", example: true };
let chat = [];
let freeUsed = 0;
let edits = [];
let tab = "prog";
let undoStack = [];
/* appli installée avec paiement en ligne : l'accès vient du jeton d'achat rangé sur l'appareil, plus d'un simple clic */
const PAY = () => !!(window.FONTE_PWA && window.FONTE_PWA.payOn && window.FONTE_PWA.payOn());
const needConsent = () => !!(window.FONTE_PWA && window.FONTE_PWA.needsConsent && window.FONTE_PWA.needsConsent());
const payNote = demo => (PAY() ? `<p class="demo">Paiement unique et sécurisé avec Stripe. <a href="carnet.html#offre">Déjà payé ? Retrouver mon achat</a></p>`
  : window.FONTE_PWA ? `<p class="demo">Paiement en ligne bientôt disponible.</p>` : `<p class="demo">${demo}</p>`);

const prof = () => (plan ? plan.from : state);
function snapshot() { return { v: 2, state, plan, unlocked, nutri, chat: chat.filter(m => !m.pending).slice(-40), freeUsed, edits: edits.slice(-30), tab }; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(snapshot())); if (plan && window.FONTE_PWA) localStorage.setItem("fonte.code", exportCode()); } catch (e) { /* stockage indisponible */ } }
function loadSaved() { try { const d = JSON.parse(localStorage.getItem(KEY) || "null"); return d && d.v === 2 ? d : null; } catch (e) { return null; } }

/* ===== Moteur de programme ===== */
function okFor(e, st) { return e.eq.includes(st.eq) && !e.av.some(a => st.pain.includes(a)) && (e.lv || 0) <= LV[st.level]; }
function candidates(p, st) {
  const isDb = e => e.db === 1 || (Array.isArray(e.db) && e.db.includes(st.eq));
  const score = e => (st.goal === "force" && e.fx ? 2 : 0) + (st.level === "deb" && isDb(e) ? 1 : 0);
  return EX.map((e, i) => ({ e, i })).filter(o => o.e.p === p && okFor(o.e, st))
    .sort((a, b) => score(b.e) - score(a.e) || a.i - b.i).map(o => o.e);
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
function exCount(st) { let n = +st.time; if ((st.goal === "seche" || st.goal === "forme") && n >= 4) n++; return n; }
function roleOf(e, pos) { if (e.p === "core") return "gainage"; if (e.k === "i" || e.k === "t") return "isolation"; return pos <= 1 ? "principal" : "secondaire"; }
function doseFor(e, role, st) {
  if (role === "gainage") return { sets: st.level === "deb" ? 2 : 3, reps: e.rr || "30 à 45 s", rest: "45 à 60 s", rir: "—" };
  const D = DOSE[st.goal][role];
  let sets = D.s, rir = D.rir;
  if (st.level === "deb") { if (role !== "principal") sets = Math.max(2, sets - 1); else if (st.goal === "force") sets = 3; rir = role === "isolation" ? "1 à 2" : "2 à 3"; }
  if (st.level === "conf") { if (role === "principal") sets += 1; if (role === "isolation") rir = "0 à 1"; }
  return { sets, reps: e.rr || D.r, rest: D.rest, rir };
}
const stageN = st => Math.min(3, Math.max(1, +(st && st.stage) || 1));
function mkEx(e, role, st) {
  const x = { id: e.id, n: e.n, role, ...doseFor(e, role, st) }, n = stageN(st);
  return n > 1 ? { ...x, b: { sets: x.sets, reps: x.reps, rest: x.rest, rir: x.rir }, ...PROGRESSION.doseAt(x, role, n, st.goal) } : x;
}
/* à chaque nouveau cycle, les exercices accessoires changent (les deux principaux restent, pour suivre les progrès) */
const rotOf = st => Math.max(0, (+st.cycle || 1) - 1);
function buildPlan(st) {
  const n = exCount(st), rot = rotOf(st);
  const sessions = SPLIT[st.days].map((key, d) => {
    const tpl = T[key], used = new Set(), ex = [];
    for (const slot of tpl.s) {
      if (ex.length >= n) break;
      const e = pickSlot(slot, used, st, ex.length >= 2 ? rot : 0);
      if (!e) continue;
      used.add(e.id);
      ex.push(mkEx(e, roleOf(e, ex.length), st));
    }
    return { key, name: tpl.n, t: tpl.t, day: DAYS[st.days][d], ex };
  });
  return { sessions, from: clone(st) };
}
function doseTxt(x) { const e = EXI[x.id]; return `${x.sets} × ${x.reps}${e && e.u ? " / côté" : ""}`; }
function warmup(s) {
  const st = prof();
  const general = st.eq === "gym" ? "4 min de vélo, rameur ou marche inclinée" : "3 min de marche rapide sur place, jumping jacks ou montées de genoux";
  const drills = [...WU[s.t]];
  st.pain.forEach(z => { if (WU.zone[z]) drills.push(WU.zone[z]); });
  const first = s.ex.find(x => x.role === "principal");
  let ramp = "";
  if (first) {
    const e = EXI[first.id], name = first.n.charAt(0).toLowerCase() + first.n.slice(1);
    ramp = e && e.rr ? `1 série facile de ${name} à mi-amplitude` : `Séries d'approche sur ${name} : 50 % × 8, 70 % × 5, 85 % × 3${st.goal === "force" ? ", 90 % × 1" : ""} de ta charge de travail`;
  }
  return { general, drills: drills.slice(0, 4), ramp };
}
function volume() {
  const v = Object.fromEntries(Object.keys(MUS).map(k => [k, 0]));
  for (const s of plan.sessions) for (const x of s.ex) {
    const e = EXI[x.id];
    (e ? e.m : (x.m || [])).forEach(k => { if (k in v) v[k] += x.sets; });
    (e ? (e.s || []) : []).forEach(k => { if (k in v) v[k] += x.sets * 0.5; });
  }
  return v;
}
function band(st) { if (st.goal === "forme") return [4, 10]; if (st.goal === "force") return [6, 15]; return st.level === "deb" ? [6, 12] : [10, 20]; }
function musclesFrom(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  list.forEach(l => { const q = norm(l); const k = Object.keys(MUS).find(m => norm(MUS[m]).includes(q) || q.includes(norm(MUS[m])) || q === m); if (k && !out.includes(k)) out.push(k); });
  return out;
}

/* ===== Lien avec Fonte Suivi ===== */
function exportCode() {
  const st = prof();
  const k = stageN(st);
  const o = { v: 1, p: unlocked ? 1 : 0, g: st.goal, l: st.level, d: +st.days, t: +st.time, q: st.eq, z: st.pain, k,
    s: plan.sessions.map(s => [s.name, s.day, s.ex.map(x => {
      const a = x.id ? [x.id, x.sets, x.reps, x.rest, x.rir] : [null, x.sets, x.reps, x.rest, x.rir, x.n];
      if (x.b && k > 1) { while (a.length < 6) a.push(null); a.push(x.b.sets, x.b.reps, x.b.rest, x.b.rir); }
      if (x.fixed) { while (a.length < 10) a.push(null); a.push(1); }
      return a;
    })]) };
  const bytes = new TextEncoder().encode(JSON.stringify(o));
  let bin = "";
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return "F1" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function suiviHTML() {
  const pwa = window.FONTE_PWA, link = pwa ? pwa.suiviUrl : `${SUIVI_URL}#fonte-${exportCode()}`;
  return `<section class="card suivi"><div class="sechead"><h3>${pwa ? "Ton carnet de séances" : "Suis tes séances avec Fonte Suivi"}</h3>${unlocked ? `<span class="badge">−50 % inclus</span>` : ""}</div>
    <p class="muted small">Ton carnet d'entraînement relié à ce programme : charges et répétitions série par série, minuteur de repos, conseil de charge à chaque exercice, courbes de progrès et analyse du coach. ${unlocked ? `Avec ton programme débloqué, Fonte Suivi Premium passe à <b>${SUIVI_PRICE.bundle} par mois</b> au lieu de ${SUIVI_PRICE.premium}.` : `Débloque ton programme pour obtenir <b>−50 %</b> sur Fonte Suivi Premium (${SUIVI_PRICE.bundle} par mois au lieu de ${SUIVI_PRICE.premium}).`}</p>
    <div class="acts">${pwa ? `<a class="primary" href="${esc(link)}">Ouvrir mon carnet de séances</a>` : `<a class="primary" href="${esc(link)}" target="_blank" rel="noopener">Ouvrir Fonte Suivi avec mon programme</a><button type="button" class="btn2" data-act="copycode">Copier le code</button>`}</div>
    <div id="code-box" hidden><label class="small" for="code-out"><b>Ton code de programme</b> · colle-le dans Fonte Suivi, onglet Offre</label><textarea id="code-out" class="code" readonly></textarea></div></section>`;
}
async function copyCode() {
  const c = exportCode(), box = $("#code-box"), out = $("#code-out");
  out.value = c;
  try { await navigator.clipboard.writeText(c); toast("Code copié : colle-le dans Fonte Suivi, onglet Offre."); }
  catch (e) { box.hidden = false; out.focus(); out.select(); toast("Sélectionne le code ci-dessous et copie-le."); }
}

/* ===== Questionnaire ===== */
function syncChips() {
  document.querySelectorAll("#f fieldset").forEach(fs => {
    const k = fs.dataset.k, multi = fs.hasAttribute("data-multi");
    fs.querySelectorAll("button[data-v]").forEach(b => {
      const on = multi ? state.pain.includes(b.dataset.v) : String(state[k]) === b.dataset.v;
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  });
  $("#go").textContent = plan ? "Mettre à jour mon programme" : "Créer mon programme";
}
document.querySelectorAll("#f fieldset").forEach(fs => {
  const k = fs.dataset.k, multi = fs.hasAttribute("data-multi");
  fs.addEventListener("click", ev => {
    const b = ev.target.closest("button[data-v]");
    if (!b) return;
    if (multi) { const v = b.dataset.v; state.pain = state.pain.includes(v) ? state.pain.filter(x => x !== v) : [...state.pain, v]; }
    else state[k] = b.dataset.v;
    syncChips();
  });
});
$("#f").addEventListener("submit", ev => { ev.preventDefault(); createProgram(); });

function createProgram() {
  const hadEdits = plan && edits.length;
  const u = plan ? pushUndo() : null;
  plan = buildPlan(clone(state));
  edits = [];
  renderAll();
  const r = $("#result");
  r.hidden = false;
  selectTab("prog");
  r.classList.remove("show"); void r.offsetWidth; r.classList.add("show");
  r.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth" });
  save();
  if (hadEdits) toast("Programme recréé : les modifications précédentes sont remplacées.", u);
}

/* ===== Annuler / toast ===== */
function pushUndo() { undoStack.push({ plan: clone(plan), state: clone(state), nutri: clone(nutri), edits: edits.slice() }); return undoStack.length - 1; }
function undoTo(idx) {
  const snap = undoStack[idx];
  if (!snap) return;
  plan = snap.plan; state = snap.state; nutri = snap.nutri; edits = snap.edits;
  undoStack = undoStack.slice(0, idx);
  chat.forEach(m => (m.actions || []).forEach(a => { if (a.u >= idx) a.undone = true; }));
  syncChips(); renderAll(); save();
}
let toastTimer = null;
function toast(msg, undoIdx) {
  const t = $("#toast"), b = $("#toast-undo");
  $("#toast-txt").textContent = msg;
  b.hidden = undoIdx == null;
  b.onclick = () => { undoTo(undoIdx); t.hidden = true; };
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 6500);
}

/* ===== Onglets ===== */
const TABS = ["prog", "coach", "nutri", "mob"];
function selectTab(name, focus) {
  tab = name;
  TABS.forEach(t => {
    const b = $("#tab-" + t), p = $("#panel-" + t), on = t === name;
    b.setAttribute("aria-selected", on ? "true" : "false");
    b.tabIndex = on ? 0 : -1;
    p.hidden = !on;
  });
  if (focus) $("#tab-" + name).focus();
  const top = $("#panel-" + name).getBoundingClientRect().top;
  if (top < 0) window.scrollBy(0, top - 80);
  if (name === "coach") renderSugg();
  save();
}
$(".tabs").addEventListener("click", e => { const b = e.target.closest("[role=tab]"); if (b) selectTab(b.id.slice(4)); });
$(".tabs").addEventListener("keydown", e => {
  const keys = { ArrowRight: 1, ArrowLeft: -1 };
  if (!(e.key in keys) && e.key !== "Home" && e.key !== "End") return;
  const i = TABS.indexOf(tab);
  const j = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (i + keys[e.key] + TABS.length) % TABS.length;
  selectTab(TABS[j], true);
  e.preventDefault();
});

/* ===== Rendu : résumé et programme ===== */
function renderSummary() {
  const st = prof();
  const parts = [`<span><b>${LABEL.goal[st.goal]}</b></span>`, `<span>${LABEL.level[st.level]}</span>`, `<span>${st.days} séances (${DAYS[st.days].join(" · ")})</span>`, `<span>${LABEL.time[st.time]}</span>`, `<span>${LABEL.eq[st.eq]}</span>`];
  if (st.pain.length) parts.push(`<span>Ménage : ${st.pain.map(z => ZONES[z].toLowerCase()).join(", ")}</span>`);
  parts.push(`<span>Stade ${stageN(st)} · ${PROGRESSION.STAGES[stageN(st) - 1].name}${(+st.cycle || 1) > 1 ? ` · cycle ${st.cycle}` : ""}</span>`);
  parts.push(`<button type="button" class="linkbtn" data-act="edit">Modifier mes réponses</button>`);
  $("#summary").innerHTML = parts.join("");
}
function gateMsg(label) {
  return `<div class="gatemsg"><div><b>${esc(label)}</b><span class="muted small">Inclus dans la version complète, avec le coach illimité.</span><button type="button" class="unlock" data-act="unlock">Débloquer pour 19 €</button></div></div>`;
}
function paywallHTML() {
  return `<div class="paywall"><h3>Débloque tes ${plan.sessions.length} séances et ton coach</h3>
    <ul><li>Programme complet et progression sur 4 semaines</li><li>Plan nutrition : macros, sources de protéines, compléments utiles</li><li>Routine mobilité zones sensibles et plan de récupération</li><li>Coach expert illimité qui adapte ton programme</li><li>Export PDF</li><li>−50 % sur Fonte Suivi Premium, ton carnet d'entraînement</li></ul>
    <button class="unlock" type="button" data-act="unlock">Débloquer pour 19 €</button>
    ${payNote("Mode démo : ce bouton débloque tout sans paiement. En production, il ouvre la page de paiement.")}</div>`;
}
function exHTML(x, i, j, locked) {
  const e = EXI[x.id], id = `exd-${i}-${j}`;
  const meta = [x.rest ? `Repos ${x.rest}` : "", x.rir && x.rir !== "—" ? `RIR ${x.rir}` : ""].filter(Boolean).join(" · ");
  const info = e
    ? `<p><b>Muscles :</b> ${e.m.map(k => MUS[k]).join(", ")}${e.s && e.s.length ? ` · aidés : ${e.s.map(k => MUS[k].toLowerCase()).join(", ")}` : ""}</p><p>${esc(e.c)}</p><p class="err"><b>Erreur fréquente :</b> ${esc(e.e)}</p>`
    : `<p>${esc(x.c || "Exercice ajouté par ton coach.")}</p>`;
  const demo = typeof DEMO !== "undefined" && DEMO.has(x.id);
  return `<li class="ex${demo ? " hasdemo" : ""}"><div class="exrow">${demo ? `<span class="thumb" aria-hidden="true">${DEMO.thumb(x.id)}</span>` : ""}<span class="exn">${esc(x.n)}${x.custom ? '<span class="tag">Coach</span>' : ""}</span><span class="dose">${esc(doseTxt(x))}</span>${meta ? `<span class="exmeta">${esc(meta)}</span>` : ""}</div>
    <button type="button" class="more" aria-expanded="false" aria-controls="${id}" data-act="more"${locked ? ' tabindex="-1"' : ""}>${demo ? "Démo animée et consignes" : "Consignes et options"}</button>
    <div class="exd" id="${id}" hidden>${demo ? `<div class="anim-host" data-ex="${x.id}" data-name="${esc(x.n)}"></div>` : ""}${info}<div class="acts"><button type="button" class="btn2" data-act="swap" data-s="${i}" data-i="${j}">Remplacer</button><button type="button" class="btn2" data-act="askex" data-s="${i}" data-i="${j}">Demander au coach</button></div></div></li>`;
}
function sessionHTML(s, i) {
  const locked = i > 0 && !unlocked, w = warmup(s), st = prof();
  const hasCore = s.ex.some(x => EXI[x.id] && EXI[x.id].p === "core");
  const fin = [];
  if (!hasCore) fin.push("gainage planche 2 × 30 s et gainage latéral 2 × 20 s par côté (3 min, facultatif)");
  if (st.goal === "seche" || st.goal === "forme") fin.push("10 min de vélo, rameur ou marche rapide en pente");
  const finisher = fin.length ? `<p class="muted small" style="padding-block:4px 10px">Pour finir : ${fin.join(", puis ")}.</p>` : "";
  return `<article class="day ${locked ? "locked" : ""}" style="--plate:${PLATES[i % 4]}">
    <div class="dayhead"><span class="plate" aria-hidden="true"></span><div><h3>Séance ${i + 1} · ${esc(s.name)}</h3><p>${DAYFULL[s.day]} · ${s.ex.length} exercices · ${LABEL.time[st.time]}</p></div></div>
    <div class="body"${locked ? " inert" : ""}>
      <div class="wu"><b>Échauffement · 6 à 8 min</b><ul><li>${esc(w.general)}</li><li>${w.drills.map(esc).join(" · ")}</li>${w.ramp ? `<li>${esc(w.ramp)}</li>` : ""}</ul></div>
      <ol class="exs">${s.ex.map((x, j) => exHTML(x, i, j, locked)).join("")}</ol>${finisher}
    </div></article>`;
}
function volumeHTML() {
  const st = prof(), v = volume(), [lo, hi] = band(st);
  const keys = Object.keys(MUS).filter(k => k !== "abdos");
  const max = Math.max(hi + 5, ...keys.map(k => v[k]));
  const sc = x => (x / max) * 100;
  const ticks = [0, 5, 10, 15, 20, 25, 30, 35, 40].filter(t => t <= max);
  const below = keys.filter(k => v[k] < lo);
  const rows = keys.map(k => {
    const mark = v[k] < lo ? " ↓" : v[k] > hi ? " ↑" : "";
    return `<div class="vrow" tabindex="0" data-k="${k}" data-v="${v[k]}"><span class="vname">${MUS[k]}</span><div class="vtrack"><div class="vband" style="left:${sc(lo)}%;width:${sc(hi) - sc(lo)}%"></div>${v[k] > 0 ? `<div class="vfill" style="width:${sc(v[k])}%"></div>` : ""}</div><span class="vval${v[k] < lo ? " low" : ""}">${n1(v[k])}${mark}</span></div>`;
  }).join("");
  return `<section><div class="sechead"><h3>Ton volume par muscle</h3><span class="muted small">séries par semaine</span></div>
    <div class="vol" id="vol">${rows}<div class="vaxis" aria-hidden="true"><span></span><div>${ticks.map(t => `<span style="left:${sc(t)}%">${t}</span>`).join("")}</div><span></span></div><div class="tip" hidden></div></div>
    <p class="muted small">Une série compte 1 pour le muscle visé et 0,5 pour les muscles qui aident (méthode des séries fractionnelles). Zone verte : ta cible, ${lo} à ${hi} séries pour ton objectif et ton niveau. ↓ sous la cible, ↑ au-dessus. ${v.abdos ? `Gainage : ${n1(v.abdos)} séries par semaine.` : "Gainage : travaillé par les exercices de base et le finisher facultatif de fin de séance."}</p>
    ${below.length ? `<div class="coachcta"><p><b>${below.length} muscle${below.length > 1 ? "s" : ""} sous la cible</b><br><span class="muted small">${below.map(k => MUS[k]).join(", ")}. Ils progressent quand même grâce au travail indirect. Pour combler, ton coach peut ajouter 2 à 3 séries d'isolation au bon endroit.</span></p><button type="button" class="primary" data-act="combler">Combler avec le coach</button></div>` : ""}</section>`;
}
function stagesHTML(st) {
  const n = stageN(st);
  return `<div class="stages" role="group" aria-label="Stade du programme">${PROGRESSION.STAGES.map(x => `<button type="button" class="stg" data-act="stage" data-n="${x.n}" aria-pressed="${x.n === n}"><b>Stade ${x.n} · ${x.name}</b><span>${esc(x.focus)}</span></button>`).join("")}</div>
    <p class="muted small" style="margin:8px 0 12px">Chaque stade dure 8 semaines : deux blocs de 4 semaines, chacun terminé par une semaine de décharge. Fonte Suivi te fait passer au stade suivant quand tes séances sont faites, puis propose un nouveau cycle de niveau supérieur après le stade 3. Tu peux aussi choisir ton stade ici : les exercices restent, le dosage change.</p>`;
}
function setStage(n, quiet) {
  if (!plan || n === stageN(plan.from)) return;
  const u = quiet ? null : pushUndo();
  state.stage = n; plan.from.stage = n;
  plan.sessions = PROGRESSION.applyStage(plan.sessions, n, plan.from.goal);
  edits.push(`Stade ${n} · ${PROGRESSION.STAGES[n - 1].name}`);
  afterChange();
  toast(quiet ? `Ton carnet t'a fait passer au stade ${n} · ${PROGRESSION.STAGES[n - 1].name}.` : `Stade ${n} · ${PROGRESSION.STAGES[n - 1].name} : dosage mis à jour.`, u);
}
/* même appli installée : le carnet partage son stade et son cycle */
function pullSuivi() {
  if (!window.FONTE_PWA) return;
  let d = null;
  try { d = JSON.parse(localStorage.getItem("fonte.shared") || "null"); } catch (e) { d = null; }
  if (!d || !d.stage || !plan) return;
  const cyc = +d.stage.cycle || 1, n = Math.min(3, Math.max(1, +d.stage.n || 1));
  if (d.from && cyc > (+plan.from.cycle || 1) && LABEL.level[d.from.level]) {
    const u = pushUndo();
    state = { ...state, level: d.from.level, stage: 1, cycle: cyc };
    plan = buildPlan(clone(state));
    edits = [];
    renderAll(); save();
    toast(`Cycle ${cyc} : nouveau programme de niveau ${LABEL.level[state.level].toLowerCase()}, exercices accessoires renouvelés.`, u);
    return;
  }
  if (n !== stageN(plan.from)) setStage(n, true);
}
function renderProgram() {
  const P = $("#panel-prog"), st = prof(), s = plan.sessions;
  const wk = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => {
    const i = s.findIndex(x => x.day === d);
    return i >= 0 ? `<div class="wd on" style="--plate:${PLATES[i % 4]}"><i></i><b>${d}</b><span>S${i + 1}</span></div>` : `<div class="wd rest"><i></i><b>${d}</b><span>Récup</span></div>`;
  }).join("");
  const W = st.goal === "force" && st.level === "deb" ? PROG_DEB_FORCE : PROG[st.goal];
  P.innerHTML = `
  <section><div class="sechead"><h3>Ta semaine</h3><span class="muted small">${SPLITNAME[st.days]} · ${LABEL.time[st.time]} par séance</span></div><div class="week">${wk}</div></section>
  <section><div class="sechead"><h3>Tes séances</h3><span class="muted small">RIR : répétitions gardées en réserve en fin de série</span></div>
    ${sessionHTML(s[0], 0)}${unlocked ? "" : paywallHTML()}${s.slice(1).map((x, i) => sessionHTML(x, i + 1)).join("")}</section>
  <section class="coachcta"><p><b>L'analyse de ton coach</b><br><span class="muted small">Diagnostic, 3 priorités, points techniques, nutrition et récupération adaptés à ton profil.</span></p><button type="button" class="primary" data-act="analyse">Lancer l'analyse</button></section>
  ${volumeHTML()}
  <section><div class="sechead"><h3>Tes 3 stades et ta progression</h3><span class="muted small">8 semaines par stade</span></div>
    <div class="gate ${unlocked ? "" : "locked"}"><div class="body"${unlocked ? "" : " inert"}>${stagesHTML(st)}<div class="weeks">${W.map((w, i) => `<div class="wk"><b>Semaine ${i + 1} · ${w[0]}</b><span>${w[1]}</span></div>`).join("")}</div>
      <div class="card" style="margin-top:12px"><b>Règle de charge.</b> Double progression : quand tu atteins le haut de la fourchette sur toutes les séries avec une technique propre, ajoute 2,5 à 5 % (≈ 1 à 2,5 kg haut du corps, 2,5 à 5 kg bas du corps). Au poids du corps : plus de répétitions, descente en 3 secondes, puis variante plus dure.</div>
      <div class="card" style="margin-top:12px"><b>Cardio et activité.</b> ${CARDIO[st.goal]}</div></div>${unlocked ? "" : gateMsg("Progression, règle de charge et cardio")}</div></section>
  <section class="coachcta" id="pdf-sec"${downloads === null && runtimeDone ? " hidden" : ""}><p><b>Ton programme en PDF</b><br><span class="muted small">Séances, consignes, progression, nutrition et mobilité, à garder sur ton téléphone.</span></p><button type="button" class="primary" id="pdf-btn" data-act="pdf">${unlocked ? "Télécharger le PDF" : "Débloquer pour télécharger"}</button></section>
  <section class="coachcta agenda" id="ics-sec"${downloads === null && runtimeDone ? " hidden" : ""}><p><b>Tes séances dans ton agenda</b><br><span class="muted small">Chaque semaine, à tes jours d'entraînement, avec un rappel 30 minutes avant.</span></p>
    <div class="icsrow"><label for="ics-h" class="small">Heure</label><select id="ics-h">${[6, 7, 8, 9, 12, 13, 17, 18, 19, 20, 21].map(h => `<option value="${h}"${h === 18 ? " selected" : ""}>${h} h</option>`).join("")}</select><button type="button" class="btn2" data-act="ics">Ajouter à mon agenda</button></div></section>
  ${suiviHTML()}`;
  wireVolume();
}
function wireVolume() {
  const vol = $("#vol");
  if (!vol) return;
  const tip = vol.querySelector(".tip"), st = prof(), [lo, hi] = band(st);
  const show = row => {
    const v = +row.dataset.v, k = row.dataset.k;
    const status = v < lo ? "sous la cible" : v > hi ? "au-dessus de la cible" : "dans la cible";
    tip.innerHTML = `<b>${n1(v)} séries</b> par semaine<br>${MUS[k]} · ${status} (${lo} à ${hi})`;
    tip.hidden = false;
    const r = row.getBoundingClientRect(), pr = vol.getBoundingClientRect();
    tip.style.left = clamp(r.left - pr.left + 110, 8, Math.max(8, pr.width - tip.offsetWidth - 8)) + "px";
    tip.style.top = (r.top - pr.top - tip.offsetHeight - 4) + "px";
  };
  vol.addEventListener("pointerover", e => { const row = e.target.closest(".vrow"); if (row) show(row); });
  vol.addEventListener("pointerleave", () => { tip.hidden = true; });
  vol.addEventListener("focusin", e => { const row = e.target.closest(".vrow"); if (row) show(row); });
  vol.addEventListener("focusout", () => { tip.hidden = true; });
}

/* ===== Nutrition ===== */
function validNutri(N) {
  if (clampInt(N.age, 14, 90) == null) return "Indique un âge entre 14 et 90 ans.";
  if (clampInt(N.taille, 120, 220) == null) return "Indique une taille entre 120 et 220 cm.";
  if (clampNum(N.poids, 35, 250) == null) return "Indique un poids entre 35 et 250 kg.";
  return "";
}
function calcNutri() {
  const N = nutri, st = prof();
  const age = +N.age, taille = +N.taille, poids = +N.poids;
  const bmr = 10 * poids + 6.25 * taille - 5 * age + (N.sexe === "f" ? -161 : 5);
  const minutes = MINUTES[st.time] || 45;
  const train = (+st.days) * 4 * poids * (minutes / 60) / 7;
  const tdee = bmr * ACT[N.act].f + train;
  const bmi = poids / Math.pow(taille / 100, 2);
  const minor = age < 18;
  let adj = 0, label = "maintien", rate = "";
  if (st.goal === "muscle") {
    const p = st.level === "deb" ? 0.12 : st.level === "inter" ? 0.10 : 0.06;
    const mo = st.level === "deb" ? [1, 1.5] : st.level === "inter" ? [0.5, 1] : [0.25, 0.5];
    adj = clamp(tdee * p, 200, 450); label = "surplus";
    rate = `Prise visée : ${n1(poids * mo[0] / 100)} à ${n1(poids * mo[1] / 100)} kg par mois, au-delà c'est surtout du gras.`;
  } else if (st.goal === "force") {
    adj = clamp(tdee * 0.05, 100, 250); label = "léger surplus";
    rate = "Poids stable à légère hausse : la force suit l'énergie disponible.";
  } else if (st.goal === "seche") {
    if (bmi < 20 || minor) { adj = 0; label = "maintien"; rate = minor ? "Moins de 18 ans : pas de déficit. Mise sur l'entraînement et une alimentation complète." : "IMC déjà bas : pas de déficit conseillé. Vise la recomposition (maintien + musculation)."; }
    else { adj = -clamp(tdee * 0.2, 300, 650); label = "déficit"; rate = `Perte visée : ${n1(poids * 0.005)} à ${n1(poids * 0.01)} kg par semaine, en gardant tes charges.`; }
  } else {
    if (bmi >= 25 && !minor) { adj = -clamp(tdee * 0.1, 200, 400); label = "léger déficit"; rate = `Perte douce visée : ${n1(poids * 0.0025)} à ${n1(poids * 0.005)} kg par semaine.`; }
    else { adj = 0; label = "maintien"; rate = "Poids stable : priorité aux habitudes et aux progrès en séance."; }
  }
  const ajust = clamp(+N.ajust || 0, -600, 600);
  let kcal = tdee + adj + ajust, floored = false;
  const floor = N.sexe === "f" ? 1200 : 1500;
  if (kcal < floor) { kcal = floor; floored = true; }
  const refW = bmi > 30 ? 25 * Math.pow(taille / 100, 2) : poids;
  const pk = { muscle: 1.8, force: 1.8, seche: 2.2, forme: 1.6 }[st.goal] * (N.reg !== "omni" ? 1.1 : 1);
  const prot = Math.round(refW * pk / 5) * 5;
  let fat = Math.round(refW * (st.goal === "seche" ? 0.8 : 0.9));
  let carbs = (kcal - prot * 4 - fat * 9) / 4;
  if (carbs < 2 * refW) { fat = Math.max(Math.round(0.6 * refW), Math.round(fat - (2 * refW - carbs) * 4 / 9)); carbs = (kcal - prot * 4 - fat * 9) / 4; }
  carbs = Math.max(0, Math.round(carbs / 5) * 5);
  kcal = Math.round(kcal / 10) * 10;
  return { bmr, tdee, adj, ajust, kcal, prot, fat, carbs, bmi, refW, label, rate, floored, minor,
    water: clamp(poids * 0.035, 1.8, 4), waterTrain: Math.round(minutes / 60 * 0.6 * 10) / 10,
    perMeal: Math.round(prot / 4 / 5) * 5, caf: [Math.round(poids * 3 / 10) * 10, Math.round(poids * 6 / 10) * 10] };
}
/* ===== Poids : pesées, tendance sur 3 semaines, ajustement des calories selon l'objectif ===== */
const dayNum = d => Math.round(Date.parse(d + "T12:00:00Z") / 864e5);
const todayISO = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };
function weightTrend(log) {
  const L = (Array.isArray(log) ? log : []).filter(e => e && e.kg > 0 && /^\d{4}-\d\d-\d\d$/.test(e.d)).sort((a, b) => (a.d < b.d ? -1 : 1));
  if (!L.length) return null;
  const last = dayNum(L[L.length - 1].d), win = L.filter(e => last - dayNum(e.d) <= 21);
  const xs = win.map(e => dayNum(e.d) - last), ys = win.map(e => e.kg), span = -Math.min(...xs);
  const mean = a => a.reduce((t, v) => t + v, 0) / a.length;
  if (win.length >= 4 && span >= 10) {
    const mx = mean(xs), my = mean(ys);
    const slope = xs.reduce((t, x, i) => t + (x - mx) * (ys[i] - my), 0) / xs.reduce((t, x) => t + (x - mx) * (x - mx), 0);
    return { now: my - slope * mx, rate: slope * 7, span, n: win.length, all: L };
  }
  return { now: mean(L.slice(-3).map(e => e.kg)), rate: null, span, n: win.length, all: L };
}
/* allure visée en % du poids par semaine, cohérente avec le calcul des calories */
function targetRate(r) {
  const st = prof();
  if (st.goal === "seche") return r.adj < 0 ? [-1, -0.5] : [-0.25, 0.25];
  if (st.goal === "muscle") return st.level === "deb" ? [0.23, 0.35] : st.level === "inter" ? [0.12, 0.23] : [0.06, 0.12];
  if (st.goal === "force") return [0, 0.15];
  return r.adj < 0 ? [-0.5, -0.25] : [-0.15, 0.15];
}
function weightAdvice(tr, r) {
  if (!tr || tr.rate == null) return null;
  const [lo, hi] = targetRate(r).map(p => p * tr.now / 100);
  const kcal = d => clamp(Math.round(Math.abs(d) * 1100 / 50) * 50, 100, 300);
  if (tr.rate < lo) return { delta: kcal(lo - tr.rate), lo, hi };
  if (tr.rate > hi) return { delta: -kcal(tr.rate - hi), lo, hi };
  return { delta: 0, lo, hi };
}
const sgn = v => (v > 0 ? "+" : v < 0 ? "−" : "±");
function waistInfo(log) {
  const L = (Array.isArray(log) ? log : []).filter(e => e && e.tt > 0).sort((a, b) => (a.d < b.d ? -1 : 1));
  if (!L.length) return null;
  const last = L[L.length - 1], ref = L.filter(e => dayNum(last.d) - dayNum(e.d) >= 21).pop();
  return { now: last.tt, d: last.d, change: ref ? last.tt - ref.tt : null, days: ref ? dayNum(last.d) - dayNum(ref.d) : 0 };
}
function weightChart(tr) {
  const pts = tr.all.filter(e => dayNum(tr.all[tr.all.length - 1].d) - dayNum(e.d) <= 56);
  if (pts.length < 2) return "";
  const W = 320, H = 96, P = 8, d0 = dayNum(pts[0].d), d1 = dayNum(pts[pts.length - 1].d) || d0 + 1;
  const kgs = pts.map(e => e.kg), lo = Math.min(...kgs) - 0.5, hi = Math.max(...kgs) + 0.5;
  const x = d => P + (dayNum(d) - d0) / Math.max(1, d1 - d0) * (W - 2 * P), y = k => H - P - (k - lo) / (hi - lo) * (H - 2 * P);
  const line = tr.rate != null ? `<line x1="${x(pts[0].d).toFixed(1)}" y1="${y(tr.now - tr.rate / 7 * (d1 - d0)).toFixed(1)}" x2="${x(pts[pts.length - 1].d).toFixed(1)}" y2="${y(tr.now).toFixed(1)}" stroke="var(--blue)" stroke-width="2.5" stroke-linecap="round"/>` : "";
  return `<svg class="wchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pesées des 8 dernières semaines : de ${n1(pts[0].kg)} à ${n1(pts[pts.length - 1].kg)} kg">${pts.map(e => `<circle cx="${x(e.d).toFixed(1)}" cy="${y(e.kg).toFixed(1)}" r="3" fill="var(--muted)" opacity=".75"/>`).join("")}${line}</svg>`;
}
function weightHTML(r) {
  const tr = weightTrend(nutri.log), adv = weightAdvice(tr, r), st = prof();
  const head = `<div class="sechead"><h3>Ton poids, semaine après semaine</h3><span class="muted small">le matin, à jeun</span></div>
    <form id="poids-form" class="prow" novalidate><label class="pfield" for="poids-in"><span>Poids (kg)</span><input id="poids-in" type="number" inputmode="decimal" min="35" max="250" step="0.1" placeholder="ex. 78,5"></label><label class="pfield" for="tt-in"><span>Tour de taille (cm)<span class="sr">, facultatif</span></span><input id="tt-in" type="number" inputmode="decimal" min="40" max="200" step="0.5" placeholder="facultatif"></label><button type="submit" class="btn2">Noter</button></form>`;
  if (!tr) return `<div class="card wcard">${head}<p class="muted small">Pèse-toi 3 matins ou plus par semaine. Après 10 jours, Fonte calcule ta tendance (sans se laisser piéger par l'eau ou le sel) et te dit s'il faut ajuster tes calories. Mesure aussi ton tour de taille une fois par semaine, au niveau du nombril : il montre si tu perds du gras quand la balance stagne.</p></div>`;
  const pct = tr.rate != null ? tr.rate / tr.now * 100 : null;
  const rateTxt = tr.rate == null ? `Encore ${tr.n < 4 ? `${4 - tr.n} pesée${4 - tr.n > 1 ? "s" : ""}` : "quelques jours"} pour calculer ta tendance.` : `${sgn(Math.round(tr.rate * 10))}${n1(Math.abs(tr.rate))} kg par semaine (${sgn(Math.round(pct * 10))}${n1(Math.abs(pct))} %) sur ${tr.span} jours.`;
  let verdict = "";
  const since = nutri.ajustLe ? dayNum(todayISO()) - dayNum(nutri.ajustLe) : 99;
  const wi = waistInfo(nutri.log), weeks = wi ? Math.round(wi.days / 7) : 0;
  /* sèche : la balance stagne mais la taille fond, c'est du gras perdu et du muscle gardé, on ne retire pas de calories */
  const recomp = !!(adv && adv.delta < 0 && st.goal === "seche" && wi && wi.change != null && wi.change <= -1);
  if (adv && unlocked && since < 10) {
    verdict = `<div class="wverdict ok"><p>Ajustement appliqué ${since === 0 ? "aujourd'hui" : `il y a ${since} jour${since > 1 ? "s" : ""}`} : continue tes pesées, Fonte regarde son effet pendant 10 jours avant de te proposer autre chose.</p></div>`;
  } else if (adv) {
    const range = `${adv.lo >= 0 ? "+" : "−"}${n1(Math.abs(adv.lo))} à ${adv.hi >= 0 ? "+" : "−"}${n1(Math.abs(adv.hi))} kg par semaine`;
    const txt = recomp ? `Ton tour de taille baisse : garde ${n0(r.kcal)} kcal par jour, inutile de manger moins pour l'instant.`
      : adv.delta === 0 ? `Dans ta cible (${range}) : garde ${n0(r.kcal)} kcal par jour.`
      : adv.delta > 0 ? `${st.goal === "seche" || st.goal === "forme" ? "Tu perds plus vite que prévu" : "Ton poids monte moins vite que prévu"} (cible : ${range}) : ajoute ${adv.delta} kcal par jour, soit ${n0(r.kcal + adv.delta)} kcal.`
      : `${st.goal === "seche" || st.goal === "forme" ? "Tu perds moins vite que prévu" : "Ton poids monte plus vite que prévu"} (cible : ${range}) : retire ${-adv.delta} kcal par jour, soit ${n0(r.kcal + adv.delta)} kcal${st.goal === "seche" ? ", ou ajoute 2 000 pas par jour" : ""}.`;
    verdict = unlocked ? `<div class="wverdict ${adv.delta === 0 || recomp ? "ok" : "adj"}"><p>${esc(txt)}</p>${adv.delta && !recomp ? `<button type="button" class="primary" data-act="poids-apply" data-k="${adv.delta}">Appliquer (${adv.delta > 0 ? "+" : "−"}${Math.abs(adv.delta)} kcal)</button>` : ""}</div>`
      : `<p class="note">Ajustement automatique de tes calories d'après ta tendance : inclus dans la version complète.</p>`;
  }
  const maj = Math.abs(tr.now - +nutri.poids) >= 1 ? `<button type="button" class="linkbtn" data-act="poids-maj">Mettre ton profil à ${n1(tr.now)} kg</button>` : "";
  const waist = wi ? `<p>Tour de taille : <b>${n1(wi.now)} cm</b>${wi.change != null ? ` · ${sgn(wi.change)}${n1(Math.abs(wi.change))} cm en ${weeks}\u00a0semaines` : ""}.${recomp ? " Ta taille baisse plus vite que ton poids : tu perds du gras en gardant ton muscle." : ""}</p>` : "";
  return `<div class="card wcard">${head}${weightChart(tr)}
    <p>Tendance : <b>${n1(tr.now)} kg</b> · ${esc(rateTxt)} ${maj}</p>${waist}${verdict}
    ${nutri.ajust ? `<p class="muted small">Ajustement déjà appliqué d'après tes pesées : ${nutri.ajust > 0 ? "+" : "−"}${Math.abs(nutri.ajust)} kcal. <button type="button" class="linkbtn" data-act="poids-reset">Revenir au calcul de base</button></p>` : ""}
    <details><summary>Mes pesées (${tr.all.length})</summary><ul class="wlist">${tr.all.slice(-14).reverse().map(e => `<li><span>${new Date(e.d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</span><b>${n1(e.kg)} kg</b>${e.tt ? `<span class="muted">${n1(e.tt)} cm</span>` : ""}<button type="button" class="linkbtn" data-act="poids-del" data-d="${e.d}" aria-label="Supprimer la pesée du ${e.d}">Supprimer</button></li>`).join("")}</ul></details></div>`;
}
function adjTxt(r) { return r.adj === 0 ? "maintien" : `${r.adj > 0 ? "+" : "−"}${n0(Math.abs(r.adj))} kcal (${r.label})`; }
function tile(label, key, val, sub) {
  return `<div class="tile"><span>${key ? `<i class="key" style="--k:var(${key})"></i>` : ""}${label}</span><b>${val}</b><em>${sub}</em></div>`;
}
function renderNutri() {
  const N = nutri, st = prof();
  const chips = (nk, obj, cur) => Object.entries(obj).map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${cur === k}">${typeof l === "string" ? l : l.l}</button>`).join("");
  $("#panel-nutri").innerHTML = `
  <section><div class="sechead"><h2>Ta nutrition</h2>${N.example ? '<span class="badge">Exemple : remplace par tes infos</span>' : ""}</div>
    <p class="muted">Métabolisme de base (Mifflin-St Jeor) + activité + dépense de tes ${st.days} séances, ajusté à ton objectif : ${LABEL.goal[st.goal].toLowerCase()}.</p>
    <div class="nform" id="nform">
      <div class="field"><span class="flabel" id="n-sexe-l">Sexe</span><div class="chips" role="group" aria-labelledby="n-sexe-l" data-nk="sexe">${chips("sexe", { h: "Homme", f: "Femme" }, N.sexe)}</div></div>
      <div class="nrow">
        <div class="field"><label for="n-age">Âge</label><input id="n-age" type="number" inputmode="numeric" min="14" max="90" value="${esc(N.age)}"></div>
        <div class="field"><label for="n-taille">Taille (cm)</label><input id="n-taille" type="number" inputmode="numeric" min="120" max="220" value="${esc(N.taille)}"></div>
        <div class="field"><label for="n-poids">Poids (kg)</label><input id="n-poids" type="number" inputmode="decimal" min="35" max="250" step="0.1" value="${esc(N.poids)}"></div>
      </div>
      <div class="field"><span class="flabel" id="n-act-l">Activité en dehors des séances</span><div class="chips" role="group" aria-labelledby="n-act-l" data-nk="act">${chips("act", ACT, N.act)}</div><p class="hint" id="n-act-hint">${ACT[N.act].d}</p></div>
      <div class="field"><span class="flabel" id="n-reg-l">Alimentation</span><div class="chips" role="group" aria-labelledby="n-reg-l" data-nk="reg">${chips("reg", REG, N.reg)}</div></div>
    </div></section>
  <section id="n-out"></section>`;
  renderNutriOut();
}
function renderNutriOut() {
  const O = $("#n-out");
  if (!O) return;
  const bad = validNutri(nutri);
  if (bad) { O.innerHTML = `<p class="note">${esc(bad)}</p>`; return; }
  const r = calcNutri(), st = prof(), w = +nutri.poids;
  const pk = r.prot * 4, lk = r.fat * 9, gk = r.carbs * 4, tot = pk + lk + gk;
  const pct = x => Math.round(x / tot * 100);
  const notes = [];
  if (r.floored) notes.push("Apport plancher de sécurité appliqué : ne descends pas plus bas sans suivi médical.");
  if (r.bmi > 30) notes.push(`Protéines et lipides calculés sur un poids de référence de ${n0(r.refW)} kg (IMC 25), plus réaliste que ton poids actuel.`);
  if (r.minor) notes.push("Moins de 18 ans : pas de compléments ni de régime restrictif. Parles-en avec un adulte ou ton médecin.");
  const adjust = {
    muscle: "Pèse-toi 3 à 7 matins par semaine et compare les moyennes. Si ton poids ne monte pas après 2 semaines, ajoute 150 kcal ; s'il monte plus vite que prévu, retire 100 à 150 kcal.",
    force: "Poids stable ou en légère hausse : c'est l'idéal. Si tes performances stagnent et que ton poids baisse, ajoute 150 à 200 kcal.",
    seche: "Pèse-toi 3 à 7 matins par semaine et compare les moyennes. Moins de 0,5 % perdu par semaine pendant 2 semaines : retire 150 kcal ou ajoute 2 000 pas par jour. Plus de 1 % : remonte de 150 kcal pour protéger ton muscle.",
    forme: "Compare tes moyennes de poids et ton tour de taille toutes les 2 à 3 semaines, puis ajuste de 100 à 150 kcal si besoin."
  }[st.goal];
  const src = SOURCES[nutri.reg] || SOURCES.omni;
  O.innerHTML = `
    <div class="hero"><span class="muted small">Ton objectif calorique</span><div class="big">${n0(r.kcal)} <small>kcal par jour</small></div>
      <p class="muted">Dépense estimée ${n0(r.tdee)} kcal, dont ${n0(r.bmr)} kcal de métabolisme de base · ${adjTxt(r)}${r.ajust ? ` · ajusté d'après tes pesées : ${r.ajust > 0 ? "+" : "−"}${Math.abs(r.ajust)} kcal` : ""}. ${esc(r.rate)}</p></div>
    ${weightHTML(r)}
    <div class="tiles">
      ${tile("Protéines", "--c-prot", `${r.prot} g`, `${n1(r.prot / w)} g/kg · ≈ ${r.perMeal} g par repas`)}
      ${tile("Lipides", "--c-lip", `${r.fat} g`, `${n1(r.fat / w)} g/kg`)}
      ${tile("Glucides", "--c-glu", `${r.carbs} g`, `${n1(r.carbs / w)} g/kg`)}
      ${tile("Eau", null, `${n1(r.water)} L`, `+ ${n1(r.waterTrain)} L les jours de séance`)}
    </div>
    <div><div class="stack" role="img" aria-label="Répartition des calories : protéines ${pct(pk)} %, lipides ${pct(lk)} %, glucides ${pct(gk)} %">
      <div style="--k:var(--c-prot);width:${pk / tot * 100}%" title="Protéines : ${n0(pk)} kcal (${pct(pk)} %)"></div><div style="--k:var(--c-lip);width:${lk / tot * 100}%" title="Lipides : ${n0(lk)} kcal (${pct(lk)} %)"></div><div style="--k:var(--c-glu);width:${gk / tot * 100}%" title="Glucides : ${n0(gk)} kcal (${pct(gk)} %)"></div></div>
      <div class="legend" style="margin-top:8px"><span><i class="key" style="--k:var(--c-prot)"></i>Protéines ${pct(pk)} %</span><span><i class="key" style="--k:var(--c-lip)"></i>Lipides ${pct(lk)} %</span><span><i class="key" style="--k:var(--c-glu)"></i>Glucides ${pct(gk)} %</span></div></div>
    ${notes.map(t => `<p class="note">${esc(t)}</p>`).join("")}
    <div class="coachcta"><p><b>Ta journée type</b><br><span class="muted small">Ton coach compose tes repas avec ces chiffres, tes goûts et ton budget.</span></p><button type="button" class="primary" data-act="mealplan">Créer ma journée type</button></div>
    <div class="gate ${unlocked ? "" : "locked"}"><div class="body"${unlocked ? "" : " inert"} style="display:grid;gap:12px">
      <div class="card"><b>Ajuste après 2 semaines.</b> ${adjust}</div>
      <div class="card"><b>Méthode de la main</b>, à chaque repas, sans balance : 1 à 2 paumes de protéines, 1 à 2 poings de légumes, 1 à 2 mains en coupe de féculents, 1 à 2 pouces de matières grasses.</div>
      <div class="card"><h4 style="margin-top:0">Tes sources de protéines · ${REG[nutri.reg].toLowerCase()}</h4><div class="tbl"><table><thead><tr><th>Aliment</th><th>Portion</th><th class="n">Protéines</th></tr></thead><tbody>${src.map(([a, p, g]) => `<tr><td>${a}</td><td>${p}</td><td class="n">${g} g</td></tr>`).join("")}</tbody></table></div></div>
      <div class="card"><h4 style="margin-top:0">Compléments qui valent le coup</h4><ul class="tips">
        <li><b>Créatine monohydrate</b> : 3 à 5 g par jour, tous les jours, à n'importe quelle heure. La mieux prouvée pour la force et le muscle.</li>
        <li><b>Caféine</b> : ${r.caf[0]} à ${r.caf[1]} mg 30 à 60 min avant la séance, jamais après 14 h.</li>
        <li><b>Protéine en poudre</b> : seulement si tu peines à atteindre ${r.prot} g par jour avec tes repas.</li>
        <li><b>Vitamine D</b> d'octobre à mars, et <b>oméga-3</b> si tu manges moins de deux fois du poisson par semaine : après avis médical.</li>
        <li><b>Inutiles</b> : brûleurs de graisse, boosters de testostérone, BCAA si tes protéines sont suffisantes. Choisis des produits conformes à la norme NF V94-001 (sans substances dopantes).</li></ul></div>
    </div>${unlocked ? "" : gateMsg("Plan nutrition complet")}</div>`;
}
$("#panel-nutri").addEventListener("input", e => {
  const id = e.target.id, map = { "n-age": "age", "n-taille": "taille", "n-poids": "poids" };
  if (!map[id]) return;
  nutri[map[id]] = e.target.value;
  nutri.example = false;
  renderNutriOut(); save();
});
$("#panel-nutri").addEventListener("submit", e => {
  if (e.target.id !== "poids-form") return;
  e.preventDefault();
  const kg = clampNum($("#poids-in").value, 35, 250), ttRaw = $("#tt-in").value.trim(), tt = ttRaw ? clampNum(ttRaw, 40, 200) : null;
  if (kg == null) { toast("Indique un poids entre 35 et 250 kg."); return; }
  if (ttRaw && tt == null) { toast("Indique un tour de taille entre 40 et 200 cm."); return; }
  const d = todayISO(), all = Array.isArray(nutri.log) ? nutri.log : [], prev = all.find(x => x.d === d), log = all.filter(x => x.d !== d);
  const keepTt = tt ? Math.round(tt * 2) / 2 : prev && prev.tt > 0 ? prev.tt : 0;
  log.push({ d, kg: Math.round(kg * 10) / 10, ...(keepTt ? { tt: keepTt } : {}) });
  nutri.log = log.sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-400);
  renderNutriOut(); save();
  toast(`Pesée notée : ${n1(kg)} kg${keepTt ? `, ${n1(keepTt)} cm de tour de taille` : ""}.`);
});
$("#panel-nutri").addEventListener("click", e => {
  const a = e.target.closest("[data-act^='poids-']");
  if (a) {
    const act = a.dataset.act;
    if (act === "poids-del") nutri.log = (nutri.log || []).filter(x => x.d !== a.dataset.d);
    else if (act === "poids-apply") { nutri.ajust = clamp((+nutri.ajust || 0) + (+a.dataset.k || 0), -600, 600); nutri.ajustLe = todayISO(); toast(`Calories ajustées : ${n0(calcNutri().kcal)} kcal par jour.`); }
    else if (act === "poids-reset") { nutri.ajust = 0; nutri.ajustLe = null; }
    else if (act === "poids-maj") { const tr = weightTrend(nutri.log); if (tr) { nutri.poids = Math.round(tr.now * 10) / 10; nutri.example = false; renderNutri(); save(); return; } }
    renderNutriOut(); save();
    return;
  }
  const b = e.target.closest("[data-nk] button[data-v]");
  if (!b) return;
  const grp = b.closest("[data-nk]"), nk = grp.dataset.nk;
  nutri[nk] = b.dataset.v;
  nutri.example = false;
  grp.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  if (nk === "act") $("#n-act-hint").textContent = ACT[nutri.act].d;
  renderNutriOut(); save();
});

/* ===== Mobilité ===== */
function drillHTML(d, zone) { return `<li><b>${esc(d.n)}${zone ? ` <span class="tag">${esc(zone)}</span>` : ""}</b><span>${esc(d.d)}</span><p>${esc(d.c)}</p></li>`; }
function renderMob() {
  stopBreath();
  const st = prof();
  const zoneDrills = st.pain.flatMap(z => MOBZ[z].map(d => ({ d, z })));
  $("#panel-mob").innerHTML = `
  <section><div class="sechead"><h2>Mobilité et récupération</h2></div><p class="muted">10 minutes par jour, au réveil, le soir ou en échauffement. Lentement, sans douleur, en respirant.</p>
    <div class="card"><h3>Routine quotidienne · 10 min</h3><ul class="drills">${MOB.map(d => drillHTML(d)).join("")}</ul></div></section>
  <section><div class="sechead"><h3>Cohérence cardiaque</h3><span class="muted small">5 min · 6 respirations par minute</span></div>
    <div class="breath"><div class="ring" aria-hidden="true"><div class="orb" id="breath-orb"></div><span class="cue" id="breath-cue">Prêt ?</span></div>
      <div class="txt"><p>Inspire 5 secondes quand le cercle grandit, expire 5 secondes quand il se resserre. Trois fois par jour (méthode 365) : moins de stress, meilleure récupération, meilleur sommeil.</p>
      <div class="acts"><button type="button" class="primary" id="breath-go" data-act="breath">Démarrer 5 min</button><span class="muted small" id="breath-left" aria-live="polite"></span></div></div></div></section>
  <section><div class="sechead"><h3>Zones sensibles et récupération</h3></div>
    <div class="gate ${unlocked ? "" : "locked"}"><div class="body"${unlocked ? "" : " inert"} style="display:grid;gap:12px">
      ${zoneDrills.length ? `<div class="card"><ul class="drills">${zoneDrills.map(o => drillHTML(o.d, ZONES[o.z])).join("")}</ul></div>` : `<div class="card"><p>Aucune zone à ménager dans ton profil. Une gêne apparaît ? Ajoute-la dans tes réponses ou dis-le au coach : il adapte ton programme et cette routine.</p></div>`}
      <div class="card"><h3>Récupération</h3><ul class="tips" style="margin-top:8px">${RECUP.map(([t, d]) => `<li><b>${t}.</b> ${d}</li>`).join("")}</ul></div>
    </div>${unlocked ? "" : gateMsg("Routine zones sensibles et plan de récupération")}</div></section>`;
}
let breath = null;
function stopBreath() { if (breath) { clearInterval(breath); breath = null; } }
function toggleBreath() {
  const btn = $("#breath-go");
  if (breath) {
    stopBreath();
    $("#breath-orb").classList.remove("in"); $("#breath-cue").textContent = "Prêt ?"; $("#breath-left").textContent = ""; btn.textContent = "Démarrer 5 min";
    return;
  }
  let sec = 0;
  const total = 300;
  const step = () => {
    const orb = $("#breath-orb"), cue = $("#breath-cue"), left = $("#breath-left");
    if (!orb) { stopBreath(); return; }
    if (sec >= total) { stopBreath(); orb.classList.remove("in"); cue.textContent = "Terminé"; left.textContent = "Bien joué. Refais-le avant de dormir."; $("#breath-go").textContent = "Recommencer"; return; }
    const inhale = Math.floor(sec / 5) % 2 === 0;
    cue.textContent = inhale ? "Inspire" : "Expire";
    orb.classList.toggle("in", inhale);
    const r = total - sec;
    left.textContent = `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")} restantes`;
    sec++;
  };
  breath = setInterval(step, 1000);
  step();
  btn.textContent = "Arrêter";
}

/* ===== Actions de la page ===== */
function swapEx(si, xi) {
  const st = prof(), s = plan.sessions[si], x = s.ex[xi], cur = EXI[x.id];
  if (!cur) { toast("Demande au coach de remplacer cet exercice."); return; }
  const list = candidates(cur.p, st), used = new Set(s.ex.map(y => y.id));
  const start = list.findIndex(e => e.id === x.id);
  let next = null;
  for (let k = 1; k <= list.length; k++) { const c = list[(start + k + list.length) % list.length]; if (c && !used.has(c.id)) { next = c; break; } }
  if (!next) { toast("Pas d'autre option compatible avec ton matériel et tes zones à ménager."); return; }
  const u = pushUndo(), old = x.n;
  s.ex[xi] = mkEx(next, roleOf(next, xi), st);
  edits.push(`Remplacement manuel : ${old} → ${next.n} (séance ${si + 1})`);
  renderProgram(); save();
  const btn = document.querySelector(`[aria-controls="exd-${si}-${xi}"]`);
  if (btn) { btn.setAttribute("aria-expanded", "true"); $(`#exd-${si}-${xi}`).hidden = false; }
  toast(`${old} remplacé par ${next.n}`, u);
}
$("#result").addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const act = b.dataset.act;
  if (act === "more") {
    const d = document.getElementById(b.getAttribute("aria-controls")), open = b.getAttribute("aria-expanded") === "true", host = d.querySelector(".anim-host");
    b.setAttribute("aria-expanded", open ? "false" : "true"); d.hidden = open;
    if (host) open ? DEMO.unmount(host) : DEMO.mount(host, host.dataset.ex, host.dataset.name);
  }
  else if (act === "swap") swapEx(+b.dataset.s, +b.dataset.i);
  else if (act === "stage") setStage(+b.dataset.n);
  else if (act === "askex") { const x = plan.sessions[+b.dataset.s].ex[+b.dataset.i]; coachAsk(`Explique-moi l'exercice « ${x.n} » (séance ${+b.dataset.s + 1}) : technique détaillée, erreurs à éviter, comment progresser, et une alternative si ça me gêne.`, { display: `Explique-moi l'exercice « ${x.n} »` }); }
  else if (act === "unlock") {
    // appli installée : jamais de déblocage gratuit ; récapitulatif et accord exprès avant la page de paiement
    if (PAY()) window.FONTE_PWA.checkout("fonte");
    else if (window.FONTE_PWA) toast("Le paiement en ligne arrive bientôt : reviens dans quelques jours.");
    else { unlocked = true; renderAll(); save(); toast("Version complète débloquée."); }
  }
  else if (act === "analyse") coachAsk(ANALYSE, { display: "Analyse complète de mon programme", deep: true });
  else if (act === "combler") coachAsk("Mon volume est sous la cible pour certains muscles. Ajoute ce qu'il faut (2 à 3 séries d'isolation au bon endroit) sans dépasser ma durée de séance, et explique ton choix.", { display: "Comble les muscles sous la cible" });
  else if (act === "mealplan") coachAsk("Crée-moi une journée type de repas qui respecte mes calories et mes protéines (onglet Nutrition), avec des aliments simples du quotidien et les quantités. Donne un tableau : repas, aliments et quantités, protéines, kcal. Ajoute une variante rapide pour les jours chargés.", { display: "Crée-moi une journée type de repas" });
  else if (act === "pdf") exportPDF();
  else if (act === "ics") exportICS();
  else if (act === "copycode") copyCode();
  else if (act === "breath") toggleBreath();
  else if (act === "edit") { $("#f").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth" }); $("#f button[aria-pressed='true']").focus({ preventScroll: true }); }
  else if (act === "undo") { const m = chat[+b.dataset.m], a = m && m.actions[+b.dataset.a]; if (a) { undoTo(a.u); toast("Modification annulée."); } }
  else if (act === "retry") { const i = +b.dataset.m, m = chat[i]; if (m && m.retry) { const r = m.retry; chat.splice(i - 1, 2); renderLog(); coachAsk(r.text, r.opts); } }
  else if (act === "sugg") { const s = SUGG_CUR[+b.dataset.i]; if (s) coachAsk(s.q, s.o); }
});

function renderAll() {
  renderSummary(); renderProgram(); renderNutri(); renderMob(); renderLog(); renderSugg(); renderCoachShell(); syncChips();
}

/* ===== Coach IA ===== */
const ANALYSE = "Fais l'analyse complète de mon profil et de mon programme. Structure ta réponse ainsi : ### Ton diagnostic (3 lignes) ; ### Tes 3 priorités pour les 4 prochaines semaines ; ### Points techniques à surveiller sur mes exercices clés ; ### Nutrition (calories et protéines cibles, en t'appuyant sur l'onglet Nutrition si mon profil est rempli, sinon dis-moi quelles infos te donner) ; ### Récupération et mobilité adaptées à mes zones sensibles ; ### Ce qui me ferait progresser plus vite. Sois concret, chiffré et personnalisé.";
let sample = null, downloads, runtimeDone = false, coachState = "loading", toolsOK = false, maxTools = 0, busy = false, ctl = null;
let SUGG_CUR = [];

async function initRuntime() {
  const c = window.claude;
  if (!c || typeof c.use !== "function") { coachState = "absent"; downloads = null; runtimeDone = true; renderCoachShell(); updatePdf(); return; }
  c.use("downloads").then(d => { downloads = d; }).catch(() => { downloads = null; }).finally(() => { runtimeDone = true; updatePdf(); });
  try { sample = await c.use("sample"); } catch (e) { sample = null; }
  if (!sample) { coachState = "absent"; renderCoachShell(); return; }
  try { const lim = await sample.limits(); toolsOK = !!(lim && lim.tools); maxTools = toolsOK ? lim.tools.maxCount : 0; } catch (e) { toolsOK = false; }
  coachState = "ready";
  renderCoachShell();
}
function updatePdf() { ["#pdf-sec", "#ics-sec"].forEach(id => { const sec = $(id); if (sec) sec.hidden = runtimeDone && !downloads; }); }

function renderCoachShell() {
  const off = $("#coach-off"), form = $("#coach-form"), sugg = $("#coach-sugg"), status = $("#coach-status");
  const msgs = {
    absent: (window.FONTE_PWA && window.FONTE_PWA.coachMsg) || "<b>Le coach IA n'est pas disponible dans cette vue.</b><span class=\"muted\">Ouvre Fonte depuis Claude, connecté à ton compte, pour discuter avec lui. Ton programme, ta nutrition et ta mobilité restent disponibles.</span>",
    denied: "<b>Le coach est en pause pour cette visite.</b><span class=\"muted\">Fonte n'a pas l'autorisation d'utiliser Claude. Recharge la page et accepte la demande pour le réactiver.</span>",
    disabled: "<b>Claude n'est pas disponible pour ce compte.</b><span class=\"muted\">Le reste de l'application fonctionne normalement.</span>"
  };
  const consent = coachState === "ready" && needConsent();
  const isOff = coachState in msgs || consent;
  off.hidden = !isOff;
  off.classList.toggle("bare", consent);
  if (consent) off.innerHTML = window.FONTE_PWA.consentHTML();
  else if (isOff) off.innerHTML = msgs[coachState];
  form.hidden = isOff;
  sugg.hidden = isOff || busy;
  $("#coach-send").disabled = coachState !== "ready" || busy;
  if (coachState === "loading") status.textContent = "Connexion au coach…";
  else if (!busy && status.textContent === "Connexion au coach…") status.textContent = "";
  renderQuota();
}
function renderQuota() {
  const q = $("#coach-quota");
  if (!q) return;
  q.textContent = unlocked ? "" : freeUsed >= FREE_Q ? "Questions offertes utilisées" : `${FREE_Q - freeUsed} question${FREE_Q - freeUsed > 1 ? "s" : ""} offerte${FREE_Q - freeUsed > 1 ? "s" : ""}`;
}
function painPhrase(z) { return { dos: "au dos", genoux: "aux genoux", epaules: "aux épaules", poignets: "aux poignets", coudes: "aux coudes", hanches: "aux hanches" }[z]; }
function renderSugg() {
  const box = $("#coach-sugg");
  if (!box || !plan) return;
  const st = prof(), first = plan.sessions[0].ex[0];
  const goalQ = { muscle: "Combien de calories et de protéines pour prendre du muscle ?", force: "Comment choisir mes charges sur les gros mouvements ?", seche: "Comment sécher sans perdre de muscle ?", forme: "Par où commencer si je reprends le sport ?" }[st.goal];
  SUGG_CUR = [
    { l: "Analyse complète de mon programme", q: ANALYSE, o: { display: "Analyse complète de mon programme", deep: true } },
    { l: goalQ, q: goalQ, o: {} },
    st.pain.length ? { l: `J'ai mal ${painPhrase(st.pain[0])} : que faire ?`, q: `J'ai mal ${painPhrase(st.pain[0])}. Qu'est-ce que je peux faire, quels exercices éviter et lesquels faire ?`, o: {} } : { l: "Comment éviter de me blesser ?", q: "Comment éviter de me blesser avec mon programme ?", o: {} },
    { l: "Je n'ai que 20 minutes aujourd'hui", q: "Je n'ai que 20 minutes aujourd'hui. Comment j'adapte ma séance du jour ?", o: {} },
    first ? { l: `Remplace « ${first.n} »`, q: `Je ne veux pas faire « ${first.n} » en séance 1. Remplace-le par une bonne alternative et explique pourquoi.`, o: {} } : null,
    { l: "Quels compléments valent vraiment le coup ?", q: "Quels compléments valent vraiment le coup pour moi ?", o: {} }
  ].filter(Boolean);
  box.innerHTML = SUGG_CUR.map((s, i) => `<button type="button" data-act="sugg" data-i="${i}">${esc(s.l)}</button>`).join("");
  box.hidden = coachState !== "ready" || busy || needConsent();
}
function md(src) {
  const inline = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/(https:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  const lines = String(src).replace(/\r/g, "").split("\n");
  let html = "", list = null, para = [], i = 0;
  const flush = () => { if (para.length) { html += "<p>" + para.map(inline).join("<br>") + "</p>"; para = []; } };
  const close = () => { if (list) { html += `</${list}>`; list = null; } };
  const isRow = l => /^\s*\|.*\|\s*$/.test(l);
  while (i < lines.length) {
    const l = lines[i];
    let m;
    if (isRow(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      flush(); close();
      const rows = [l]; i += 2;
      while (i < lines.length && isRow(lines[i])) { rows.push(lines[i]); i++; }
      const cells = r => r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => inline(c.trim()));
      html += `<div class="tbl"><table><thead><tr>${cells(rows[0]).map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${cells(r).map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      continue;
    }
    if ((m = l.match(/^\s*#{1,6}\s+(.*)$/))) { flush(); close(); html += `<h4>${inline(m[1])}</h4>`; }
    else if ((m = l.match(/^\s*[-*•]\s+(.*)$/))) { flush(); if (list !== "ul") { close(); html += "<ul>"; list = "ul"; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = l.match(/^\s*(\d+)[.)]\s+(.*)$/))) { flush(); if (list !== "ol") { close(); html += "<ol>"; list = "ol"; } html += `<li>${inline(m[2])}</li>`; }
    else if (!l.trim()) { flush(); close(); }
    else { close(); para.push(l); }
    i++;
  }
  flush(); close();
  return html;
}
function introHTML() {
  if (!plan) return "";
  const st = prof();
  return `<div class="msg a"><span class="who">Coach Fonte</span><div class="txt"><p>Salut ! J'ai ton programme sous les yeux : ${LABEL.goal[st.goal].toLowerCase()}, ${st.days} séances de ${LABEL.time[st.time]}, ${LABEL.eq[st.eq].toLowerCase()}${st.pain.length ? `, en ménageant ${st.pain.map(z => ZONES[z].toLowerCase()).join(" et ")}` : ""}.</p><p>Pose-moi tes questions sur l'entraînement, la technique, la nutrition, la récupération ou une douleur. Je peux aussi modifier ton programme : remplacer un exercice, ajuster les séries, ménager une zone sensible.</p></div></div>`;
}
function msgHTML(m, i) {
  if (m.role === "user") return `<div class="msg u" data-i="${i}"><span class="who">Toi</span><div class="txt">${esc(m.display || m.content)}</div></div>`;
  const body = m.content ? md(m.content) : m.pending ? `<p class="thinking">${esc(m.status || "Le coach réfléchit…")}</p>` : "";
  const acts = (m.actions || []).map((a, k) => `<div class="action${a.undone ? " undone" : ""}"><b>Programme modifié</b><span>${esc(a.txt)}</span>${!a.undone && undoStack[a.u] ? `<button type="button" class="btn2" data-act="undo" data-m="${i}" data-a="${k}">Annuler</button>` : ""}</div>`).join("");
  return `<div class="msg a" data-i="${i}"><span class="who">Coach Fonte</span>${body ? `<div class="txt">${body}</div>` : ""}${acts}${m.note ? `<p class="note">${esc(m.note)}</p>` : ""}${m.retry ? `<div class="acts"><button type="button" class="btn2" data-act="retry" data-m="${i}">Réessayer</button></div>` : ""}</div>`;
}
function renderLog() {
  const L = $("#coach-log");
  if (!L) return;
  const wall = !unlocked && freeUsed >= FREE_Q ? `<div class="paywall"><h3>Tes 3 questions offertes sont utilisées</h3><p>Débloque Fonte pour un coach illimité, ton programme complet, la nutrition, la mobilité et l'export PDF. Paiement unique.</p><button class="unlock" type="button" data-act="unlock">Débloquer pour 19 €</button>${payNote("Mode démo : déblocage sans paiement.")}</div>` : "";
  L.innerHTML = introHTML() + chat.map((m, i) => msgHTML(m, i)).join("") + wall;
}
function updateMsg(msg) {
  const i = chat.indexOf(msg);
  if (i < 0) return;
  const el = document.querySelector(`#coach-log .msg[data-i="${i}"]`);
  if (el) el.outerHTML = msgHTML(msg, i); else renderLog();
}
function nearBottom() { return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 240; }
function toComposer() { const f = $("#coach-form"); if (f && !f.hidden) f.scrollIntoView({ block: "end", behavior: reduceMotion() ? "auto" : "smooth" }); }

function contexte() {
  const st = prof(), v = volume(), [lo, hi] = band(st);
  const W = st.goal === "force" && st.level === "deb" ? PROG_DEB_FORCE : PROG[st.goal];
  const L = [];
  L.push("=== CONTEXTE DE L'UTILISATEUR (mis à jour à chaque message) ===");
  L.push("Date : " + new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  L.push("Accès : " + (unlocked ? "version complète débloquée" : `version gratuite (questions offertes restantes après celle-ci : ${Math.max(0, FREE_Q - freeUsed - 1)})`));
  L.push(`Questionnaire : objectif = ${LABEL.goal[st.goal]} ; niveau = ${LABEL.level[st.level]} ; ${st.days} séances par semaine (${DAYS[st.days].map(d => DAYFULL[d]).join(", ")}) ; ${LABEL.time[st.time]} par séance ; matériel = ${LABEL.eq[st.eq]} ; zones à ménager = ${st.pain.length ? st.pain.map(z => ZONES[z].toLowerCase()).join(", ") : "aucune"}`);
  L.push(`Découpage : ${SPLITNAME[st.days]}`);
  L.push(`Stade du programme : ${stageN(st)} sur 3 (${PROGRESSION.STAGES[stageN(st) - 1].name} : ${PROGRESSION.STAGES[stageN(st) - 1].focus})${(+st.cycle || 1) > 1 ? ` ; cycle ${st.cycle}` : ""}. Le dosage affiché tient déjà compte du stade.`);
  L.push(`Outils de modification du programme : ${toolsOK ? "disponibles" : "indisponibles dans cette session (explique les changements à faire à la main)"}`);
  L.push("Programme actuel :");
  plan.sessions.forEach((s, i) => {
    L.push(`Séance ${i + 1} (${DAYFULL[s.day]}) · ${s.name}`);
    s.ex.forEach((x, j) => { const e = EXI[x.id]; L.push(`  ${j + 1}. ${x.n} — ${doseTxt(x)}, repos ${x.rest}, RIR ${x.rir} [${e ? PATTERN[e.p] : "hors base"}]`); });
  });
  L.push(`Volume hebdomadaire estimé (séries fractionnelles) : ${Object.keys(MUS).map(k => `${MUS[k]} ${n1(v[k])}`).join(" ; ")} (cible de son profil : ${lo} à ${hi} séries par muscle)`);
  L.push(`Progression prévue sur 4 semaines : ${W.map((w, i) => `S${i + 1} ${w[0]} (${w[1]})`).join(" ; ")}`);
  L.push(`Cardio et activité conseillés : ${CARDIO[st.goal]}`);
  if (nutri.example || validNutri(nutri)) L.push("Nutrition : profil non renseigné (l'onglet Nutrition affiche un exemple : homme, 30 ans, 178 cm, 75 kg). Demande ses informations si nécessaire.");
  else {
    const r = calcNutri();
    L.push(`Nutrition : ${nutri.sexe === "f" ? "femme" : "homme"}, ${nutri.age} ans, ${nutri.taille} cm, ${nutri.poids} kg, activité ${ACT[nutri.act].l.toLowerCase()}, alimentation ${REG[nutri.reg].toLowerCase()} → métabolisme de base ${n0(r.bmr)} kcal, dépense ~${n0(r.tdee)} kcal, cible ${n0(r.kcal)} kcal (${adjTxt(r)}) ; protéines ${r.prot} g, lipides ${r.fat} g, glucides ${r.carbs} g ; eau ${n1(r.water)} L (+${n1(r.waterTrain)} L par séance) ; IMC ${n1(r.bmi)}`);
  }
  const tr = weightTrend(nutri.log);
  const wi = waistInfo(nutri.log);
  if (wi) L.push(`Tour de taille : ${n1(wi.now)} cm${wi.change != null ? ` (${sgn(wi.change)}${n1(Math.abs(wi.change))} cm en ${Math.round(wi.days / 7)} semaines)` : ""}`);
  if (tr) L.push(`Pesées : ${tr.all.length} ; tendance ${n1(tr.now)} kg${tr.rate != null ? `, ${tr.rate >= 0 ? "+" : "−"}${n1(Math.abs(tr.rate))} kg par semaine sur ${tr.span} jours` : ""}${nutri.ajust ? ` ; calories déjà ajustées de ${nutri.ajust > 0 ? "+" : ""}${nutri.ajust} kcal d'après les pesées` : ""}`);
  L.push(`Modifications déjà faites : ${edits.length ? edits.slice(-12).join(" ; ") : "aucune"}`);
  return L.join("\n");
}
function buildTurns(pendingMsg) {
  const msgs = chat.filter(m => m !== pendingMsg && m.content && m.content.trim());
  const picked = [];
  let size = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const c = msgs[i].content;
    if (picked.length >= 16 || size + c.length > 60000) break;
    picked.unshift({ role: msgs[i].role, content: c });
    size += c.length;
  }
  while (picked.length && picked[picked.length - 1].role !== "user") picked.pop();
  return [{ role: "user", content: CERVEAU + "\n\n" + contexte() }, ...picked];
}

/* Outils que le coach peut appeler */
function listPlanNames() { return plan.sessions.map((s, i) => `séance ${i + 1} : ${s.ex.map(x => x.n).join(", ")}`).join(" | "); }
function matchScore(nx, q) {
  if (nx === q) return 1000;
  if (nx.includes(q)) return 500 - (nx.length - q.length);
  if (q.includes(nx)) return 400 + nx.length;
  const qw = q.split(" ").filter(w => w.length > 2);
  if (!qw.length) return 0;
  const r = qw.filter(w => nx.includes(w)).length / qw.length;
  return r >= 0.6 ? Math.round(r * 100) : 0;
}
function findInPlan(name, seance) {
  const q = norm(name);
  if (!q) return [];
  const hits = [];
  plan.sessions.forEach((s, i) => { if (seance && i !== seance - 1) return; s.ex.forEach((x, j) => { const sc = matchScore(norm(x.n), q); if (sc) hits.push({ i, j, sc }); }); });
  const best = Math.max(0, ...hits.map(h => h.sc));
  return hits.filter(h => h.sc === best);
}
function findInDB(name) {
  const q = norm(name);
  if (!q) return null;
  let best = null, bs = 0;
  for (const e of EX) { const sc = matchScore(norm(e.n), q); if (sc > bs) { bs = sc; best = e; } }
  return bs >= 75 ? best : null;
}
function seanceArg(v) {
  if (v == null || v === "") return null;
  const n = parseInt(v, 10);
  if (!(n >= 1 && n <= plan.sessions.length)) throw new Error(`Séance ${v} inexistante : le programme compte ${plan.sessions.length} séances.`);
  return n;
}
function afterChange() { renderSummary(); renderProgram(); renderMob(); renderNutriOut(); save(); }
function zoneKey(z) { const q = norm(z); if (SYN[q]) return SYN[q]; const k = Object.keys(SYN).find(s => q.includes(s)); return k ? SYN[k] : null; }

function toolSearch(inp) {
  const st = prof();
  const eq = ["gym", "halteres", "pdc"].includes(inp.materiel) ? inp.materiel : st.eq;
  const q = norm(inp.texte || "");
  let list = EX.filter(e => (!inp.schema || e.p === inp.schema) && e.eq.includes(eq));
  if (!inp.tout_afficher) list = list.filter(e => !e.av.some(a => st.pain.includes(a)) && (e.lv || 0) <= LV[st.level]);
  if (q) list = list.filter(e => { const hay = norm(`${e.n} ${e.m.map(k => MUS[k]).join(" ")} ${PATTERN[e.p]}`); return hay.includes(q) || q.split(" ").every(w => hay.includes(w)); });
  return {
    materiel: LABEL.eq[eq], zones_menagees: st.pain.map(z => ZONES[z]), total: list.length,
    resultats: list.slice(0, 15).map(e => ({ nom: e.n, schema: e.p, materiel: e.eq.map(x => LABEL.eq[x]), muscles: e.m.map(k => MUS[k]), a_eviter_si: e.av.map(z => ZONES[z]), niveau: e.lv ? "intermédiaire et plus" : "tous niveaux", deja_dans_le_programme: plan.sessions.some(s => s.ex.some(x => x.id === e.id)) }))
  };
}
function customEx(name, role, base, inp) {
  return { id: null, n: String(name).slice(0, 80), role, sets: base.sets, reps: base.reps, rest: base.rest, rir: base.rir, custom: true, c: String(inp.consignes || "").slice(0, 500), m: musclesFrom(inp.muscles) };
}
function toolReplace(inp) {
  const seance = seanceArg(inp.seance);
  const hits = findInPlan(String(inp.ancien || ""), seance);
  if (!hits.length) throw new Error(`Exercice « ${inp.ancien} » introuvable${seance ? ` dans la séance ${seance}` : ""}. Programme : ${listPlanNames()}`);
  const e = findInDB(String(inp.nouveau || "")), st = prof();
  if (!e && !String(inp.nouveau || "").trim()) throw new Error("Indique le nouvel exercice.");
  const u = pushUndo(), changes = [];
  for (const h of hits) {
    const s = plan.sessions[h.i], x = s.ex[h.j];
    let nx;
    if (e) { nx = mkEx(e, roleOf(e, h.j), st); if (nx.role === x.role) nx.sets = x.sets; }
    else nx = customEx(inp.nouveau, x.role, x, inp);
    changes.push({ seance: h.i + 1, ancien: x.n, nouveau: nx.n });
    s.ex[h.j] = nx;
  }
  let warn = "";
  if (e && e.av.some(a => st.pain.includes(a))) warn = `Cet exercice est déconseillé pour : ${e.av.filter(a => st.pain.includes(a)).map(z => ZONES[z].toLowerCase()).join(", ")}.`;
  else if (e && !e.eq.includes(st.eq)) warn = `Cet exercice demande un matériel que l'utilisateur n'a pas déclaré (${e.eq.map(x => LABEL.eq[x]).join(", ")}).`;
  const resume = changes.map(c => `${c.ancien} → ${c.nouveau} (séance ${c.seance})`).join(" ; ");
  edits.push("Remplacement : " + resume);
  afterChange();
  return { u, resume, out: { ok: true, modifications: changes, hors_base: !e, avertissement: warn || undefined } };
}
function toolDose(inp) {
  const seance = seanceArg(inp.seance);
  const hits = findInPlan(String(inp.exercice || ""), seance);
  if (!hits.length) throw new Error(`Exercice « ${inp.exercice} » introuvable. Programme : ${listPlanNames()}`);
  const u = pushUndo(), ch = [];
  for (const h of hits) {
    const x = plan.sessions[h.i].ex[h.j], before = `${doseTxt(x)}, repos ${x.rest}`;
    const sv = clampInt(inp.series, 1, 10);
    if (sv) x.sets = sv;
    if (inp.repetitions) x.reps = String(inp.repetitions).slice(0, 40);
    if (inp.repos) x.rest = String(inp.repos).slice(0, 30);
    if (inp.rir) x.rir = String(inp.rir).slice(0, 20);
    x.fixed = true;
    ch.push(`${x.n} (séance ${h.i + 1}) : ${before} → ${doseTxt(x)}, repos ${x.rest}`);
  }
  const resume = ch.join(" ; ");
  edits.push("Dosage : " + resume);
  afterChange();
  return { u, resume, out: { ok: true, modifications: ch } };
}
function toolAdd(inp) {
  const si = seanceArg(inp.seance);
  if (!si) throw new Error(`Indique la séance (1 à ${plan.sessions.length}).`);
  const s = plan.sessions[si - 1];
  if (s.ex.length >= 10) throw new Error("Cette séance a déjà 10 exercices : retire-en un d'abord.");
  const e = findInDB(String(inp.exercice || "")), st = prof();
  if (!e && !String(inp.exercice || "").trim()) throw new Error("Indique l'exercice à ajouter.");
  if (e && s.ex.some(x => x.id === e.id)) throw new Error(`${e.n} est déjà dans la séance ${si}.`);
  const pos = inp.position ? clamp(parseInt(inp.position, 10) || s.ex.length + 1, 1, s.ex.length + 1) - 1 : s.ex.length;
  const u = pushUndo();
  const x = e ? mkEx(e, roleOf(e, pos), st) : customEx(inp.exercice, "isolation", { sets: 3, reps: "10 à 15", rest: "60 à 90 s", rir: "1 à 2" }, inp);
  const sv = clampInt(inp.series, 1, 10);
  if (sv) x.sets = sv;
  if (inp.repetitions) x.reps = String(inp.repetitions).slice(0, 40);
  if (inp.repos) x.rest = String(inp.repos).slice(0, 30);
  if (sv || inp.repetitions || inp.repos) x.fixed = true;
  s.ex.splice(pos, 0, x);
  let warn = "";
  if (e && e.av.some(a => st.pain.includes(a))) warn = `Déconseillé pour : ${e.av.filter(a => st.pain.includes(a)).map(z => ZONES[z].toLowerCase()).join(", ")}.`;
  const resume = `${x.n} ajouté en séance ${si} (${doseTxt(x)})`;
  edits.push("Ajout : " + resume);
  afterChange();
  return { u, resume, out: { ok: true, ajoute: resume, position: pos + 1, hors_base: !e, avertissement: warn || undefined } };
}
function toolRemove(inp) {
  const seance = seanceArg(inp.seance);
  const hits = findInPlan(String(inp.exercice || ""), seance);
  if (!hits.length) throw new Error(`Exercice « ${inp.exercice} » introuvable. Programme : ${listPlanNames()}`);
  for (const h of hits) if (plan.sessions[h.i].ex.length <= 1) throw new Error(`La séance ${h.i + 1} doit garder au moins un exercice.`);
  const u = pushUndo(), ch = [];
  hits.sort((a, b) => b.j - a.j).forEach(h => { const s = plan.sessions[h.i]; ch.push(`${s.ex[h.j].n} (séance ${h.i + 1})`); s.ex.splice(h.j, 1); });
  const resume = "Retiré : " + ch.join(", ");
  edits.push(resume);
  afterChange();
  return { u, resume, out: { ok: true, retires: ch } };
}
function toolZone(inp) {
  const key = zoneKey(inp.zone || "");
  if (!key) throw new Error("Zone non gérée. Zones possibles : dos, genoux, épaules, poignets, coudes, hanches.");
  const st = prof(), u = pushUndo(), ch = [];
  if (inp.retirer) st.pain = st.pain.filter(p => p !== key);
  else if (!st.pain.includes(key)) st.pain = [...st.pain, key];
  state.pain = [...st.pain];
  if (!inp.retirer) plan.sessions.forEach((s, i) => s.ex.forEach((x, j) => {
    const e = EXI[x.id];
    if (!e || !e.av.includes(key)) return;
    const used = new Set(s.ex.map(y => y.id));
    const alt = candidates(e.p, st).find(c => !used.has(c.id));
    if (alt) { s.ex[j] = mkEx(alt, roleOf(alt, j), st); ch.push(`${x.n} → ${alt.n} (séance ${i + 1})`); }
    else ch.push(`${x.n} gardé faute d'alternative (séance ${i + 1})`);
  }));
  syncChips();
  const resume = `${inp.retirer ? "Zone retirée" : "Zone ménagée"} : ${ZONES[key].toLowerCase()}${ch.length ? " · " + ch.join(" ; ") : ""}`;
  edits.push(resume);
  afterChange();
  return { u, resume, out: { ok: true, zones_menagees: st.pain.map(z => ZONES[z]), remplacements: ch } };
}
function toolProfile(inp) {
  const st = clone(prof()), changes = [];
  if (inp.objectif && LABEL.goal[inp.objectif]) { st.goal = inp.objectif; changes.push("objectif " + LABEL.goal[st.goal].toLowerCase()); }
  if (inp.niveau && LABEL.level[inp.niveau]) { st.level = inp.niveau; changes.push("niveau " + LABEL.level[st.level].toLowerCase()); }
  const d = clampInt(inp.seances, 2, 6);
  if (d) { st.days = String(d); changes.push(`${d} séances`); }
  if (inp.duree_min != null) { const m = clampNum(inp.duree_min, 10, 180); if (m != null) { const opts = [30, 45, 60, 75]; const best = opts.reduce((a, b) => Math.abs(b - m) < Math.abs(a - m) ? b : a); st.time = Object.keys(MINUTES).find(k => MINUTES[k] === best); changes.push(`${best} min`); } }
  if (inp.materiel && LABEL.eq[inp.materiel]) { st.eq = inp.materiel; changes.push(LABEL.eq[st.eq].toLowerCase()); }
  if (Array.isArray(inp.zones)) { st.pain = [...new Set(inp.zones.map(zoneKey).filter(Boolean))]; changes.push(`zones : ${st.pain.length ? st.pain.map(z => ZONES[z].toLowerCase()).join(", ") : "aucune"}`); }
  if (!changes.length) throw new Error("Aucun changement valide reçu.");
  const u = pushUndo();
  state = clone(st);
  plan = buildPlan(clone(st));
  edits = [`Programme reconstruit (${changes.join(", ")})`];
  syncChips();
  renderAll(); save();
  const resume = `Programme reconstruit : ${changes.join(", ")}`;
  return { u, resume, out: { ok: true, changements: changes, seances: plan.sessions.map((s, i) => ({ seance: i + 1, nom: s.name, exercices: s.ex.map(x => `${x.n} ${doseTxt(x)}`) })) } };
}
function toolNutri(inp) {
  const sexe = /^f/i.test(String(inp.sexe || "")) ? "f" : "h";
  const age = clampInt(inp.age, 14, 90), taille = clampInt(inp.taille_cm, 120, 220), poids = clampNum(inp.poids_kg, 35, 250);
  if (age == null || taille == null || poids == null) throw new Error("Valeurs manquantes ou hors limites (âge 14-90, taille 120-220 cm, poids 35-250 kg).");
  const act = { sedentaire: "sed", plutot_actif: "leger", actif: "actif", tres_actif: "tres" }[inp.activite] || nutri.act;
  const reg = { omnivore: "omni", vegetarien: "vege", vegan: "vegan" }[inp.regime] || nutri.reg;
  const u = pushUndo();
  nutri = { sexe, age, taille, poids, act, reg, example: false };
  renderNutri(); save();
  const r = calcNutri();
  return {
    u, resume: `Profil nutrition : ${sexe === "f" ? "femme" : "homme"}, ${age} ans, ${taille} cm, ${n1(poids)} kg → ${n0(r.kcal)} kcal, ${r.prot} g de protéines`,
    out: { metabolisme_base: Math.round(r.bmr), depense_totale: Math.round(r.tdee), ajustement: Math.round(r.adj), calories_cibles: r.kcal, proteines_g: r.prot, lipides_g: r.fat, glucides_g: r.carbs, eau_l: Math.round(r.water * 10) / 10, eau_par_seance_l: r.waterTrain, imc: Math.round(r.bmi * 10) / 10, rythme: r.rate, plancher_applique: r.floored }
  };
}
function makeTools(msg) {
  const status = s => { msg.status = s; if (!msg.content) updateMsg(msg); };
  const act = (fn, s) => inp => { status(s); const r = fn(inp || {}); msg.actions.push({ txt: r.resume, u: r.u }); updateMsg(msg); return r.out; };
  const seanceP = { type: "integer", description: "Numéro de séance (1 = première)" };
  return [
    { name: "chercher_exercices", description: "Cherche dans la base d'exercices de Fonte. Renvoie jusqu'à 15 exercices {nom, schema, materiel, muscles, a_eviter_si, niveau, deja_dans_le_programme}. Par défaut, seuls les exercices compatibles avec le matériel, les zones sensibles et le niveau de l'utilisateur sont renvoyés. À appeler avant de remplacer ou d'ajouter un exercice.",
      inputSchema: { type: "object", properties: { schema: { type: "string", enum: Object.keys(PATTERN), description: "Famille de mouvement : " + Object.entries(PATTERN).map(([k, v]) => `${k} = ${v}`).join(", ") }, texte: { type: "string", description: "Mot-clé dans le nom ou les muscles (ex. pectoraux, curl, fessiers)" }, materiel: { type: "string", enum: ["gym", "halteres", "pdc"], description: "Par défaut : le matériel de l'utilisateur" }, tout_afficher: { type: "boolean", description: "true pour inclure les exercices déconseillés pour ses zones sensibles ou son niveau" } } },
      execute: inp => { status("Le coach cherche dans la base d'exercices…"); return toolSearch(inp || {}); } },
    { name: "remplacer_exercice", description: "Remplace un exercice du programme par un autre, dans une séance précise ou dans toutes les séances où il apparaît. Le dosage est adapté automatiquement. Renvoie les modifications et un éventuel avertissement.",
      inputSchema: { type: "object", properties: { ancien: { type: "string", description: "Nom de l'exercice actuel, tel qu'il apparaît dans le programme" }, nouveau: { type: "string", description: "Nom exact d'un exercice de la base (de préférence) ou nom libre" }, seance: { type: "integer", description: "Numéro de séance (1 = première). Omettre pour toutes les séances." }, consignes: { type: "string", description: "Consignes techniques, nécessaires si l'exercice est hors base" }, muscles: { type: "array", items: { type: "string" }, description: "Muscles travaillés si hors base (ex. Pectoraux, Triceps)" } }, required: ["ancien", "nouveau"] },
      execute: act(toolReplace, "Le coach modifie ton programme…") },
    { name: "modifier_dosage", description: "Change le nombre de séries, les répétitions, le repos ou le RIR d'un exercice du programme.",
      inputSchema: { type: "object", properties: { exercice: { type: "string" }, seance: { type: "integer", description: "Numéro de séance. Omettre pour toutes les séances où l'exercice apparaît." }, series: { type: "integer", minimum: 1, maximum: 10 }, repetitions: { type: "string", description: "Ex. 8 à 12, ou 30 s" }, repos: { type: "string", description: "Ex. 2 min, 90 s" }, rir: { type: "string", description: "Répétitions en réserve, ex. 1 à 2" } }, required: ["exercice"] },
      execute: act(toolDose, "Le coach ajuste le dosage…") },
    { name: "ajouter_exercice", description: "Ajoute un exercice dans une séance, à une position donnée ou à la fin. Dosage par défaut selon l'objectif si non précisé.",
      inputSchema: { type: "object", properties: { seance: seanceP, exercice: { type: "string", description: "Nom exact d'un exercice de la base (de préférence) ou nom libre" }, position: { type: "integer", description: "Position dans la séance (1 = premier). Omettre pour l'ajouter à la fin." }, series: { type: "integer", minimum: 1, maximum: 10 }, repetitions: { type: "string" }, repos: { type: "string" }, consignes: { type: "string", description: "Consignes si hors base" }, muscles: { type: "array", items: { type: "string" } } }, required: ["seance", "exercice"] },
      execute: act(toolAdd, "Le coach ajoute un exercice…") },
    { name: "retirer_exercice", description: "Retire un exercice d'une séance (ou de toutes les séances où il apparaît si seance est omis).",
      inputSchema: { type: "object", properties: { exercice: { type: "string" }, seance: { type: "integer" } }, required: ["exercice"] },
      execute: act(toolRemove, "Le coach retire un exercice…") },
    { name: "menager_zone", description: "Ajoute (ou retire) une zone sensible : dos, genoux, épaules, poignets, coudes ou hanches. Les exercices à risque pour cette zone sont remplacés par des alternatives compatibles ; l'échauffement et la routine mobilité s'adaptent.",
      inputSchema: { type: "object", properties: { zone: { type: "string", enum: ["dos", "genoux", "epaules", "poignets", "coudes", "hanches"] }, retirer: { type: "boolean", description: "true pour ne plus ménager cette zone" } }, required: ["zone"] },
      execute: act(toolZone, "Le coach adapte ton programme à ta zone sensible…") },
    { name: "calculer_nutrition", description: "Calcule métabolisme de base (Mifflin-St Jeor), dépense totale, calories cibles selon l'objectif, protéines, lipides, glucides et eau. Le résultat s'affiche aussi dans l'onglet Nutrition.",
      inputSchema: { type: "object", properties: { sexe: { type: "string", enum: ["homme", "femme"] }, age: { type: "integer" }, taille_cm: { type: "integer" }, poids_kg: { type: "number" }, activite: { type: "string", enum: ["sedentaire", "plutot_actif", "actif", "tres_actif"], description: "Activité hors séances : sédentaire (<5 000 pas), plutôt actif (5 000-10 000), actif (>10 000, debout), très actif (métier physique)" }, regime: { type: "string", enum: ["omnivore", "vegetarien", "vegan"] } }, required: ["sexe", "age", "taille_cm", "poids_kg", "activite"] },
      execute: act(toolNutri, "Le coach calcule tes besoins…") },
    { name: "changer_profil", description: "Modifie les réponses du questionnaire (objectif, niveau, séances par semaine, durée, matériel, zones) et reconstruit tout le programme. Les modifications précédentes sont perdues : demande confirmation avant si besoin.",
      inputSchema: { type: "object", properties: { objectif: { type: "string", enum: ["muscle", "force", "seche", "forme"] }, niveau: { type: "string", enum: ["deb", "inter", "conf"] }, seances: { type: "integer", minimum: 2, maximum: 6 }, duree_min: { type: "integer", description: "30, 45, 60 ou 75" }, materiel: { type: "string", enum: ["gym", "halteres", "pdc"] }, zones: { type: "array", items: { type: "string", enum: ["dos", "genoux", "epaules", "poignets", "coudes", "hanches"] } } } },
      execute: act(toolProfile, "Le coach reconstruit ton programme…") }
  ];
}

function setBusy(b) {
  busy = b;
  $("#coach-send").disabled = b || coachState !== "ready";
  $("#coach-stop").hidden = !b;
  $("#coach-sugg").hidden = b || coachState !== "ready";
  $("#coach-status").textContent = b ? "Le coach rédige sa réponse…" : "";
}
function coachAsk(text, opts = {}) {
  selectTab("coach");
  if (coachState !== "ready" || needConsent()) { renderCoachShell(); return; }
  ask(text, opts);
}
async function ask(text, opts = {}) {
  if (busy || coachState !== "ready" || !plan || needConsent()) return;
  if (!unlocked && freeUsed >= FREE_Q) { renderLog(); toComposer(); return; }
  const deep = opts.deep != null ? opts.deep : $("#coach-deep").checked;
  chat.push({ role: "user", content: text, display: opts.display });
  const msg = { role: "assistant", content: "", actions: [], pending: true, status: chat.length <= 2 ? "Le coach réfléchit… (la première fois, Claude te demande d'autoriser Fonte)" : "Le coach réfléchit…" };
  chat.push(msg);
  renderLog();
  toComposer();
  setBusy(true);
  ctl = new AbortController();
  const options = { signal: ctl.signal, cache: false, modelTier: deep ? "complex" : "default",
    onText: ({ text: t }) => { const follow = nearBottom(); msg.content = t; msg.pending = false; updateMsg(msg); if (follow) toComposer(); } };
  if (toolsOK) options.tools = makeTools(msg).slice(0, maxTools || 8);
  try {
    const res = await sample(buildTurns(msg), options);
    msg.content = res.text;
    if (res.truncated) msg.note = "Réponse coupée : demande une partie à la fois.";
    if (!unlocked) freeUsed = res.left != null ? Math.max(freeUsed, FREE_Q - res.left) : freeUsed + 1;
  } catch (e) {
    handleErr(e, msg, text, opts);
  } finally {
    msg.pending = false;
    delete msg.status;
    ctl = null;
    setBusy(false);
    renderLog();
    renderSugg(); renderQuota(); save();
  }
}
function handleErr(e, msg, text, opts) {
  const code = (e && e.code) || "upstream_error";
  const retry = { text, opts };
  if (code === "cancelled") { msg.content = e.text || msg.content || ""; msg.note = "Réponse arrêtée."; }
  else if (["not_granted", "not_declared", "capability_disabled", "capability_removed"].includes(code)) { chat.splice(chat.indexOf(msg) - 1, 2); coachState = "denied"; renderCoachShell(); }
  else if (code === "sampling_disabled") { chat.splice(chat.indexOf(msg) - 1, 2); coachState = "disabled"; renderCoachShell(); }
  else if (code === "tools_unavailable") { toolsOK = false; msg.content = e.text || ""; msg.note = "Le coach ne peut pas modifier le programme dans cette vue. Réessaie : il te dira quoi changer à la main."; msg.retry = retry; }
  else if (code === "rate_limited") { msg.content = e.text || msg.content || ""; msg.note = window.FONTE_PWA ? "Trop de demandes d'un coup : réessaie dans un moment." : "Trop de demandes d'un coup, ou limite d'utilisation de Claude atteinte. Réessaie dans un moment."; msg.retry = retry; }
  else if (code === "quota") { chat.splice(chat.indexOf(msg) - 1, 2); freeUsed = FREE_Q; }
  else if (code === "daily_limit") { msg.content = e.text || ""; msg.note = "Tu as posé beaucoup de questions aujourd'hui : le coach reprend demain."; }
  else if (code === "overloaded") { msg.content = e.text || msg.content || ""; msg.note = "Le coach est très demandé en ce moment. Réessaie dans un instant."; msg.retry = retry; }
  else if (code === "coach_off") { chat.splice(chat.indexOf(msg) - 1, 2); coachState = "absent"; renderCoachShell(); }
  else if (code === "consent_required") { chat.splice(chat.indexOf(msg) - 1, 2); renderCoachShell(); }
  else if (code === "session_expired") { msg.content = e.text || ""; msg.note = "Ta session Claude a expiré : reconnecte-toi, puis réessaie."; msg.retry = retry; }
  else if (code === "refused") { msg.content = ""; msg.note = "Le coach ne peut pas répondre à cette demande. Reformule-la autrement."; }
  else if (code === "empty_completion") { msg.note = "Pas de réponse cette fois. Reformule ou simplifie ta question."; }
  else if (code === "prompt_too_large") { msg.note = "La conversation est devenue trop longue : lance une nouvelle conversation."; }
  else if (["invalid_request", "transform_error", "queue_overflow"].includes(code)) { msg.content = e.text || ""; msg.note = "Erreur technique : la question n'a pas pu être envoyée."; console.warn("Fonte coach:", e); }
  else { msg.content = e.text || msg.content || ""; msg.note = "Réponse interrompue (problème de connexion)."; msg.retry = retry; }
}
$("#coach-form").addEventListener("submit", e => {
  e.preventDefault();
  const box = $("#coach-input"), t = box.value.trim();
  if (!t || busy) return;
  box.value = "";
  ask(t);
});
$("#coach-input").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing && matchMedia("(pointer: fine)").matches) { e.preventDefault(); $("#coach-form").requestSubmit(); }
});
$("#coach-stop").addEventListener("click", () => { if (ctl) ctl.abort(); });
$("#coach-reset").addEventListener("click", () => { if (busy && ctl) ctl.abort(); chat = []; renderLog(); renderSugg(); save(); $("#coach-input").focus(); });

/* ===== Agenda : fichier .ics, une séance par semaine et par jour d'entraînement ===== */
const BYDAY = { Lun: "MO", Mar: "TU", Mer: "WE", Jeu: "TH", Ven: "FR", Sam: "SA", Dim: "SU" };
const JS_DAY = { Dim: 0, Lun: 1, Mar: 2, Mer: 3, Jeu: 4, Ven: 5, Sam: 6 };
const icsText = v => String(v).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
function icsFold(line) {
  const out = [];
  let cur = "", size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > 73) { out.push(cur); cur = " "; size = 1; }
    cur += ch; size += n;
  }
  out.push(cur);
  return out.join("\r\n");
}
function buildICS(hour) {
  const st = prof(), pad = n => String(n).padStart(2, "0"), now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fonte//Programme//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Fonte"];
  plan.sessions.forEach((s, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + ((JS_DAY[s.day] - d.getDay() + 7) % 7 || (now.getHours() >= hour ? 7 : 0)));
    const start = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hour)}0000`;
    const details = unlocked || i === 0 ? s.ex.map(x => `${x.n} : ${doseTxt(x)}`).join("\n") : "Détail des exercices dans la version complète.";
    L.push("BEGIN:VEVENT", `UID:fonte-${i}-${stamp}@fonte`, `DTSTAMP:${stamp}`, `DTSTART:${start}`, `DURATION:PT${MINUTES[st.time] || 45}M`, `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[s.day]}`,
      `SUMMARY:${icsText(`Fonte · Séance ${i + 1} : ${s.name}`)}`, `DESCRIPTION:${icsText(`${details}\n\nOuvre Fonte pour démarrer ta séance.`)}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT30M", `DESCRIPTION:${icsText(`Séance ${i + 1} dans 30 minutes`)}`, "END:VALARM", "END:VEVENT");
  });
  L.push("END:VCALENDAR");
  return L.map(icsFold).join("\r\n") + "\r\n";
}
async function exportICS() {
  if (!downloads) { toast("Le téléchargement n'est pas disponible dans cette vue."); return; }
  const hour = +($("#ics-h") ? $("#ics-h").value : 18) || 18;
  try {
    const res = await downloads.save({ filename: "seances-fonte.ics", data: new Blob([buildICS(hour)], { type: "text/calendar;charset=utf-8" }) });
    if (res && res.status === "saved") toast("Fichier agenda enregistré : ouvre-le pour ajouter tes séances.");
  } catch (e) { if (!(e && e.code === "declined")) toast("Le fichier agenda n'a pas pu être créé."); }
}

/* ===== Export PDF ===== */
const JSPDF_URL = window.FONTE_PWA ? "vendor/jspdf.umd.min.js" : "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
function loadJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = JSPDF_URL;
    s.onload = () => (window.jspdf && window.jspdf.jsPDF ? res(window.jspdf.jsPDF) : rej(new Error("jsPDF absent")));
    s.onerror = () => rej(new Error("chargement impossible"));
    document.head.appendChild(s);
  });
}
function pdfClean(s) {
  return String(s).replace(/[’‘]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, "-").replace(/×/g, "x").replace(/…/g, "...")
    .replace(/≈/g, "env. ").replace(/→/g, "->").replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/↓/g, "").replace(/↑/g, "")
    .replace(/œ/g, "oe").replace(/Œ/g, "OE").replace(/[  ]/g, " ").replace(/[^\x00-\xFF]/g, "");
}
function buildPDF(JsPDF) {
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 16, CW = W - 2 * M, st = prof();
  const INK = [24, 32, 42], MUTED = [91, 102, 114], LINE = [213, 218, 214];
  const PL = [[200, 50, 47], [36, 87, 166], [224, 174, 28], [47, 138, 78]];
  let y = M;
  doc.setLineHeightFactor(1.3);
  const need = h => { if (y + h > H - M - 8) { doc.addPage(); y = M; } };
  const txt = (s, o = {}) => {
    const size = o.size || 10, lh = size * 0.3528 * 1.3;
    doc.setFont("helvetica", o.bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(...(o.color || INK));
    const lines = doc.splitTextToSize(pdfClean(s), o.w || CW);
    need(lines.length * lh);
    doc.text(lines, o.x || M, y + size * 0.3528);
    y += lines.length * lh + (o.after || 0);
  };
  const head = (s, color) => {
    need(16); y += 3;
    if (color) { doc.setFillColor(...color); doc.roundedRect(M, y, 2.6, 8, 0.8, 0.8, "F"); }
    txt(s, { size: 14, bold: true, x: color ? M + 5 : M, w: CW - 5, after: 1.5 });
  };
  const rule = () => { doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M, y, W - M, y); y += 2.5; };

  PL.forEach((c, i) => { doc.setFillColor(...c); doc.roundedRect(W - M - 26 + i * 7, M - 1, 4, 12 - i * 2, 0.8, 0.8, "F"); });
  txt("FONTE", { size: 10, bold: true, color: PL[0], after: 1 });
  txt("Ton programme de musculation", { size: 22, bold: true, after: 2 });
  txt(`${LABEL.goal[st.goal]} · ${LABEL.level[st.level]} · ${st.days} séances de ${LABEL.time[st.time]} · ${LABEL.eq[st.eq]}${st.pain.length ? ` · ménage : ${st.pain.map(z => ZONES[z].toLowerCase()).join(", ")}` : ""}`, { size: 10, color: MUTED, after: 1 });
  txt(`Créé le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · ${SPLITNAME[st.days]} · RIR = répétitions gardées en réserve`, { size: 9, color: MUTED, after: 4 });

  plan.sessions.forEach((s, i) => {
    head(`Séance ${i + 1} · ${s.name} — ${DAYFULL[s.day]}`, PL[i % 4]);
    const w = warmup(s);
    txt(`Échauffement : ${w.general} ; ${w.drills.join(" ; ")}${w.ramp ? ` ; ${w.ramp}` : ""}.`, { size: 9, color: MUTED, after: 2 });
    s.ex.forEach((x, j) => {
      const e = EXI[x.id];
      need(16);
      if (j) rule();
      doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...INK);
      doc.text(pdfClean(doseTxt(x)), W - M, y + 3.7, { align: "right" });
      txt(`${j + 1}. ${x.n}`, { size: 10.5, bold: true, w: CW - 48 });
      txt(`Repos ${x.rest}${x.rir && x.rir !== "—" ? ` · RIR ${x.rir}` : ""}`, { size: 9, color: MUTED });
      const cue = e ? `${e.c} Erreur fréquente : ${e.e}` : (x.c || "");
      if (cue) txt(cue, { size: 8.5, color: MUTED, after: 1 });
    });
    y += 2;
  });

  const W4 = st.goal === "force" && st.level === "deb" ? PROG_DEB_FORCE : PROG[st.goal];
  head("Progression sur 4 semaines");
  W4.forEach((w, i) => txt(`Semaine ${i + 1} · ${w[0]} : ${w[1]}`, { size: 9.5, after: 1 }));
  txt("Règle de charge : quand tu atteins le haut de la fourchette sur toutes les séries, ajoute 2,5 à 5 % de charge.", { size: 9.5, after: 1 });
  txt(`Cardio et activité : ${CARDIO[st.goal]}`, { size: 9.5, after: 2 });

  head("Nutrition");
  if (nutri.example || validNutri(nutri)) txt("Renseigne ton profil dans l'onglet Nutrition de Fonte pour obtenir tes calories et tes macros.", { size: 9.5, after: 2 });
  else {
    const r = calcNutri();
    txt(`${n0(r.kcal)} kcal par jour (dépense estimée ${n0(r.tdee)} kcal, ${adjTxt(r)}).`, { size: 10.5, bold: true, after: 1 });
    txt(`Protéines ${r.prot} g · Lipides ${r.fat} g · Glucides ${r.carbs} g · Eau ${n1(r.water)} L (+${n1(r.waterTrain)} L les jours de séance). ${r.rate}`, { size: 9.5, after: 1 });
    txt("Créatine monohydrate 3 à 5 g par jour. Protéines réparties sur 3 à 5 repas. Ajuste de 150 kcal après 2 semaines selon ta moyenne de poids.", { size: 9.5, after: 2 });
  }

  head("Mobilité quotidienne · 10 min");
  [...MOB, ...st.pain.flatMap(z => MOBZ[z])].forEach(d => txt(`${d.n} (${d.d}) : ${d.c}`, { size: 9, after: 0.8 }));
  head("Récupération");
  RECUP.forEach(([t, d]) => txt(`${t} : ${d}`, { size: 9, after: 0.8 }));
  y += 3;
  txt("Ce programme est un cadre général et ne remplace pas l'avis d'un professionnel de santé ou d'un coach diplômé. Douleur thoracique, malaise ou douleur intense : 15 ou 112.", { size: 8, color: MUTED });

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text(`Fonte · page ${p} / ${pages}`, W - M, H - 8, { align: "right" });
  }
  return doc.output("blob");
}
async function exportPDF() {
  if (!unlocked) { toast("L'export PDF fait partie de la version complète."); const u = document.querySelector("#panel-prog .paywall .unlock"); if (u) u.scrollIntoView({ block: "center", behavior: reduceMotion() ? "auto" : "smooth" }); return; }
  if (!downloads) { toast("Le téléchargement n'est pas disponible dans cette vue."); return; }
  const btn = $("#pdf-btn");
  btn.disabled = true; btn.textContent = "Préparation du PDF…";
  try {
    const JsPDF = await loadJsPDF();
    const res = await downloads.save({ filename: "programme-fonte.pdf", data: buildPDF(JsPDF) });
    if (res && res.status === "saved") toast("PDF enregistré.");
  } catch (e) {
    const code = e && e.code;
    if (code === "declined") { /* refus du visiteur */ }
    else if (["unavailable", "not_granted", "capability_disabled", "capability_removed"].includes(code)) { downloads = null; updatePdf(); toast("Le téléchargement n'est pas disponible dans cette vue."); }
    else if (code === "rate_limited") toast("Une demande de téléchargement est déjà ouverte.");
    else toast("Le PDF n'a pas pu être créé. Réessaie dans un instant.");
  } finally {
    const b = $("#pdf-btn");
    if (b) { b.disabled = false; b.textContent = "Télécharger le PDF"; }
  }
}

/* ===== Démarrage ===== */
function start(d) {
  const saved = d && d.v === 2 ? d : loadSaved();
  if (saved) {
    if (saved.state) state = { ...state, ...saved.state };
    plan = saved.plan && Array.isArray(saved.plan.sessions) && saved.plan.from ? saved.plan : null;
    unlocked = !!saved.unlocked;
    if (saved.nutri) nutri = { ...nutri, ...saved.nutri };
    chat = Array.isArray(saved.chat) ? saved.chat.filter(m => m && !m.pending && (m.content || m.role === "user")) : [];
    freeUsed = saved.freeUsed || 0;
    edits = Array.isArray(saved.edits) ? saved.edits : [];
    tab = TABS.includes(saved.tab) ? saved.tab : "prog";
  }
  if (PAY()) unlocked = window.FONTE_PWA.has("fonte");
  syncChips();
  if (plan) { renderAll(); $("#result").hidden = false; selectTab(tab); }
  pullSuivi();
  initRuntime();
}
function syncAccess() {
  if (!PAY()) return;
  const was = unlocked;
  unlocked = window.FONTE_PWA.has("fonte");
  if (unlocked !== was) { if (plan) renderAll(); save(); }
}
addEventListener("fonte:config", syncAccess);
addEventListener("fonte:accord", () => { renderCoachShell(); renderSugg(); if (!needConsent() && tab === "coach") { const i = $("#coach-input"); if (i) i.focus(); } });
addEventListener("fonte:acces", e => {
  syncAccess();
  const d = e.detail || {};
  if (d.nouveau === "fonte") {
    toast("Merci ! Fonte est débloqué : programme complet et coach illimité. Ton code d'accès est dans Offre.");
    const r = $("#result");
    if (plan && r && !r.hidden) r.scrollIntoView({ block: "start" });
  }
  else if (d.annule) toast("Paiement annulé : rien n'a été débité.");
  else if (d.attente) toast("Paiement en cours de validation : Fonte se débloquera tout seul dès qu'il sera confirmé.");
  else if (d.erreur) toast("Paiement reçu ? On n'a pas pu le vérifier (connexion). Nouvel essai à la prochaine ouverture.");
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pullSuivi(); });
const hot = window.claude && window.claude.hot;
if (hot && typeof hot.snapshot === "function") hot.snapshot(() => snapshot());
if (hot && typeof hot.ready === "function") hot.ready(start); else start(hot ? hot.data : null);
