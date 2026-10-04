// Accessibilité : audit axe-core (WCAG 2.2 A et AA + bonnes pratiques) de chaque écran, en clair et en sombre
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const DIR = __dirname, APP = path.join(DIR, "..", "dist", "fonte-appli");
const AXE = require.resolve("axe-core/axe.min.js");
const MOCK = eval(fs.readFileSync(path.join(DIR, "suivi-run.js"), "utf8").match(/const MOCK = (`[\s\S]*?`);/)[1]);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(APP, p);
  if (!f.startsWith(APP) || !fs.existsSync(f)) { res.writeHead(404); res.end("introuvable"); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" });
  fs.createReadStream(f).pipe(res);
});
const R = {}, errors = [], found = {};
const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra ?? null).slice(0, 900); };
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const VERBOSE = process.argv.includes("--detail");

async function audit(page, screen, opts = {}) {
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity), null, { timeout: 5000 }).catch(() => {});
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ path: AXE });
  const v = await page.evaluate(async ({ tags, exclude }) => {
    const r = await axe.run({ exclude }, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
    return r.violations.map(x => ({ id: x.id, impact: x.impact, help: x.help, n: x.nodes.length, nodes: x.nodes.slice(0, 6).map(n => ({ t: n.target.join(" "), s: (n.failureSummary || "").replace(/\s+/g, " ").slice(0, 260), h: n.html.slice(0, 160) })) }));
  }, { tags: TAGS, exclude: opts.exclude || [] });
  found[screen] = v;
  check("axe_" + screen, v.length === 0, v.map(x => `${x.id} (${x.impact}, ${x.n}) ${x.nodes.map(n => n.t).join(" | ")}`));
}
const quiet = (p, tag) => {
  p.on("pageerror", e => errors.push(tag + " pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(tag + " console: " + m.text()); });
};

server.listen(8793, async () => {
  const BASE = "http://localhost:8793/";
  const browser = await chromium.launch();
  for (const scheme of ["light", "dark"]) {
    const sfx = scheme === "dark" ? "_sombre" : "";
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    // Programme (artefact)
    const fp = await ctx.newPage();
    quiet(fp, "programme");
    await fp.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
    await fp.route("https://fonts.gstatic.com/**", r => r.abort());
    await fp.route("https://cdnjs.cloudflare.com/**", r => r.abort());
    await fp.goto("file://" + path.join(DIR, "page.html"));
    await audit(fp, "programme_questionnaire" + sfx);
    await fp.click("#go");
    await fp.waitForSelector("#panel-prog .day");
    await audit(fp, "programme_seances" + sfx);
    if (!sfx) {
      // onglets : flèches gauche et droite, focus visible au clavier
      await fp.focus("#tab-prog");
      await fp.keyboard.press("ArrowRight");
      const tabs = await fp.evaluate(() => ({ id: document.activeElement.id, sel: document.activeElement.getAttribute("aria-selected"), shown: !document.querySelector("#panel-coach").hidden, ring: getComputedStyle(document.activeElement).outlineStyle }));
      check("clavier_onglets", tabs.id === "tab-coach" && tabs.sel === "true" && tabs.shown && tabs.ring !== "none", tabs);
    }
    await fp.click("#tab-prog");
    await fp.click('#panel-prog [data-act="more"]:not([tabindex="-1"])');
    await fp.waitForSelector("#panel-prog .anim-stage svg");
    await audit(fp, "programme_demo" + sfx);
    await fp.evaluate(() => { unlocked = true; renderAll(); });
    await audit(fp, "programme_complet" + sfx);
    await fp.click("#tab-coach");
    await audit(fp, "programme_coach" + sfx);
    await fp.click("#tab-nutri");
    await fp.evaluate(() => { const t = Date.now(); nutri.log = [0, 3, 5, 7, 10, 12, 14].map(k => ({ d: new Date(t - (14 - k) * 864e5).toISOString().slice(0, 10), kg: 80 - k * 0.07, ...(k % 7 === 0 ? { tt: 90 - k / 7 } : {}) })); renderNutriOut(); });
    await audit(fp, "programme_nutrition" + sfx);
    await fp.click("#tab-mob");
    await audit(fp, "programme_mobilite" + sfx);
    await fp.close();
    // Carnet (artefact)
    const cp = await ctx.newPage();
    quiet(cp, "carnet");
    await cp.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
    await cp.route("https://fonts.gstatic.com/**", r => r.abort());
    await cp.addInitScript(MOCK);
    await cp.goto("file://" + path.join(DIR, "suivi-page.html"));
    await cp.waitForSelector("[data-act=start]");
    await audit(cp, "carnet_accueil" + sfx);
    await cp.click("[data-act=start]");
    await cp.waitForSelector("#ex-0");
    await audit(cp, "carnet_seance" + sfx);
    if (!sfx) {
      // feuille modale : focus dedans, Tab reste dedans, Échap ferme et rend le focus au bouton
      await cp.focus('[data-act="finish"]');
      await cp.keyboard.press("Enter");
      await cp.waitForSelector("#sheet:not([hidden])");
      const seen = new Set();
      let inside = true;
      for (let i = 0; i < 12; i++) { await cp.keyboard.press(i % 3 === 2 ? "Shift+Tab" : "Tab"); const s = await cp.evaluate(() => ({ in: document.querySelector("#sheet-box").contains(document.activeElement), t: document.activeElement.textContent.trim().slice(0, 30) })); inside = inside && s.in; seen.add(s.t); }
      await cp.keyboard.press("Escape");
      const back = await cp.evaluate(() => ({ closed: document.querySelector("#sheet").hidden, focus: document.activeElement.dataset.act }));
      check("clavier_feuille_carnet", inside && seen.size >= 2 && back.closed && back.focus === "finish", { inside, seen: [...seen], back });
    }
    await cp.click('#ex-0 .thumb[data-act="cues"]');
    await cp.waitForSelector("#cues-0 .anim-stage svg");
    const exp = await cp.evaluate(() => [...document.querySelectorAll('[data-act="cues"][data-i="0"]')].map(b => b.getAttribute("aria-expanded")));
    if (!sfx) check("demo_etat_annonce", exp.length === 2 && exp.every(v => v === "true"), exp);
    await audit(cp, "carnet_demo" + sfx);
    await cp.click('#ex-0 .thumb[data-act="cues"]');
    await cp.click('[data-act="add-ex"]');
    await cp.waitForSelector("#sheet:not([hidden])");
    await audit(cp, "carnet_biblio" + sfx);
    await cp.keyboard.press("Escape");
    await cp.fill('#ex-0 .srow[data-j="0"] [data-f=w]', "40");
    await cp.fill('#ex-0 .srow[data-j="0"] [data-f=r]', "8");
    await cp.click('#ex-0 .srow[data-j="0"] .chk');
    await cp.click('[data-act="finish"]');
    await cp.waitForSelector("#sheet:not([hidden]) #sheet-title");
    await audit(cp, "carnet_fin" + sfx);
    await cp.click('#sheet [data-act="save-workout"]');
    await cp.evaluate(() => { const d = 864e5, t = Date.now(); for (let k = 1; k <= 8; k++) { const at = t - k * 3.5 * d; putWorkout({ id: "a" + k, name: k % 2 ? "Haut" : "Bas", si: k % 2, startedAt: at, endedAt: at + 3e6, dur: 3000, ex: [{ id: "squat", n: "Squat barre", target: null, note: "", sets: [{ w: 60 + (8 - k) * 2.5, r: 5 }, { w: 60 + (8 - k) * 2.5, r: 5 }, { w: 60 + (8 - k) * 2.5, r: 5 }] }, { id: "dc", n: "Développé couché", target: null, note: "", sets: [{ w: 50 + (8 - k) * 1.25, r: 6 }, { w: 50, r: 6 }] }], prs: [], vol: 1500, nsets: 5 }); } profile.plan = "premium"; saveProfile(); render(true); });
    for (const v of ["historique", "progres", "offre"]) {
      await cp.click(`.nav [data-view="${v}"]`);
      await cp.waitForSelector(`#v-${v}:not([hidden])`);
      await audit(cp, "carnet_" + v + sfx);
    }
    await cp.click('.nav [data-view="historique"]');
    await cp.click('#v-historique [data-act="open-w"]');
    await cp.waitForSelector('#v-historique [data-act="back"]');
    await audit(cp, "carnet_detail" + sfx);
    await cp.close();
    // Appli installée et pages publiques
    const pp = await ctx.newPage();
    quiet(pp, "site");
    await pp.route("**/api/config", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ coach: true, paiement: true, legal: true, questions: 3, portail: "" }) }));
    for (const [name, url] of [["site_presentation", "decouvrir.html"], ["site_mentions", "legal/mentions-legales.html"], ["site_confidentialite", "legal/confidentialite.html"], ["site_conditions", "legal/conditions.html"]]) {
      await pp.goto(BASE + url);
      await audit(pp, name + sfx);
    }
    await pp.goto(BASE + "index.html");
    await pp.waitForFunction(() => window.FONTE_PWA && document.querySelector("#go"));
    await pp.click("#go");
    await pp.waitForSelector("#panel-prog .day");
    await pp.evaluate(() => { document.querySelector("#tab-prog").focus(); FONTE_PWA.checkout("fonte"); });
    await pp.waitForSelector(".pwa-sheet");
    await audit(pp, "site_achat" + sfx);
    if (!sfx) {
      let inside = true;
      for (let i = 0; i < 10; i++) { await pp.keyboard.press(i % 4 === 3 ? "Shift+Tab" : "Tab"); inside = inside && await pp.evaluate(() => !!document.activeElement.closest(".pwa-box")); }
      await pp.keyboard.press("Escape");
      const back = await pp.evaluate(() => ({ closed: !document.querySelector(".pwa-sheet"), focus: document.activeElement.id }));
      check("clavier_feuille_achat", inside && back.closed && back.focus === "tab-prog", { inside, back });
    } else await pp.keyboard.press("Escape");
    await pp.click("#tab-coach");
    await pp.waitForSelector("[data-pwa-consent]");
    await audit(pp, "site_coach" + sfx);
    await pp.goto(BASE + "carnet.html");
    await pp.waitForSelector("[data-act=start]");
    await audit(pp, "site_carnet" + sfx);
    await pp.click('.nav [data-view="offre"]');
    await pp.waitForSelector('#v-offre [data-act="plan-pro"]');
    await audit(pp, "site_carnet_offre" + sfx);
    await pp.close();
    await ctx.close();
  }
  await browser.close();
  server.close();
  if (VERBOSE) console.error(JSON.stringify(found, null, 1));
  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
});
