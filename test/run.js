const { chromium } = require("/opt/node-tools/node_modules/playwright");
const fs = require("fs");
const path = require("path");
const DIR = __dirname;
const PAGE = "file://" + path.join(DIR, "page.html");
const JSPDF = fs.readFileSync(path.join(DIR, "node_modules/jspdf/dist/jspdf.umd.min.js"), "utf8");

// Faux runtime Claude : sample (avec appels d'outils) + downloads
const MOCK = `
(() => {
  window.__calls = []; window.__saved = null;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function sample(input, opts = {}) {
    const turns = Array.isArray(input) ? input : [{ role: "user", content: input }];
    const last = turns[turns.length - 1].content;
    window.__calls.push({ bytes: JSON.stringify(turns).length, first: turns[0].content.slice(0, 40), hasBrain: turns[0].content.includes("COACH FONTE"), hasCtx: turns[0].content.includes("Programme actuel"), last, tier: opts.modelTier, tools: (opts.tools || []).map(t => t.name), cache: opts.cache });
    let out = "";
    if (/Remplace/i.test(last) && opts.tools) {
      const t = n => opts.tools.find(x => x.name === n);
      const found = await t("chercher_exercices").execute({ schema: "squat" }, { signal: new AbortController().signal });
      window.__search = found;
      const ctxLine = turns[0].content.split("\\n").find(l => /^  1\\. /.test(l)) || "";
      const ancien = ctxLine.replace(/^  1\\. /, "").split(" — ")[0];
      window.__replaced = await t("remplacer_exercice").execute({ ancien, nouveau: "Presse à cuisses", seance: 1 }, { signal: new AbortController().signal });
      out = "C'est fait : **" + ancien + "** devient **Presse à cuisses** en séance 1.\\n\\n- Moins de stress pour le bas du dos\\n- Même travail des quadriceps\\n\\n| Repas | Protéines |\\n|---|---|\\n| Midi | 40 g |";
    } else if (/genou/i.test(last) && opts.tools) {
      window.__zone = await opts.tools.find(x => x.name === "menager_zone").execute({ zone: "genoux" }, { signal: new AbortController().signal });
      out = "J'ai ménagé tes **genoux**.";
    } else if (/nutrition/i.test(last) && opts.tools) {
      window.__nutri = await opts.tools.find(x => x.name === "calculer_nutrition").execute({ sexe: "femme", age: 28, taille_cm: 165, poids_kg: 62, activite: "sedentaire", regime: "vegetarien" }, { signal: new AbortController().signal });
      out = "Calcul fait.";
    } else if (/erreur/i.test(last)) {
      await sleep(50);
      throw { code: "rate_limited", message: "trop", text: "Début de réponse" };
    } else {
      out = "### Réponse\\nVoici une réponse **courte** avec une liste :\\n1. Premier point\\n2. Deuxième point";
    }
    let acc = "";
    for (const part of out.match(/.{1,25}/gs)) { await sleep(10); acc += part; opts.onText && opts.onText({ text: acc, delta: part }); }
    return { text: acc, truncated: false, modelTierApplied: opts.modelTier || "default" };
  }
  sample.limits = async () => ({ maxPromptBytes: 262144, tools: { maxCount: 8 } });
  sample.json = async () => ({});
  const downloads = { save: async ({ filename, data }) => { window.__saved = { filename, size: data.size, type: data.type }; return { status: "saved" }; } };
  window.claude = { use: async name => (name === "sample" ? sample : name === "downloads" ? downloads : null) };
})();`;

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" }).catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const page = await ctx.newPage();
  page.on("console", m => { if (m.type() === "error" || m.type() === "warning") errors.push(m.type() + ": " + m.text()); });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  await page.route("https://cdnjs.cloudflare.com/**", r => r.fulfill({ status: 200, contentType: "application/javascript", body: JSPDF }));
  await page.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("https://fonts.gstatic.com/**", r => r.abort());
  await page.addInitScript(MOCK);
  await page.goto(PAGE);
  const R = {};
  const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL" + (extra ? " " + JSON.stringify(extra) : ""); };

  // 1. Combinaisons : aucune exception, pas de doublon, au moins 3 exercices
  R.combos = await page.evaluate(() => {
    const goals = ["muscle", "force", "seche", "forme"], levels = ["deb", "inter", "conf"], eqs = ["gym", "halteres", "pdc"], days = ["2", "3", "4", "5", "6"], times = ["3", "4", "5", "6"];
    const pains = [[], ["dos"], ["genoux"], ["epaules"], ["poignets", "coudes"], ["dos", "genoux", "epaules", "poignets", "coudes", "hanches"]];
    let n = 0; const bad = [];
    for (const goal of goals) for (const level of levels) for (const eq of eqs) for (const d of days) for (const time of times) for (const pain of pains) {
      const st = { goal, level, days: d, time, eq, pain };
      const p = buildPlan(st); n++;
      p.sessions.forEach((s, i) => {
        const ids = s.ex.map(x => x.id);
        if (new Set(ids).size !== ids.length) bad.push(["dup", st, i, ids]);
        if (s.ex.length < 3) bad.push(["short", JSON.stringify(st), i, ids]);
        s.ex.forEach(x => { const e = EXI[x.id]; if (!e.eq.includes(eq)) bad.push(["eq", st, x.id]); if (e.av.some(a => pain.includes(a))) bad.push(["pain", st, x.id]); if ((e.lv || 0) > LV[level]) bad.push(["lv", st, x.id]); });
      });
    }
    return { plans: n, problems: bad.length, sample: bad.slice(0, 6) };
  });

  // 1b. Calculs : nutrition de l'exemple et durée via l'outil de profil
  R.calc = await page.evaluate(() => {
    state = { goal: "muscle", level: "deb", days: "3", time: "4", eq: "gym", pain: [] };
    plan = buildPlan(clone(state));
    const r = calcNutri();
    const before = plan.from.time;
    const t = toolProfile({ duree_min: 45, seances: 4 });
    const out = { kcal: r.kcal, tdee: Math.round(r.tdee), bmr: r.bmr, timeAfter: plan.from.time, days: plan.from.days, before };
    plan = null; state = { goal: "muscle", level: "deb", days: "3", time: "4", eq: "gym", pain: [] }; syncChips();
    return out;
  });
  check("calcul_nutrition", R.calc.kcal === 2750 && R.calc.tdee === 2458 && R.calc.timeAfter === "4" && R.calc.days === "4", R.calc);

  // 2. Création du programme
  await page.click("#go");
  await page.waitForSelector("#result:not([hidden])");
  const prog = await page.evaluate(() => ({ sessions: document.querySelectorAll("#panel-prog .day").length, locked: document.querySelectorAll("#panel-prog .day.locked").length, firstEx: [...document.querySelectorAll("#panel-prog .day:first-of-type .exn")].map(e => e.textContent), paywall: !!document.querySelector("#panel-prog .paywall"), vol: document.querySelectorAll(".vrow").length }));
  check("programme", prog.sessions === 3 && prog.locked === 2 && prog.firstEx.length === 4 && prog.paywall && prog.vol === 9, prog);
  R.firstSession = prog.firstEx;
  await page.screenshot({ path: path.join(DIR, "desk-prog.png"), fullPage: false });

  // 3. Détails + remplacement manuel + annulation par toast
  await page.click("#panel-prog .day:first-of-type .more");
  const before = await page.textContent("#panel-prog .day:first-of-type .exn");
  await page.click("#panel-prog .day:first-of-type [data-act=swap]");
  const after = await page.textContent("#panel-prog .day:first-of-type .exn");
  const toastVisible = await page.isVisible("#toast");
  await page.click("#toast-undo");
  const undone = await page.textContent("#panel-prog .day:first-of-type .exn");
  check("remplacement_manuel", before !== after && toastVisible && undone === before, { before, after, undone });

  // 4. Coach : outils de remplacement
  await page.click("#tab-coach");
  await page.waitForSelector("#coach-form:not([hidden])");
  const suggCount = await page.$$eval("#coach-sugg button", b => b.length);
  await page.fill("#coach-input", "Remplace le premier exercice de la séance 1");
  await page.click("#coach-send");
  await page.waitForFunction(() => !document.querySelector("#coach-stop") || document.querySelector("#coach-stop").hidden);
  await page.waitForTimeout(200);
  const c1 = await page.evaluate(() => ({ call: window.__calls[0], replaced: window.__replaced, search: window.__search && window.__search.resultats.length, html: document.querySelector("#coach-log .msg.a:last-of-type .txt") ? document.querySelector("#coach-log .msg.a:last-of-type .txt").innerHTML : "", action: !!document.querySelector("#coach-log .action"), first: plan.sessions[0].ex[0].n, quota: document.querySelector("#coach-quota").textContent }));
  check("coach_outils", c1.call.hasBrain && c1.call.hasCtx && c1.call.tools.length === 8 && c1.call.cache === false && c1.replaced && c1.replaced.ok && c1.first === "Presse à cuisses" && c1.action, { call: c1.call && { ...c1.call, last: undefined }, replaced: c1.replaced, first: c1.first });
  check("markdown", /<strong>Presse à cuisses<\/strong>/.test(c1.html) && /<ul>/.test(c1.html) && /<table>/.test(c1.html), c1.html.slice(0, 300));
  R.promptKB = Math.round(c1.call.bytes / 1024);
  R.quotaAfter1 = c1.quota;
  R.suggestions = suggCount;
  await page.screenshot({ path: path.join(DIR, "desk-coach.png"), fullPage: false });

  // 5. Annuler l'action du coach
  await page.click("#coach-log .action [data-act=undo]");
  const afterUndo = await page.evaluate(() => ({ first: plan.sessions[0].ex[0].n, undone: !!document.querySelector("#coach-log .action.undone") }));
  check("annuler_action_coach", afterUndo.first === R.firstSession[0] && afterUndo.undone, afterUndo);

  // 6. Erreur rate_limited : partiel gardé + bouton Réessayer, pas de décompte
  await page.fill("#coach-input", "Provoque une erreur");
  await page.click("#coach-send");
  await page.waitForSelector("#coach-log [data-act=retry]");
  const err = await page.evaluate(() => ({ note: document.querySelector("#coach-log .note").textContent, quota: document.querySelector("#coach-quota").textContent }));
  check("erreur_geree", /Réessaie/.test(err.note) && err.quota === R.quotaAfter1, err);

  // 7. Zone sensible via le coach puis quota épuisé
  await page.fill("#coach-input", "J'ai mal au genou");
  await page.click("#coach-send");
  await page.waitForFunction(() => document.querySelector("#coach-stop").hidden);
  const z = await page.evaluate(() => ({ zone: window.__zone, pain: plan.from.pain, chip: document.querySelector('#f [data-v="genoux"]').getAttribute("aria-pressed"), badEx: plan.sessions.flatMap(s => s.ex).filter(x => EXI[x.id] && EXI[x.id].av.includes("genoux")).map(x => x.n) }));
  check("zone_genoux", z.zone && z.pain.includes("genoux") && z.chip === "true" && z.badEx.length === 0, z);
  await page.fill("#coach-input", "Une question de plus");
  await page.click("#coach-send");
  await page.waitForFunction(() => document.querySelector("#coach-stop").hidden);
  const wall = await page.evaluate(() => ({ quota: document.querySelector("#coach-quota").textContent, wall: !!document.querySelector("#coach-log .paywall"), calls: window.__calls.length }));
  await page.fill("#coach-input", "Encore une ?");
  await page.click("#coach-send");
  await page.waitForTimeout(150);
  const callsAfter = await page.evaluate(() => window.__calls.length);
  check("quota_gratuit", wall.wall && callsAfter === wall.calls, { wall, callsAfter });

  // 8. Déblocage + analyse (niveau complexe) + nutrition via outil
  await page.click("#coach-log .paywall .unlock");
  await page.click("#tab-coach");
  await page.click('#coach-sugg button[data-i="0"]');
  await page.waitForFunction(() => document.querySelector("#coach-stop").hidden);
  const an = await page.evaluate(() => window.__calls[window.__calls.length - 1]);
  check("analyse_complexe", an.tier === "complex" && /analyse complète/.test(an.last), { tier: an.tier });
  await page.fill("#coach-input", "Calcule ma nutrition");
  await page.click("#coach-send");
  await page.waitForFunction(() => document.querySelector("#coach-stop").hidden);
  const nu = await page.evaluate(() => ({ r: window.__nutri, ex: nutri.example, sexe: nutri.sexe }));
  check("outil_nutrition", nu.r && nu.r.calories_cibles > 1200 && nu.r.proteines_g > 100 && nu.ex === false && nu.sexe === "f", nu);

  // 9. Programme débloqué + PDF
  await page.click("#tab-prog");
  const unl = await page.evaluate(() => ({ locked: document.querySelectorAll("#panel-prog .day.locked").length, gates: document.querySelectorAll("#panel-prog .gate.locked").length }));
  await page.click("#pdf-btn");
  await page.waitForFunction(() => window.__saved, null, { timeout: 15000 }).catch(() => {});
  const saved = await page.evaluate(() => window.__saved);
  check("deblocage", unl.locked === 0 && unl.gates === 0, unl);
  check("pdf", saved && saved.filename === "programme-fonte.pdf" && saved.size > 8000, saved);
  R.pdfKB = saved ? Math.round(saved.size / 1024) : 0;

  // 10. Nutrition manuelle
  await page.click("#tab-nutri");
  await page.fill("#n-poids", "80");
  const kcal1 = await page.textContent("#n-out .big");
  await page.fill("#n-poids", "");
  const msg = await page.textContent("#n-out");
  await page.fill("#n-poids", "62");
  check("nutrition_saisie", /kcal/.test(kcal1) && /poids entre 35 et 250/.test(msg), { kcal1, msg: msg.slice(0, 80) });
  await page.screenshot({ path: path.join(DIR, "desk-nutri.png"), fullPage: false });

  // 11. Mobilité : cohérence cardiaque
  await page.click("#tab-mob");
  await page.click("#breath-go");
  await page.waitForTimeout(1200);
  const cue = await page.textContent("#breath-cue");
  await page.click("#breath-go");
  check("respiration", cue === "Inspire", { cue });

  // 12. Persistance : rechargement
  await page.reload();
  await page.waitForSelector("#result:not([hidden])");
  const persisted = await page.evaluate(() => ({ unlocked, chat: chat.length, pain: plan.from.pain, tab }));
  check("persistance", persisted.unlocked && persisted.chat > 3 && persisted.pain.includes("genoux"), persisted);

  // 13. Téléphone, thème sombre
  const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark", deviceScaleFactor: 2 });
  const p2 = await ph.newPage();
  p2.on("pageerror", e => errors.push("phone pageerror: " + e.message));
  await p2.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await p2.route("https://fonts.gstatic.com/**", r => r.abort());
  await p2.goto(PAGE);
  await p2.screenshot({ path: path.join(DIR, "phone-hero.png") });
  await p2.click("#go");
  await p2.waitForSelector("#result:not([hidden])");
  await p2.waitForTimeout(600);
  const overflow = await p2.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check("pas_de_debordement_mobile", overflow.sw <= overflow.cw, overflow);
  const geo = await p2.evaluate(() => {
    const track = document.querySelector(".vrow .vtrack").getBoundingClientRect();
    const ticks = [...document.querySelectorAll(".vaxis div span")].map(t => t.getBoundingClientRect());
    const tabs = [...document.querySelectorAll(".tabs button")].map(b => b.getBoundingClientRect());
    return { trackL: Math.round(track.left), trackR: Math.round(track.right), firstTick: Math.round(ticks[0].left + ticks[0].width / 2), lastTick: Math.round(ticks[ticks.length - 1].left + ticks[ticks.length - 1].width / 2), lastTabR: Math.round(tabs[3].right), vw: document.documentElement.clientWidth };
  });
  check("graduations_alignees", Math.abs(geo.firstTick - geo.trackL) <= 2 && geo.lastTick <= geo.trackR + 2, geo);
  check("onglets_visibles_mobile", geo.lastTabR <= geo.vw, geo);
  await p2.evaluate(() => document.querySelector(".vol").scrollIntoView({ block: "center" }));
  await p2.screenshot({ path: path.join(DIR, "phone-volume.png") });
  await p2.evaluate(() => document.querySelector("#tab-prog").scrollIntoView());
  await p2.screenshot({ path: path.join(DIR, "phone-prog.png") });
  await p2.click("#tab-coach");
  await p2.waitForTimeout(11500);
  const off = await p2.evaluate(() => ({ off: !document.querySelector("#coach-off").hidden, txt: document.querySelector("#coach-off").textContent.slice(0, 60), form: document.querySelector("#coach-form").hidden }));
  check("coach_absent_gere", off.off && off.form, off);
  await p2.screenshot({ path: path.join(DIR, "phone-coach-off.png") });
  await p2.click("#tab-nutri");
  await p2.screenshot({ path: path.join(DIR, "phone-nutri.png"), fullPage: true });

  R.errors = errors;
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
})().catch(e => { console.error("TEST CRASH", e); process.exit(1); });
