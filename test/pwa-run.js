// Appli installable servie comme un vrai site : manifeste, service worker, hors connexion, une seule appli, installation
const { chromium, devices } = require("/opt/node-tools/node_modules/playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const DIR = __dirname, APP = path.join(DIR, "..", "dist", "fonte-appli");
const JSPDF = fs.readFileSync(path.join(DIR, "node_modules/jspdf/dist/jspdf.umd.min.js"), "utf8");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(APP, p);
  if (!f.startsWith(APP) || !fs.existsSync(f)) { res.writeHead(404); res.end("introuvable"); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" });
  fs.createReadStream(f).pipe(res);
});
const R = {}, errors = [], external = [];
const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra ?? null).slice(0, 700); };
const quiet = async (p, tag) => {
  await p.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await p.route("https://fonts.gstatic.com/**", r => r.abort());
  await p.route("https://cdnjs.cloudflare.com/**", r => r.fulfill({ status: 200, contentType: "application/javascript", body: JSPDF }));
  p.on("pageerror", e => errors.push(tag + " pageerror: " + e.message));
  p.on("request", r => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && u.hostname !== "localhost") external.push(tag + " " + u.hostname); });
  p.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(tag + " console: " + m.text()); });
};
server.listen(8791, async () => {
  const BASE = "http://localhost:8791/";
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage();
  await quiet(page, "programme");
  await page.goto(BASE + "index.html?source=pwa");
  await page.waitForSelector("#go");

  // manifeste et icônes
  const man = await page.evaluate(async () => {
    const href = document.querySelector('link[rel="manifest"]').href, m = await (await fetch(href)).json();
    const sizes = [];
    for (const ic of m.icons) { const img = new Image(); img.src = new URL(ic.src, href).href; await img.decode(); sizes.push(`${img.naturalWidth}x${img.naturalHeight}=${ic.sizes}`); }
    return { m, sizes };
  });
  check("manifeste", man.m.display === "standalone" && man.m.short_name === "Fonte" && man.sizes.every(s => { const [a, b] = s.split("="); return a === b; }) && man.m.icons.some(i => i.purpose === "maskable"), man);
  // service worker actif
  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return { scope: r.scope, active: !!r.active }; });
  check("service_worker", sw.active && sw.scope === BASE, sw);
  // une seule appli : barre du bas, coach annoncé, pas de lien externe vers claude.ai
  await page.click("#go");
  await page.waitForSelector("#panel-prog .day");
  const prog = await page.evaluate(() => ({ nav: [...document.querySelectorAll(".appnav a")].map(a => a.textContent), cur: document.querySelector('.appnav a[aria-current="page"]').textContent, link: document.querySelector(".suivi a.primary").getAttribute("href"), target: document.querySelector(".suivi a.primary").getAttribute("target"), code: localStorage.getItem("fonte.code") }));
  check("navigation_programme", prog.nav.join("|") === "Programme|Séance|Historique|Progrès|Offre" && prog.cur === "Programme" && prog.link === "carnet.html" && !prog.target && /^F1/.test(prog.code || ""), prog);
  await page.click("#tab-coach");
  const coach = await page.textContent("#coach-off");
  check("coach_annonce", coach.includes("arrive bientôt"), coach);
  await page.click("#tab-prog");
  // appli installée sans paiement branché : jamais de déblocage gratuit
  await page.click("#panel-prog .paywall .unlock");
  await page.waitForTimeout(100);
  const noFree = await page.evaluate(() => ({ unlocked, toast: document.querySelector("#toast").textContent, note: document.querySelector("#panel-prog .paywall .demo").textContent, legal: [...document.querySelectorAll(".pwa-legal a")].map(a => a.getAttribute("href")) }));
  check("pas_de_deblocage_gratuit", !noFree.unlocked && noFree.toast.includes("bientôt") && noFree.note.includes("bientôt"), noFree);
  check("liens_legaux", noFree.legal.join("|") === "legal/mentions-legales.html|legal/confidentialite.html|legal/conditions.html", noFree.legal);
  // programme → carnet sans code à copier
  await page.click('.appnav a[href="carnet.html"]');
  await page.waitForSelector("[data-act=start]");
  await page.waitForTimeout(200);
  const car = await page.evaluate(() => ({ storeMode, example: !!program().example, n: program().sessions.length, paid: !!program().paid, nav: [...document.querySelectorAll(".nav .nav-in > *")].map(a => a.textContent.trim()), stage: profile.stage && profile.stage.n }));
  check("carnet_recoit_programme", car.storeMode === "local" && !car.example && car.n === 3 && !car.paid && car.nav.join("|") === "Programme|Séance|Historique|Progrès|Offre" && car.stage === 1, car);
  // séance enregistrée sur l'appareil
  await page.click('[data-act=start][data-si="0"]');
  await page.waitForSelector(".livehead");
  for (let j = 0; j < 3; j++) { await page.fill(`#ex-0 .srow[data-j="${j}"] [data-f=w]`, "30"); await page.fill(`#ex-0 .srow[data-j="${j}"] [data-f=r]`, "8"); await page.click(`#ex-0 .srow[data-j="${j}"] .chk`); }
  await page.fill('#ex-1 .srow[data-j="0"] [data-f=w]', "20"); await page.fill('#ex-1 .srow[data-j="0"] [data-f=r]', "10"); await page.click('#ex-1 .srow[data-j="0"] .chk');
  await page.click("[data-act=finish]");
  await page.click("[data-act=save-workout]");
  await page.waitForTimeout(150);
  const saved = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem("fonte-suivi.v1") || "{}"); return { n: (d.workouts || []).length, pill: document.querySelector("#tier-pill").textContent }; });
  check("seance_sur_appareil", saved.n === 1 && saved.pill === "Disque vert", saved);
  // le carnet fait passer au stade 2 : le Programme suit
  await page.evaluate(() => { const t0 = workouts[0].startedAt; for (let i = 1; i <= 23; i++) { const at = t0 - i * 2.3 * 864e5; putWorkout({ id: "p" + i, name: "A", si: 0, startedAt: at, endedAt: at + 1, dur: 1, ex: [], prs: [], vol: 0, nsets: 5 }); } profile.stage = { n: 1, at: 0, cycle: 1, done: 0 }; saveProfile(); render(true); });
  await page.click('[data-act="stage-next"]');
  await page.click('.nav .navlink');
  await page.waitForSelector("#panel-prog .day");
  await page.waitForTimeout(200);
  const back = await page.evaluate(() => ({ st: plan.from.stage, sum: document.querySelector("#summary").textContent }));
  check("programme_suit_le_stade", back.st === 2 && back.sum.includes("Stade 2"), back);

  // hors connexion : les deux pages s'ouvrent depuis le cache
  await ctx.setOffline(true);
  await page.goto(BASE + "carnet.html#progres");
  await page.waitForSelector(".tiers", { timeout: 10000 });
  const off1 = await page.evaluate(() => ({ view, pill: document.querySelector("#tier-pill").textContent }));
  await page.goto(BASE + "index.html?source=pwa");
  await page.waitForSelector("#panel-prog .day", { timeout: 10000 });
  check("hors_connexion", off1.view === "progres" && off1.pill === "Disque bleu", off1);
  await ctx.setOffline(false);

  // PDF : téléchargement par le navigateur (session sans service worker pour que le test fournisse la bibliothèque PDF)
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, serviceWorkers: "block" });
  const pp = await pctx.newPage();
  await quiet(pp, "pdf");
  await pp.goto(BASE + "index.html");
  await pp.click("#go");
  await pp.waitForSelector("#panel-prog .day");
  await pp.evaluate(() => { unlocked = true; renderAll(); });
  const [dl] = await Promise.all([pp.waitForEvent("download", { timeout: 15000 }), pp.click("#pdf-btn")]);
  const dlPath = await dl.path();
  check("pdf_telecharge", dl.suggestedFilename() === "programme-fonte.pdf" && fs.statSync(dlPath).size > 10000, dl.suggestedFilename());
  await pctx.close();

  // pages légales : servies par l'appli, informations de l'éditeur à compléter signalées
  const lp = await ctx.newPage();
  await quiet(lp, "legal");
  const legal = {};
  for (const f of ["mentions-legales", "confidentialite", "conditions"]) {
    await lp.goto(BASE + "legal/" + f + ".html");
    legal[f] = await lp.evaluate(() => ({ h1: document.querySelector("h1").textContent, todo: document.querySelectorAll(".todo").length, font: getComputedStyle(document.body).fontFamily }));
  }
  check("pages_legales", legal["mentions-legales"].h1 === "Mentions légales" && legal.conditions.h1.includes("Conditions générales") && legal.confidentialite.todo > 0 && legal.conditions.todo > 3 && /Barlow/.test(legal.conditions.font), legal);
  await lp.screenshot({ path: path.join(DIR, "legal-conditions.png") });
  await lp.close();

  // page de présentation : arguments, prix, questions, données structurées valides, sans débordement
  const dp = await ctx.newPage();
  await quiet(dp, "decouvrir");
  await dp.goto(BASE + "decouvrir.html");
  const dc = await dp.evaluate(() => ({ h1: document.querySelector("h1").textContent, cta: [...document.querySelectorAll("a.cta")].map(a => a.getAttribute("href")), ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent)["@type"]; } catch (e) { return "ERREUR"; } }), over: document.documentElement.scrollWidth > innerWidth, faq: document.querySelectorAll("details").length, font: getComputedStyle(document.querySelector("h1")).fontFamily }));
  check("page_presentation", /payé une fois/.test(dc.h1) && dc.cta.every(h => h === "index.html") && dc.cta.length >= 3 && dc.ld.join() === "SoftwareApplication,FAQPage" && !dc.over && dc.faq >= 6 && /Barlow Condensed/.test(dc.font), dc);
  await dp.screenshot({ path: path.join(DIR, "decouvrir.png") });
  await dp.close();

  // installation : bandeau et bouton natif simulé
  const p2 = await ctx.newPage();
  await quiet(p2, "install");
  await p2.goto(BASE + "index.html");
  await p2.waitForSelector("#go");
  await p2.evaluate(() => { const e = new Event("beforeinstallprompt", { cancelable: true }); e.prompt = () => { window.__prompted = true; }; e.userChoice = Promise.resolve({ outcome: "accepted" }); dispatchEvent(e); });
  await p2.waitForSelector(".pwa-bar");
  const barTxt = await p2.textContent(".pwa-bar");
  await p2.screenshot({ path: path.join(DIR, "pwa-bandeau.png") });
  await p2.click(".pwa-go");
  await p2.waitForTimeout(100);
  const inst = await p2.evaluate(() => ({ prompted: !!window.__prompted, bar: !!document.querySelector(".pwa-bar") }));
  check("bouton_installer", barTxt.includes("Installe Fonte") && inst.prompted && !inst.bar, { barTxt, inst });
  await p2.close();
  await browser.close();

  // iPhone : guide pas à pas
  const b2 = await chromium.launch();
  const ictx = await b2.newContext({ ...devices["iPhone 13"] });
  const ip = await ictx.newPage();
  await quiet(ip, "iphone");
  await ip.goto(BASE + "index.html");
  await ip.waitForSelector(".pwa-bar");
  await ip.click(".pwa-go");
  await ip.waitForSelector(".pwa-box");
  const guide = await ip.textContent(".pwa-box");
  await ip.screenshot({ path: path.join(DIR, "pwa-iphone-guide.png") });
  await ip.click(".pwa-ok");
  await ip.click(".pwa-x");
  await ip.reload();
  await ip.waitForSelector("#go");
  const hidden = !(await ip.$(".pwa-bar"));
  check("guide_iphone", guide.includes("Sur l'écran d'accueil") && hidden, { guide, hidden });
  await b2.close();
  server.close();
  check("aucune_requete_tierce", external.length === 0, [...new Set(external)]);
  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
});
