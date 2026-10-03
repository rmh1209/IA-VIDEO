// Paliers, stades, décharge et repères de force dans Fonte Suivi
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const fs = require("fs"), path = require("path");
const DIR = __dirname;
const MOCK = eval(fs.readFileSync(path.join(DIR, "suivi-run.js"), "utf8").match(/const MOCK = (`[\s\S]*?`);/)[1]);
const R = {}, errors = [];
const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra ?? null).slice(0, 600); };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("https://fonts.gstatic.com/**", r => r.abort());
  await page.addInitScript(MOCK);
  await page.goto("file://" + path.join(DIR, "suivi-page.html"));
  await page.waitForSelector("[data-act=start]");

  const head0 = await page.evaluate(() => ({ pill: document.querySelector("#tier-pill").textContent, off: document.querySelectorAll(".brand .minibar i.off").length, home: !!document.querySelector(".tierline"), stage: document.querySelector(".stage h2").textContent }));
  check("depart_barre_vide", head0.pill === "Barre vide" && head0.off === 4 && head0.home && head0.stage.includes("Stade 1"), head0);

  // première séance : 4 séries et plus → +100 points et disque vert
  await page.click('[data-act=start][data-si="0"]');
  await page.waitForSelector(".livehead");
  for (const i of [0, 1]) {
    const n = await page.$$eval(`#ex-${i} .srow:not(.h)`, r => r.length);
    for (let j = 0; j < n; j++) {
      await page.fill(`#ex-${i} .srow[data-j="${j}"] [data-f=w]`, "20");
      await page.fill(`#ex-${i} .srow[data-j="${j}"] [data-f=r]`, "10");
      await page.click(`#ex-${i} .srow[data-j="${j}"] .chk`);
    }
  }
  await page.click("[data-act=finish]");
  await page.waitForSelector(".xp");
  const sheet = await page.evaluate(() => ({ xp: document.querySelector(".xp-head b").textContent, up: document.querySelector(".levelup") ? document.querySelector(".levelup").textContent : "" }));
  check("points_fin_de_seance", sheet.xp === "+100 points" && sheet.up.includes("Disque vert"), sheet);
  await page.screenshot({ path: path.join(DIR, "paliers-fin-seance.png") });
  await page.click("[data-act=save-workout]");
  await page.waitForTimeout(150);
  const head1 = await page.evaluate(() => ({ pill: document.querySelector("#tier-pill").textContent, toast: document.querySelector("#toast").textContent, off: [...document.querySelectorAll(".brand .minibar i")].map(i => i.classList.contains("off")) }));
  check("palier_vert", head1.pill === "Disque vert" && head1.toast.includes("Nouveau palier") && JSON.stringify(head1.off) === "[true,true,true,false]", head1);
  await page.screenshot({ path: path.join(DIR, "paliers-accueil.png"), fullPage: true });

  // progrès : carte du palier, stade, repères de force avec profil
  await page.click('.nav [data-view="progres"]');
  await page.waitForSelector(".tiers");
  await page.click('#body-form [data-sex="h"]');
  await page.fill("#body-kg", "80");
  await page.click('#body-form button[type="submit"]');
  await page.waitForTimeout(100);
  const fz = await page.evaluate(() => ({ body: profile.body, rows: [...document.querySelectorAll(".flist li")].map(li => li.textContent.replace(/\s+/g, " ").trim()).slice(0, 4), wait: (document.querySelector(".fwait") || {}).textContent || "", stored: [...window.__store.keys()].some(k => k.endsWith("/profile") && JSON.stringify(window.__store.get(k)).includes('"kg":80')) }));
  check("profil_force", fz.body && fz.body.sex === "h" && fz.body.kg === 80 && fz.stored && fz.rows.length >= 1 && fz.rows[0].includes("0,33 × ton poids") && fz.wait.includes("Squat barre"), fz);
  await page.screenshot({ path: path.join(DIR, "paliers-progres.png"), fullPage: true });

  // 23 séances de plus (3 par semaine) : stade 1 terminé, passage au stade 2
  const before = await page.evaluate(() => JSON.parse(JSON.stringify(program().sessions[0].ex.slice(0, 3))));
  await page.evaluate(() => {
    const t0 = workouts[0].startedAt;
    for (let i = 1; i <= 23; i++) {
      const at = t0 - i * 2.3 * 86400000;
      putWorkout({ id: "s" + i, name: "Full body A", si: 0, startedAt: at, endedAt: at + 3000000, dur: 3000, ex: [{ id: "goblet", n: "Goblet squat", target: null, note: "", sets: [{ w: 20 + i * 0.5, r: 10 }, { w: 20, r: 10 }, { w: 20, r: 10 }, { w: 20, r: 10 }] }], prs: i % 4 ? [] : [{ key: "goblet", n: "Goblet squat", e: 30 }], vol: 800, nsets: 4 });
    }
    profile.stage = { n: 1, at: 0, cycle: 1, done: 0 };
    saveProfile();
    render(true);
  });
  await page.click('.nav [data-view="seance"]');
  await page.waitForSelector('[data-act="stage-next"]');
  const pts1 = await page.evaluate(() => ptsNow(workouts).total);
  await page.click('[data-act="stage-next"]');
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => ({ st: profile.stage, ex: JSON.parse(JSON.stringify(program().sessions[0].ex.slice(0, 3))), h2: document.querySelector(".stage h2").textContent, pts: ptsNow(workouts).total }));
  const plus1 = after.ex[0].sets === before[0].sets + 1 || before[0].sets === 5;
  check("passage_stade_2", after.st.n === 2 && after.st.done === 1 && after.h2.includes("Construction") && plus1 && after.ex[0].b && after.ex[0].b.sets === before[0].sets && after.pts === pts1 + 500, { before, after, pts1 });

  // semaine 4 du stade 2 : décharge appliquée au démarrage
  await page.evaluate(() => {
    const at0 = profile.stage.at;
    for (let i = 0; i < 9; i++) { const at = at0 + 1000 + i * 1000; putWorkout({ id: "d" + i, name: "Full body A", si: 0, startedAt: at, endedAt: at + 500, dur: 500, ex: [{ id: "goblet", n: "Goblet squat", target: null, note: "", sets: [{ w: 22, r: 10 }, { w: 22, r: 10 }, { w: 22, r: 10 }, { w: 22, r: 10 }] }], prs: [], vol: 880, nsets: 4 }); }
    render(true);
  });
  const dl = await page.evaluate(() => ({ s: stageNow(workouts), txt: document.querySelector(".stage .deload") ? document.querySelector(".stage .deload").textContent : "" }));
  await page.click('[data-act=start][data-si="0"]');
  await page.waitForSelector(".livehead");
  const live = await page.evaluate(() => ({ deload: active.deload, rows: document.querySelectorAll("#ex-0 .srow:not(.h)").length, planned: program().sessions[0].ex[0].sets, badge: document.querySelector(".livehead .badge") ? document.querySelector(".livehead .badge").textContent : "" }));
  check("decharge", dl.s.deload && dl.s.week === 4 && dl.txt.includes("décharge") && live.deload && live.rows === live.planned - 1 && live.badge === "Décharge", { dl, live });
  await page.click("[data-act=discard]");
  await page.click("[data-act=confirm-ok]");

  // code reçu de Fonte au stade 3 : le stade suit le code
  const code = await page.evaluate(() => {
    const o = { v: 1, p: 0, g: "muscle", l: "inter", d: 4, t: 5, q: "halteres", z: [], k: 3, s: [["Haut", "Lun", [["dch", 3, "4 à 8", "2 à 3 min", "1 à 2", null, 3, "6 à 10", "2 à 3 min", "1 à 3"], ["row1", 4, "6 à 10", "2 min", "1", null, null, null, null, null, 1]]], ["Bas", "Mar", [["goblet", 3, "4 à 8", "2 à 3 min", "1 à 2"]]]] };
    const bytes = new TextEncoder().encode(JSON.stringify(o)); let bin = ""; bytes.forEach(b => { bin += String.fromCharCode(b); });
    return "F1" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  });
  await page.evaluate(c => importCode(c), code);
  const imp = await page.evaluate(() => ({ st: profile.stage, ex: program().sessions[0].ex }));
  check("import_stade", imp.st.n === 3 && imp.ex[0].b && imp.ex[0].b.reps === "6 à 10" && imp.ex[1].fixed === true, imp);

  // fin de cycle (stade 3 terminé) : nouveau cycle au niveau supérieur
  await page.evaluate(() => {
    const at0 = profile.stage.at;
    for (let i = 0; i < 32; i++) { const at = at0 + 2000 + i * 1000; putWorkout({ id: "c" + i, name: "Haut", si: 0, startedAt: at, endedAt: at + 500, dur: 500, ex: [{ id: "dch", n: "Développé couché haltères", target: null, note: "", sets: [{ w: 24, r: 8 }, { w: 24, r: 8 }, { w: 24, r: 8 }, { w: 24, r: 8 }] }], prs: [], vol: 768, nsets: 4 }); }
    render(true);
  });
  await page.click('[data-act="stage-next"]');
  await page.waitForTimeout(100);
  const cyc = await page.evaluate(() => ({ st: profile.stage, from: program().from, n: program().sessions.length }));
  check("nouveau_cycle", cyc.st.n === 1 && cyc.st.cycle === 2 && cyc.from.level === "conf" && cyc.n === 4, cyc);

  // l'analyse du coach reçoit palier, stade et repères
  const ad = await page.evaluate(() => analysisData());
  check("analyse_progression", ad.includes("palier") && ad.includes("stade 1 Fondations") && ad.includes("Repères de force"), ad.slice(-400));
  const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("pas_de_debordement", !over);
  // thème sombre, progrès
  await page.emulateMedia({ colorScheme: "dark" });
  await page.click('.nav [data-view="progres"]');
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(DIR, "paliers-progres-sombre.png") });
  await browser.close();
  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
})();
