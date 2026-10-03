// Import de l'historique depuis Strong et Hevy (CSV) dans le carnet
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const fs = require("fs"), path = require("path");
const DIR = __dirname, FX = path.join(DIR, "fixtures");
const MOCK = eval(fs.readFileSync(path.join(DIR, "suivi-run.js"), "utf8").match(/const MOCK = (`[\s\S]*?`);/)[1]);
const R = {}, errors = [];
const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra ?? null).slice(0, 700); };
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
  await page.click('.nav [data-view="offre"]');
  await page.waitForSelector("#import-csv", { state: "attached" });
  // Strong : résumé, choix de l'unité, import
  await page.setInputFiles("#import-csv", path.join(FX, "strong.csv"));
  await page.waitForSelector('[data-act="import-go"]');
  const sum = await page.textContent("#sheet-box");
  check("resume_strong", /Importer depuis Strong/.test(sum) && /2 séances/.test(sum) && /4 reconnus/.test(sum) && /1 gardé tel quel \(Zercher Carry\)/.test(sum) && /Livres/.test(sum), sum);
  await page.screenshot({ path: path.join(DIR, "import-resume.png") });
  await page.click('[data-act="import-unit"][data-u="lb"]');
  const lb = await page.evaluate(() => pendingImport.p.workouts[0].ex[0].sets[0].w);
  await page.click('[data-act="import-unit"][data-u="kg"]');
  await page.click('[data-act="import-go"]');
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => { const ws = workouts.filter(w => w.src === "Strong").sort((a, b) => a.startedAt - b.startedAt); return { n: ws.length, toast: document.querySelector("#toast").textContent, first: ws[0], second: ws[1] }; });
  const f = st.first || { ex: [] }, s2 = st.second || { ex: [] };
  check("import_strong", st.n === 2 && /2 séances importées depuis Strong/.test(st.toast) && lb === 27 && f.dur === 3900
    && f.ex.map(x => x.id || "c").join() === "dc,militaire,c,planche" && f.ex[0].sets.length === 2 && f.ex[3].sets[0].r === 60 && f.ex[1].note === "Bonne forme"
    && s2.ex[0].sets.length === 1 && s2.ex[0].sets[0].w === 62.5 && s2.ex[1].id === "dch" && s2.prs.length === 1 && s2.prs[0].key === "dc", { lb, st: { n: st.n, toast: st.toast, f: f.ex, s2: s2.ex, prs: s2.prs } });
  // réimport : aucun doublon
  await page.setInputFiles("#import-csv", path.join(FX, "strong.csv"));
  await page.waitForSelector('[data-act="import-go"]');
  await page.click('[data-act="import-go"]');
  await page.waitForTimeout(150);
  const again = await page.evaluate(() => ({ n: workouts.filter(w => w.src === "Strong").length, toast: document.querySelector("#toast").textContent }));
  check("sans_doublon", again.n === 2 && /déjà dans ton carnet/.test(again.toast), again);
  // Hevy : séries d'échauffement ignorées, durée, exercices reconnus
  await page.setInputFiles("#import-csv", path.join(FX, "hevy.csv"));
  await page.waitForSelector('[data-act="import-go"]');
  const hsum = await page.textContent("#sheet-box");
  await page.click('[data-act="import-go"]');
  await page.waitForTimeout(150);
  const hv = await page.evaluate(() => workouts.find(w => w.src === "Hevy"));
  check("import_hevy", /Importer depuis Hevy/.test(hsum) && !/Livres/.test(hsum) && hv && hv.name === "Leg Day" && hv.dur === 4200 && hv.ex.map(x => x.id).join() === "squat,rdl,tirage" && hv.ex[0].sets.length === 1 && hv.ex[0].sets[0].w === 100 && new Date(hv.startedAt).getDate() === 21, hv);
  // l'historique et les courbes en profitent
  await page.click('.nav [data-view="historique"]');
  const hist = await page.evaluate(() => document.querySelector("#v-historique").textContent);
  check("historique", /Leg Day/.test(hist) && /Push Day/.test(hist), hist.slice(0, 200));
  // fichier quelconque refusé
  fs.writeFileSync(path.join(FX, "autre.csv"), "a,b,c\n1,2,3\n");
  await page.click('.nav [data-view="offre"]');
  await page.setInputFiles("#import-csv", path.join(FX, "autre.csv"));
  await page.waitForTimeout(200);
  check("fichier_refuse", /pas un export Strong ou Hevy/.test(await page.textContent("#toast")));
  fs.unlinkSync(path.join(FX, "autre.csv"));
  // fichier piégé (HTML et script dans les noms et les notes) : rien ne s'exécute, sur aucun écran
  await page.setInputFiles("#import-csv", path.join(FX, "piege.csv"));
  await page.waitForSelector('[data-act="import-go"]');
  await page.click('[data-act="import-go"]');
  for (const v of ["seance", "historique", "progres", "offre"]) { await page.click(`.nav [data-view="${v}"]`); await page.waitForTimeout(120); }
  await page.click('.nav [data-view="historique"]');
  await page.evaluate(() => { for (const w of workouts) { detailId = w.id; renderHistory(); } detailId = null; renderHistory(); profile.plan = "premium"; render(true); });
  const xss = await page.evaluate(() => ({ x: window.__xss || null, imgs: document.querySelectorAll('img[src="x"], svg[onload]').length }));
  check("import_sans_injection", xss.x === null && xss.imgs === 0, xss);
  await browser.close();
  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
})();
