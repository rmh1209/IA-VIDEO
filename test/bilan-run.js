// Bilan du mois dans Progrès : comparaison avec le mois précédent, plus forte progression, records, navigation
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const fs = require("fs"), path = require("path");
const DIR = __dirname;
const MOCK = eval(fs.readFileSync(path.join(DIR, "suivi-run.js"), "utf8").match(/const MOCK = (`[\s\S]*?`);/)[1]);
const R = {}, errors = [];
const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra ?? null).slice(0, 600); };
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("https://fonts.gstatic.com/**", r => r.abort());
  await page.addInitScript(MOCK);
  await page.goto("file://" + path.join(DIR, "suivi-page.html"));
  await page.waitForSelector("[data-act=start]");
  // mois précédent : 4 séances à 60 kg ; mois en cours : 6 séances, jusqu'à 70 kg, 1 record
  await page.evaluate(() => {
    const d = new Date(), prevM = new Date(d.getFullYear(), d.getMonth() - 1, 3, 18).getTime(), curM = new Date(d.getFullYear(), d.getMonth(), 1, 18).getTime();
    const mk = (id, at, w, prs) => ({ id, name: "A", si: 0, startedAt: at, endedAt: at + 3e6, dur: 3000, ex: [{ id: "squat", n: "Squat barre", target: null, note: "", sets: [{ w, r: 5 }, { w, r: 5 }, { w, r: 5 }, { w, r: 5 }] }], prs: prs || [], vol: w * 20, nsets: 4 });
    for (let i = 0; i < 4; i++) putWorkout(mk("p" + i, prevM + i * 2 * 864e5, 60));
    for (let i = 0; i < 6; i++) putWorkout(mk("c" + i, Math.min(Date.now() - 3600e3, curM + i * 3600e3 * 5), 60 + (i === 5 ? 10 : 0), i === 5 ? [{ key: "squat", n: "Squat barre", e: 81.7, w: 70, r: 5 }] : []));
    profile.plan = "premium";
    render(true);
  });
  await page.click('.nav [data-view="progres"]');
  await page.waitForSelector(".recap");
  const cur = await page.evaluate(() => ({ h: document.querySelector(".recap h2").textContent, txt: document.querySelector(".recap").textContent, next: document.querySelector('[data-act="recap-next"]').disabled, prev: document.querySelector('[data-act="recap-prev"]').disabled }));
  const monthName = new Date().toLocaleDateString("fr-FR", { month: "long" });
  check("bilan_mois_en_cours", cur.h.includes(monthName) && /Bilan (d'|de )/.test(cur.h) && !/de [aeiouéèêô]/i.test(cur.h) && /Séances6\+2surunmois/.test(cur.txt.replace(/\s+/g, "")) && /Plus forte progression : Squat barre/.test(cur.txt) && /1 record : Squat barre/.test(cur.txt) && cur.next && !cur.prev, cur);
  await page.screenshot({ path: path.join(DIR, "bilan.png"), fullPage: true, clip: await page.$eval(".recap", el => { const r = el.getBoundingClientRect(); return { x: 0, y: r.top + scrollY - 8, width: 390, height: r.height + 16 }; }) });
  await page.click('[data-act="recap-prev"]');
  const prev = await page.evaluate(() => ({ h: document.querySelector(".recap h2").textContent, txt: document.querySelector(".recap").textContent, next: document.querySelector('[data-act="recap-next"]').disabled }));
  const prevName = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString("fr-FR", { month: "long" });
  check("bilan_mois_precedent", prev.h.includes(prevName) && /Séances4/.test(prev.txt.replace(/\s+/g, "")) && !/Plus forte progression/.test(prev.txt) && !prev.next, prev);
  const lim = await page.evaluate(() => document.querySelector('[data-act="recap-prev"]').disabled);
  const empty = await page.evaluate(() => { recapOffset = 3; renderProgress(); return document.querySelector(".recap").textContent; });
  check("limites_et_mois_vide", lim && /Aucune séance enregistrée/.test(empty), { lim, empty });
  const over = await page.evaluate(() => { recapOffset = 0; renderProgress(); const out = []; document.querySelectorAll("body *").forEach(el => { const r = el.getBoundingClientRect(); if (r.right > innerWidth + 1 && !el.closest(".tbl")) out.push(el.tagName + "." + el.className + " " + Math.round(r.right) + " " + (el.textContent || "").slice(0, 30)); }); return { sw: document.documentElement.scrollWidth, out: out.slice(0, 6) }; });
  check("pas_de_debordement", over.sw <= 390, over);
  await browser.close();
  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
})();
