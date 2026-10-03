const { chromium } = require("/opt/node-tools/node_modules/playwright");
const path = require("path");
const DIR = __dirname;
const PAGE = "file://" + path.join(DIR, "suivi-page.html");

const MOCK = `
(() => {
  const KEY = "__mockdb";
  let raw = {}; try { raw = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
  const store = new Map(Object.entries(raw));
  const persist = () => localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(store)));
  const listeners = [];
  window.__store = store;
  const snapDoc = p => { const d = store.get(p); return { id: p.split("/").pop(), exists: d !== undefined, data: () => d === undefined ? undefined : JSON.parse(JSON.stringify(d)), metadata: { fromCache: false, hasPendingWrites: false } }; };
  const inColl = (c, p) => p.startsWith(c + "/") && !p.slice(c.length + 1).includes("/");
  const runQuery = l => { let docs = [...store.keys()].filter(p => inColl(l.path, p)).map(snapDoc); if (l.field) docs.sort((a, b) => { const x = a.data()[l.field], y = b.data()[l.field]; return (x < y ? -1 : x > y ? 1 : 0) * (l.dir === "desc" ? -1 : 1); }); if (l.n) docs = docs.slice(0, l.n); return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } }; };
  const notify = () => setTimeout(() => listeners.slice().forEach(l => l.next(l.kind === "doc" ? snapDoc(l.path) : runQuery(l))), 0);
  const parity = (p, even) => { if ((p.split("/").length % 2 === 0) !== even) throw new TypeError("parity " + p); };
  const docRef = p => { parity(p, true); return { id: p.split("/").pop(), path: p,
    get: async () => snapDoc(p),
    set: async d => { if (window.__failWrites) throw { code: "invalid_argument", message: "denied" }; store.set(p, JSON.parse(JSON.stringify(d))); persist(); notify(); },
    update: async d => { store.set(p, { ...store.get(p), ...d }); persist(); notify(); },
    delete: async () => { if (window.__failWrites) throw { code: "invalid_argument", message: "denied" }; store.delete(p); persist(); notify(); },
    onSnapshot: (next) => { const l = { kind: "doc", path: p, next }; listeners.push(l); setTimeout(() => next(snapDoc(p)), 0); return () => { const i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); }; },
    collection: sub => collRef(p + "/" + sub) }; };
  const query = (p, field, dir, n) => ({ orderBy: (f, d) => query(p, f, d || "asc", n), limit: k => query(p, field, dir, k), where: () => query(p, field, dir, n), get: async () => runQuery({ path: p, field, dir, n }),
    onSnapshot: (next) => { const l = { kind: "query", path: p, field, dir, n, next }; listeners.push(l); setTimeout(() => next(runQuery(l)), 0); return () => { const i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); }; } });
  const collRef = p => { parity(p, false); return Object.assign(query(p), { path: p, doc: id => docRef(p + "/" + (id || Math.random().toString(36).slice(2))) }); };
  const db = { doc: docRef, collection: collRef };
  const user = { id: async () => "u_test", isOwner: async () => true, canEdit: async () => true, can: async () => true };
  async function sample(input, opts = {}) { window.__aiPrompt = String(input); window.__aiOpts = { cache: opts.cache }; const out = "### Ce qui progresse\\nTon **squat** monte bien.\\n- Point 1\\n- Point 2\\n\\nTa priorité : dormir 8 h."; let acc = ""; for (const part of out.match(/.{1,20}/gs)) { await new Promise(r => setTimeout(r, 5)); acc += part; opts.onText && opts.onText({ text: acc, delta: part }); } return { text: acc, truncated: false, modelTierApplied: "default" }; }
  sample.limits = async () => ({ maxPromptBytes: 262144 });
  const downloads = { save: async ({ filename, data }) => { window.__saved = { filename, data: typeof data === "string" ? data : "[blob]" }; return { status: "saved" }; } };
  window.claude = { use: async n => ({ db, user, sample, downloads })[n] || null };
})();`;

