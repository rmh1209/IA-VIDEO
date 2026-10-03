// Supersets dans le carnet : liaison, enchaînement sans repos, repos après le dernier, mémorisation, historique
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const fs = require("fs"), path = require("path");
const DIR = __dirname;
const MOCK = eval(fs.readFileSync(path.join(DIR, "suivi-run.js"), "utf8").match(/const MOCK = (`[\s\S]*?`);/)[1]);
const R = {}, errors = [];
const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra ?? null).slice(0, 600); };
const code = o => "F1" + Buffer.from(JSON.stringify(o), "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
  await page.evaluate(c => importCode(c), code({ v: 1, p: 0, g: "muscle", l: "inter", d: 2, t: 5, q: "gym", z: [], k: 1, s: [["Haut", "Lun", [["dc", 3, "8 à 10", "2 min", "2"], ["rowbarre", 3, "8 à 10", "2 min", "2"], ["elevlat", 3, "12 à 15", "60 s", "1 à 2"]]], ["Bas", "Jeu", [["squat", 3, "6 à 8", "3 min", "2"]]]] }));
  await page.click('[data-act=start][data-si="0"]');
  await page.waitForSelector("#ex-2");
  const link = async i => { await page.click(`#ex-${i} [data-act="ex-menu"]`); await page.click(`#exm-${i} [data-act="ss-link"]`); };
  await link(0);
  const b1 = await page.evaluate(() => [...document.querySelectorAll(".ssbadge")].map(x => x.textContent));
  check("liaison", b1.length === 2 && /A1 sur 2 · enchaîne sans repos/i.test(b1[0]) && /A2 sur 2 · puis repos/i.test(b1[1]), b1);
  // série du premier exercice : pas de repos, on passe au suivant
  await page.fill('#ex-0 .srow[data-j="0"] [data-f=w]', "60"); await page.fill('#ex-0 .srow[data-j="0"] [data-f=r]', "8");
  await page.click('#ex-0 .srow[data-j="0"] .chk');
  await page.waitForTimeout(200);
  const s1 = await page.evaluate(() => ({ rest: !document.querySelector("#rest").hidden, toast: document.querySelector("#toast").textContent, focus: document.activeElement && document.activeElement.closest(".srow") ? document.activeElement.closest(".srow").dataset.i + "-" + document.activeElement.closest(".srow").dataset.j : null }));
  check("enchainement_sans_repos", !s1.rest && /Enchaîne : Rowing barre/.test(s1.toast) && s1.focus === "1-0", s1);
  await page.fill('#ex-1 .srow[data-j="0"] [data-f=w]', "50"); await page.fill('#ex-1 .srow[data-j="0"] [data-f=r]', "9");
  await page.click('#ex-1 .srow[data-j="0"] .chk');
  const s2 = await page.evaluate(() => ({ rest: !document.querySelector("#rest").hidden, label: document.querySelector("#rest-l").textContent }));
  check("repos_apres_le_dernier", s2.rest && /superset A/.test(s2.label), s2);
  await page.screenshot({ path: path.join(DIR, "superset.png") });
  // série géante : trois exercices liés
  await link(1);
  const b2 = await page.evaluate(() => [...document.querySelectorAll(".ssbadge")].map(x => x.textContent));
  check("serie_geante", b2.length === 3 && /A3 sur 3/.test(b2[2]), b2);
  // délier le dernier, puis enregistrer : superset mémorisé pour cette séance
  await link(1);
  const b3 = await page.evaluate(() => [...document.querySelectorAll(".ssbadge")].map(x => x.textContent));
  check("deliaison", b3.length === 2 && /A2 sur 2/.test(b3[1]), b3);
  await page.click("[data-act=finish]");
  await page.click("[data-act=save-workout]");
  await page.waitForTimeout(150);
  const saved = await page.evaluate(() => ({ mem: profile.supersets && profile.supersets[0], ss: workouts[0].ex.map(x => x.ss || "-") }));
  check("memorise_et_historique", JSON.stringify(saved.mem) === JSON.stringify([["dc", "rowbarre"]]) && saved.ss.join("") === "AA", saved);
  await page.click('[data-act=start][data-si="0"]');
  await page.waitForSelector("#ex-2");
  const again = await page.evaluate(() => [...document.querySelectorAll(".ssbadge")].length);
  check("reapplique_a_la_seance_suivante", again === 2, again);
  // déplacer un exercice défait le superset
  await page.click('#ex-1 [data-act="ex-menu"]'); await page.click('#exm-1 [data-act="down"]');
  const moved = await page.evaluate(() => document.querySelectorAll(".ssbadge").length);
  check("deplacement_defait", moved === 0, moved);
  const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("pas_de_debordement", !over);
  await browser.close();
  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
})();
