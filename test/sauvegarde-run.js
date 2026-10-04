// Appli installée : rappel de sauvegarde des séances, fichier réimportable, stockage protégé après une séance
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const DIR = __dirname, APP = path.join(DIR, "..", "dist", "fonte-appli");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(APP, p);
  if (!f.startsWith(APP) || !fs.existsSync(f)) { res.writeHead(404); res.end("introuvable"); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" });
  fs.createReadStream(f).pipe(res);
});
const R = {}, errors = [];
const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra ?? null).slice(0, 700); };

server.listen(8794, async () => {
  const BASE = "http://localhost:8794/";
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, serviceWorkers: "block" });
  await ctx.addInitScript(() => {
    // stockage persistant simulé : refusé tant que l'appli ne l'a pas demandé
    Object.defineProperty(navigator, "storage", { configurable: true, value: { persisted: async () => localStorage.getItem("test.persist") === "1", persist: async () => { localStorage.setItem("test.persist.calls", String(+(localStorage.getItem("test.persist.calls") || 0) + 1)); localStorage.setItem("test.persist", "1"); return true; }, estimate: async () => ({ usage: 0, quota: 1e9 }) } });
  });
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
  await page.route("**/api/**", r => r.fulfill({ status: 404, body: "" }));
  const seed = n => page.evaluate(([n, t]) => { const W = []; for (let k = 1; k <= n; k++) W.push({ id: "s" + k, name: "Full body A", si: 0, startedAt: t - k * 3 * 864e5, endedAt: t - k * 3 * 864e5 + 3e6, dur: 3000, ex: [{ id: "squat", n: "Squat barre", target: null, note: "", sets: [{ w: 60, r: 5 }, { w: 60, r: 5 }] }], prs: [], vol: 600, nsets: 2 }); localStorage.setItem("fonte-suivi.v1", JSON.stringify({ profile: {}, workouts: W })); }, [n, Date.now()]);
  await page.goto(BASE + "carnet.html");
  await page.waitForSelector("[data-act=start]");
  // moins de 5 séances : pas de rappel
  await seed(4);
  await page.reload();
  await page.waitForSelector("[data-act=start]");
  check("pas_de_rappel_avant_5", !(await page.$('[data-act="backup-now"]')));
  // 6 séances, jamais sauvegardées : rappel
  await seed(6);
  await page.reload();
  await page.waitForSelector('[data-act="backup-now"]');
  const ban = await page.evaluate(() => document.querySelector('[data-act="backup-now"]').closest(".banner").textContent);
  check("rappel_affiche", /Tes 6 séances ne sont enregistrées que sur ce téléphone/.test(ban) && !/dernière sauvegarde/.test(ban), ban.slice(0, 300));
  // plus tard : le rappel revient dans 14 jours, pas avant
  await page.click('[data-act="backup-later"]');
  await page.reload();
  await page.waitForSelector("[data-act=start]");
  const later = await page.evaluate(() => ({ shown: !!document.querySelector('[data-act="backup-now"]'), info: JSON.parse(localStorage.getItem("fonte.sauvegarde")) }));
  check("plus_tard_14_jours", !later.shown && Math.abs(later.info.rappel - Date.now() - 14 * 864e5) < 6e4, later);
  await page.evaluate(() => localStorage.setItem("fonte.sauvegarde", JSON.stringify({ rappel: Date.now() - 1000 })));
  await page.reload();
  // sauvegarde : un fichier JSON qui contient les séances, puis plus de rappel
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click('[data-act="backup-now"]')]);
  const file = path.join(DIR, "sauvegarde-test.json");
  await dl.saveAs(file);
  const back = JSON.parse(fs.readFileSync(file, "utf8"));
  const inFile = JSON.parse(back.donnees["fonte-suivi.v1"] || "{}");
  await page.waitForFunction(() => !document.querySelector('[data-act="backup-now"]'));
  check("fichier_de_sauvegarde", back.appli === "fonte" && /^fonte-mes-donnees-\d{4}-\d\d-\d\d\.json$/.test(dl.suggestedFilename()) && inFile.workouts.length === 6, { name: dl.suggestedFilename(), keys: Object.keys(back.donnees) });
  await page.click('.nav [data-view="offre"]');
  const card = await page.evaluate(() => document.querySelector(".datatools").textContent);
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  check("date_de_sauvegarde", card.includes(`Sauvegarde : dernière le ${today}`) && !/Stockage protégé/.test(card), card.slice(0, 200));
  // une séance enregistrée : stockage protégé demandé une fois
  await page.click('.nav [data-view="seance"]');
  await page.click("[data-act=start]");
  await page.waitForSelector("#ex-0");
  await page.fill('#ex-0 .srow[data-j="0"] [data-f=w]', "40");
  await page.fill('#ex-0 .srow[data-j="0"] [data-f=r]', "8");
  await page.click('#ex-0 .srow[data-j="0"] .chk');
  await page.click('[data-act="finish"]');
  await page.click('#sheet [data-act="save-workout"]');
  await page.waitForFunction(() => localStorage.getItem("test.persist") === "1");
  await page.click('.nav [data-view="offre"]');
  const prot = await page.evaluate(() => ({ calls: +localStorage.getItem("test.persist.calls"), card: document.querySelector(".datatools").textContent }));
  check("stockage_protege", prot.calls === 1 && /Stockage protégé sur cet appareil/.test(prot.card), prot);
  // réimport : la date de dernière sauvegarde est celle du fichier
  await page.evaluate(() => localStorage.setItem("fonte.sauvegarde", "{}"));
  await page.setInputFiles("#data-import", file);
  await Promise.all([page.waitForEvent("load"), page.click('#sheet [data-act="confirm-ok"]')]);
  await page.waitForSelector("[data-act=start]");
  const imp = await page.evaluate(() => ({ info: JSON.parse(localStorage.getItem("fonte.sauvegarde") || "{}"), n: JSON.parse(localStorage.getItem("fonte-suivi.v1")).workouts.length }));
  check("reimport", imp.n === 6 && Math.abs(imp.info.le - Date.parse(back.exporte)) < 1000, { imp, exporte: back.exporte });
  fs.unlinkSync(file);
  await browser.close();
  server.close();
  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
});
