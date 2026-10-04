// Programme : suivi du poids (tendance, ajustement des calories) et séances dans l'agenda (.ics)
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const path = require("path");
const DIR = __dirname;
const R = {}, errors = [];
const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra ?? null).slice(0, 700); };
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("https://fonts.gstatic.com/**", r => r.abort());
  await page.route("https://cdnjs.cloudflare.com/**", r => r.abort());
  await page.addInitScript(() => { window.claude = { use: async n => (n === "downloads" ? { save: async ({ filename, data }) => { window.__saved = { filename, type: data.type, text: await data.text() }; return { status: "saved" }; } } : null) }; });
  await page.goto("file://" + path.join(DIR, "page.html"));
  await page.click("#go");
  await page.waitForSelector("#panel-prog .day");
  // agenda : une séance par semaine à chaque jour d'entraînement, rappel 30 min avant
  await page.selectOption("#ics-h", "19");
  await page.click('[data-act="ics"]');
  await page.waitForFunction(() => window.__saved);
  const ics = await page.evaluate(() => window.__saved);
  const lines = ics.text.split("\r\n").filter(Boolean);
  const events = (ics.text.match(/BEGIN:VEVENT/g) || []).length;
  const longest = Math.max(...lines.map(l => Buffer.byteLength(l, "utf8")));
  check("agenda_ics", ics.filename === "seances-fonte.ics" && /text\/calendar/.test(ics.type) && events === 3 && ics.text.includes("RRULE:FREQ=WEEKLY;BYDAY=MO") && ics.text.includes("TRIGGER:-PT30M") && /DTSTART:\d{8}T190000/.test(ics.text) && longest <= 75 && ics.text.endsWith("END:VCALENDAR\r\n") && ics.text.includes("Détail des exercices dans la version complète"), { events, longest, head: ics.text.slice(0, 300) });
  // poids : 14 jours de pesées en baisse alors que l'objectif est la prise de muscle
  await page.click("#tab-nutri");
  await page.fill("#n-age", "30"); await page.fill("#n-taille", "178"); await page.fill("#n-poids", "80");
  await page.evaluate(() => { const t = Date.now(); nutri.log = [0, 3, 5, 7, 10, 12, 14].map(k => { const d = new Date(t - (14 - k) * 864e5); return { d: d.toISOString().slice(0, 10), kg: Math.round((80 - k * 0.5 / 7) * 10) / 10 }; }); renderNutriOut(); });
  const free = await page.evaluate(() => ({ trend: document.querySelector(".wcard").textContent, apply: !!document.querySelector('[data-act="poids-apply"]') }));
  check("tendance_gratuite", /Tendance : 7\d(,\d)? kg/.test(free.trend) && /−0,\d kg par semaine/.test(free.trend) && /version complète/.test(free.trend) && !free.apply, free.trend.slice(0, 300));
  await page.evaluate(() => { unlocked = true; renderAll(); });
  await page.click("#tab-nutri");
  const before = await page.evaluate(() => ({ kcal: calcNutri().kcal, verdict: document.querySelector(".wverdict").textContent, k: +document.querySelector('[data-act="poids-apply"]').dataset.k }));
  check("conseil_ajustement", before.k >= 100 && before.k <= 300 && /monte moins vite que prévu/.test(before.verdict) && /ajoute \d+ kcal/.test(before.verdict), before);
  await page.click('[data-act="poids-apply"]');
  const after = await page.evaluate(() => ({ kcal: calcNutri().kcal, ajust: nutri.ajust, hero: document.querySelector("#n-out .hero").textContent, note: document.querySelector(".wcard").textContent }));
  check("ajustement_applique", after.ajust === before.k && Math.abs(after.kcal - before.kcal - before.k) <= 10 && /ajusté d'après tes pesées/.test(after.hero) && /Ajustement déjà appliqué/.test(after.note), { before, after: { ...after, hero: after.hero.slice(0, 200) } });
  const wait = await page.evaluate(() => ({ apply: !!document.querySelector('[data-act="poids-apply"]'), txt: document.querySelector(".wverdict").textContent }));
  check("pas_de_cumul_immediat", !wait.apply && /pendant 10 jours/.test(wait.txt), wait);
  await page.screenshot({ path: path.join(DIR, "poids-nutrition.png"), fullPage: true, clip: await page.$eval(".wcard", el => { const r = el.getBoundingClientRect(); return { x: 0, y: r.top + window.scrollY - 10, width: 390, height: Math.min(r.height + 20, 700) }; }) });
  // pesée du jour par le formulaire, puis contexte du coach
  await page.fill("#poids-in", "79.4");
  await page.click("#poids-form button[type=submit]");
  const log = await page.evaluate(() => ({ n: nutri.log.length, last: nutri.log[nutri.log.length - 1], ctx: contexte().split("\n").find(l => l.startsWith("Pesées")) }));
  check("pesee_et_contexte", log.last.kg === 79.4 && log.n >= 7 && /tendance 7\d(,\d)? kg/.test(log.ctx || "") && /calories déjà ajustées/.test(log.ctx || ""), log);
  await page.click('[data-act="poids-reset"]');
  check("retour_calcul_base", (await page.evaluate(() => nutri.ajust)) === 0);
  // tour de taille : saisi avec la pesée, gardé si on corrige le poids du jour sans le ressaisir
  await page.fill("#poids-in", "79.2"); await page.fill("#tt-in", "86.3");
  await page.click("#poids-form button[type=submit]");
  const tt1 = await page.evaluate(() => nutri.log[nutri.log.length - 1]);
  await page.fill("#poids-in", "79.1");
  await page.click("#poids-form button[type=submit]");
  const tt2 = await page.evaluate(() => ({ last: nutri.log[nutri.log.length - 1], n: nutri.log.filter(e => e.d === nutri.log[nutri.log.length - 1].d).length }));
  check("taille_saisie_gardee", tt1.tt === 86.5 && tt1.kg === 79.2 && tt2.last.tt === 86.5 && tt2.last.kg === 79.1 && tt2.n === 1, { tt1, tt2 });
  await page.fill("#poids-in", "79"); await page.fill("#tt-in", "250");
  await page.click("#poids-form button[type=submit]");
  const bad = await page.evaluate(() => ({ kg: nutri.log[nutri.log.length - 1].kg, toast: document.querySelector(".toast")?.textContent || "" }));
  check("taille_invalide_refusee", bad.kg === 79.1 && /entre 40 et 200 cm/.test(bad.toast), bad);
  await page.fill("#tt-in", "");
  // sèche : la balance stagne mais la taille fond depuis 4 semaines, pas de baisse de calories proposée
  await page.evaluate(() => {
    state.goal = "seche"; if (plan) plan.from = { ...plan.from, goal: "seche" };
    const t = Date.now(), dd = k => new Date(t - k * 864e5).toISOString().slice(0, 10);
    nutri.ajust = 0; nutri.ajustLe = ""; nutri.log = [28, 24, 21, 17, 14, 10, 7, 3, 0].map((k, i) => ({ d: dd(k), kg: 80 + (i % 2 ? 0.2 : -0.1), ...(k % 7 === 0 ? { tt: 90 - (28 - k) / 7 } : {}) }));
  });
  await page.evaluate(() => renderNutriOut());
  const rc = await page.evaluate(() => ({ goal: prof().goal, card: document.querySelector(".wcard").textContent, apply: !!document.querySelector('[data-act="poids-apply"]'), cls: document.querySelector(".wverdict")?.className, ctx: contexte().split("\n").find(l => l.startsWith("Tour de taille")), list: document.querySelector(".wlist").textContent }));
  check("taille_recomposition", rc.goal === "seche" && /Tour de taille : 86 cm · −3 cm en 3\ssemaines/.test(rc.card) && /±0 kg par semaine \(±0 %\)/.test(rc.card) && /tu perds du gras en gardant ton muscle/.test(rc.card) && /inutile de manger moins/.test(rc.card) && !rc.apply && /\bok\b/.test(rc.cls || "") && /^Tour de taille : 86 cm \(−3 cm en 3 semaines\)$/.test(rc.ctx || "") && /86 cm/.test(rc.list), rc);
  await page.addStyleTag({ content: ".tabs{position:static!important}" });
  await page.locator(".wcard").screenshot({ path: path.join(DIR, "poids-taille.png") });
  // sans baisse de taille, la baisse de calories reste proposée
  await page.evaluate(() => { nutri.log = nutri.log.map(e => (e.tt ? { ...e, tt: 90 } : e)); renderNutriOut(); });
  const nr = await page.evaluate(() => ({ card: document.querySelector(".wcard").textContent, apply: document.querySelector('[data-act="poids-apply"]')?.dataset.k }));
  check("taille_stable_conseil_normal", /±0 cm en 3\ssemaines/.test(nr.card) && /perds moins vite que prévu/.test(nr.card) && +nr.apply < 0, nr);
  const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("pas_de_debordement", !over);
  await browser.close();
  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
})();