function code(obj) { return "F1" + Buffer.from(JSON.stringify(obj), "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const R = {};
  const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra ?? null).slice(0, 600); };
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("https://fonts.gstatic.com/**", r => r.abort());
  await page.addInitScript(MOCK);
  await page.goto(PAGE);
  await page.waitForSelector("[data-act=start]");
  R.home = await page.evaluate(() => ({ store: storeMode, sessions: document.querySelectorAll(".sess").length, sync: document.querySelector("#v-seance").textContent.includes("synchronisées") }));
  check("accueil_db", R.home.store === "db" && R.home.sessions === 3 && R.home.sync, R.home);

  // Séance 1 : 40 kg × 10 sur le premier exercice, 30 kg × 12 sur une série du deuxième
  await page.click('[data-act=start][data-si="0"]');
  await page.waitForSelector(".livehead");
  const n1 = await page.$$eval("#ex-0 .srow:not(.h)", r => r.length);
  for (let j = 0; j < n1; j++) {
    await page.fill(`#ex-0 .srow[data-j="${j}"] [data-f=w]`, "40");
    await page.fill(`#ex-0 .srow[data-j="${j}"] [data-f=r]`, "10");
    await page.click(`#ex-0 .srow[data-j="${j}"] .chk`);
  }
  const restShown = await page.isVisible("#rest");
  await page.fill('#ex-1 .srow[data-j="0"] [data-f=w]', "30");
  await page.fill('#ex-1 .srow[data-j="0"] [data-f=r]', "12");
  await page.press('#ex-1 .srow[data-j="0"] [data-f=r]', "Enter");
  const count = await page.textContent("#live-count");
  check("saisie_series", restShown && count.startsWith(`${n1 + 1} /`), { restShown, count });
  await page.click("[data-act=finish]");
  await page.waitForSelector("[data-act=save-workout]");
  await page.click("[data-act=save-workout]");
  await page.waitForTimeout(100);
  const st1 = await page.evaluate(() => ({ docs: [...window.__store.keys()].filter(k => k.includes("/log/workouts/")).length, active, workouts: workouts.length }));
  check("enregistrement_db", st1.docs === 1 && st1.active === null && st1.workouts === 1, st1);

  // Séance 2 : même séance, 42,5 kg × 10 → record
  await page.click('[data-act=start][data-si="0"]');
  await page.waitForSelector(".livehead");
  const ph = await page.evaluate(() => ({ pw: document.querySelector('#ex-0 .srow[data-j="0"] [data-f=w]').placeholder, prev: document.querySelector('#ex-0 .srow[data-j="0"] .prev').textContent, tipLocked: !!document.querySelector("#ex-0 .tip-line.locked") }));
  check("precedent_et_placeholder", ph.pw === "40" && /40 × 10/.test(ph.prev) && ph.tipLocked, ph);
  for (let j = 0; j < n1; j++) {
    await page.fill(`#ex-0 .srow[data-j="${j}"] [data-f=w]`, "42,5");
    await page.fill(`#ex-0 .srow[data-j="${j}"] [data-f=r]`, "10");
    await page.click(`#ex-0 .srow[data-j="${j}"] .chk`);
  }
  await page.click("[data-act=rest-plus]");
  await page.click("[data-act=rest-skip]");
  await page.click("[data-act=finish]");
  await page.waitForSelector("[data-act=save-workout]");
  const sumTxt = await page.textContent("#sheet-box");
  await page.click("[data-act=save-workout]");
  await page.waitForTimeout(100);
  check("record_detecte", /record battu/.test(sumTxt) && /42,5 kg × 10/.test(sumTxt), sumTxt.slice(0, 300));

  // Historique et détail
  await page.click('.nav [data-view=historique]');
  const hist = await page.$$eval(".wk-item", b => b.length);
  await page.click(".wk-item");
  const det = await page.textContent("#v-historique");
  await page.click("[data-act=back]");
  check("historique", hist === 2 && /42,5 kg × 10/.test(det), { hist });

  // Progrès en gratuit (verrouillé), puis Premium
  await page.click('.nav [data-view=progres]');
  const free = await page.evaluate(() => ({ gate: !!document.querySelector("#v-progres .gate.locked"), weeks: !!document.querySelector("#ch-weeks svg") }));
  await page.click('.nav [data-view=offre]');
  await page.click("[data-act=plan-pro]");
  const badge = await page.textContent("#plan-badge");
  await page.click('.nav [data-view=progres]');
  await page.waitForSelector("#ch-e1rm svg");
  const pro = await page.evaluate(() => ({ gate: !!document.querySelector("#v-progres .gate.locked"), line: !!document.querySelector("#ch-e1rm path"), prDot: !!document.querySelector('#ch-e1rm circle[fill="var(--yellow)"]'), records: document.querySelectorAll("#v-progres table tbody tr").length }));
  check("progres_gratuit_puis_premium", free.gate && free.weeks && badge === "Premium" && !pro.gate && pro.line && pro.prDot && pro.records >= 2, { free, badge, pro });
  await page.click("#ai-btn");
  await page.waitForFunction(() => !ai.busy);
  const aiRes = await page.evaluate(() => ({ html: document.querySelector("#ai-txt").innerHTML, brain: window.__aiPrompt.includes("COACH FONTE"), data: window.__aiPrompt.includes("SES SÉANCES"), squat: /Goblet squat.*force estimée/.test(window.__aiPrompt) }));
  check("analyse_ia", /<strong>squat<\/strong>/.test(aiRes.html) && aiRes.brain && aiRes.data && aiRes.squat, aiRes);
  await page.screenshot({ path: path.join(DIR, "suivi-desk-progres.png") });

  // Conseil de charge en Premium
  await page.click('.nav [data-view=seance]');
  await page.click('[data-act=start][data-si="0"]');
  await page.waitForSelector(".livehead");
  const tip = await page.evaluate(() => ({ tip: document.querySelector("#ex-0 .tip-line").textContent, pw: document.querySelector('#ex-0 .srow[data-j="0"] [data-f=w]').placeholder }));
  check("conseil_de_charge", /45 kg/.test(tip.tip) && tip.pw === "45", tip);
  // Bibliothèque : ajout d'un exercice puis abandon
  await page.click("[data-act=add-ex]");
  await page.fill("#lib-q", "curl marteau");
  await page.click("[data-act=lib-pick]");
  const added = await page.evaluate(() => active.ex[active.ex.length - 1].n);
  await page.click("[data-act=discard]");
  await page.click("[data-act=confirm-ok]");
  const afterDiscard = await page.evaluate(() => ({ active, docs: [...window.__store.keys()].filter(k => k.includes("/log/workouts/")).length }));
  check("bibliotheque_et_abandon", added === "Curl marteau" && afterDiscard.active === null && afterDiscard.docs === 2, { added, afterDiscard });

  // Export CSV
  await page.click('.nav [data-view=offre]');
  await page.click("#csv-btn");
  await page.waitForFunction(() => window.__saved);
  const csv = await page.evaluate(() => window.__saved);
  check("export_csv", csv.filename === "fonte-suivi.csv" && /Goblet squat;1;42,5;10/.test(csv.data), csv.data.slice(0, 200));

  // Persistance (rechargement) : la base simulée est transmise telle quelle à la page rechargée, comme le ferait le serveur
  // (le stockage local des pages file:// n'est pas toujours conservé par Chromium d'un chargement à l'autre)
  const snapshot = await page.evaluate(() => JSON.stringify(Object.fromEntries(window.__store)));
  await page.addInitScript(data => { const st = window.__store; if (st && st.size === 0) { Object.entries(JSON.parse(data)).forEach(([k, v]) => st.set(k, v)); localStorage.setItem("__mockdb", data); } }, snapshot);
  await page.reload();
  await page.waitForSelector("[data-act=start]");
  await page.waitForFunction(() => workouts.length === 2 && profile.plan === "premium", null, { timeout: 8000 }).catch(() => {});
  const re = await page.evaluate(() => ({ w: workouts.length, plan: profile.plan }));
  check("persistance_db", re.w === 2 && re.plan === "premium", re);

  // Import par lien (#fonte-...) avec programme débloqué
  const prog = { v: 1, p: 1, g: "force", l: "inter", d: 2, t: 5, q: "halteres", z: ["epaules"], s: [["Full body A", "Lun", [["dch", 4, "3 à 5", "3 à 4 min", "2 à 3"], [null, 3, "8 à 12", "90 s", "2", "Pompes lestées maison"]]], ["Full body B", "Jeu", [["goblet", 4, "3 à 5", "3 à 4 min", "2 à 3"]]]] };
  const p2 = await ctx.newPage();
  p2.on("pageerror", e => errors.push("p2 pageerror: " + e.message));
  await p2.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await p2.route("https://fonts.gstatic.com/**", r => r.abort());
  await p2.addInitScript(MOCK);
  await p2.goto(PAGE + "#fonte-" + code(prog));
  await p2.waitForSelector("[data-act=import-pending]");
  await p2.click("[data-act=import-pending]");
  const imp = await p2.evaluate(() => ({ sessions: program().sessions.length, custom: program().sessions[0].ex[1].n, bundle: profile.bundle, badge: document.querySelector("#plan-badge").textContent }));
  await p2.click('.nav [data-view=offre]');
  const offer = await p2.textContent("#v-offre");
  check("import_lien_et_offre", imp.sessions === 2 && imp.custom === "Pompes lestées maison" && imp.bundle && /2,49 €/.test(offer) && /4,99 €/.test(offer), { imp, offer: offer.slice(0, 200) });
  await p2.close();

  // Code invalide collé
  await page.click('.nav [data-view=offre]');
  await page.fill("#code-in", "nimporte quoi");
  await page.click("[data-act=import-code]");
  const toastBad = await page.textContent("#toast");
  check("code_invalide", /Code non reconnu/.test(toastBad), toastBad);

  // Écriture refusée → bascule sur l'appareil
  await page.evaluate(() => { window.__failWrites = true; });
  await page.click('.nav [data-view=seance]');
  await page.click('[data-act=start][data-si="1"]');
  await page.waitForSelector(".livehead");
  await page.fill('#ex-0 .srow[data-j="0"] [data-f=w]', "20");
  await page.fill('#ex-0 .srow[data-j="0"] [data-f=r]', "8");
  await page.click('#ex-0 .srow[data-j="0"] .chk');
  await page.click("[data-act=finish]");
  await page.click("[data-act=save-workout]");
  await page.waitForFunction(() => storeMode === "local" && workouts.length === 3 && (JSON.parse(localStorage.getItem("fonte-suivi.v1") || "{}").workouts || []).length === 3, null, { timeout: 8000 }).catch(() => {});
  const fb = await page.evaluate(() => ({ mode: storeMode, w: workouts.length, local: JSON.parse(localStorage.getItem("fonte-suivi.v1") || "{}").workouts?.length }));
  check("secours_appareil", fb.mode === "local" && fb.w === 3 && fb.local === 3, fb);

  // Sans runtime Claude : mode appareil
  const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark", deviceScaleFactor: 2 });
  const p3 = await ctx3.newPage();
  p3.on("pageerror", e => errors.push("p3 pageerror: " + e.message));
  await p3.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await p3.route("https://fonts.gstatic.com/**", r => r.abort());
  await p3.goto(PAGE);
  await p3.waitForSelector("[data-act=start]");
  await p3.screenshot({ path: path.join(DIR, "suivi-phone-home.png") });
  await p3.click('[data-act=start][data-si="0"]');
  await p3.waitForSelector(".livehead");
  await p3.fill('#ex-0 .srow[data-j="0"] [data-f=w]', "22,5");
  await p3.fill('#ex-0 .srow[data-j="0"] [data-f=r]', "10");
  await p3.click('#ex-0 .srow[data-j="0"] .chk');
  const ov = await p3.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check("pas_de_debordement_mobile", ov.sw <= ov.cw, ov);
  await p3.screenshot({ path: path.join(DIR, "suivi-phone-live.png") });
  await p3.click("[data-act=finish]");
  await p3.click("[data-act=save-workout]");
  await p3.reload();
  await p3.waitForSelector("[data-act=start]");
  const loc = await p3.evaluate(() => ({ mode: storeMode, w: workouts.length }));
  check("mode_appareil", loc.mode === "local" && loc.w === 1, loc);
  await p3.click('.nav [data-view=progres]');
  await p3.click("[data-act=demo]").catch(() => {});
  await p3.click('.nav [data-view=offre]');
  await p3.click("[data-act=plan-pro]");
  await p3.click('.nav [data-view=progres]');
  await p3.waitForTimeout(200);
  await p3.screenshot({ path: path.join(DIR, "suivi-phone-progres.png"), fullPage: true });

  R.errors = errors;
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
})().catch(e => { console.error("TEST CRASH", e); process.exit(1); });
