// Démos animées : couverture des 96 exercices, lecture, pause, ralenti, mouvement réduit, intégration Fonte et Fonte Suivi
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const fs = require("fs"), path = require("path");
const DIR = __dirname;
const SUIVI_MOCK = eval(fs.readFileSync(path.join(DIR, "suivi-run.js"), "utf8").match(/const MOCK = (`[\s\S]*?`);/)[1]);
const R = {}, errors = [];
const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra ?? null).slice(0, 500); };
const quiet = async p => {
  await p.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await p.route("https://fonts.gstatic.com/**", r => r.abort());
  await p.route("https://cdnjs.cloudflare.com/**", r => r.abort());
  p.on("pageerror", e => errors.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
};
(async () => {
  const browser = await chromium.launch();
  // ---------- Fonte ----------
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await quiet(page);
  await page.addInitScript(() => { window.claude = { use: async () => null }; });
  await page.goto("file://" + path.join(DIR, "page.html"));

  // toutes les scènes, à 12 instants : pas d'exception, pas de NaN, des segments dessinés
  R.couverture = await page.evaluate(() => {
    const bad = [], missing = [];
    for (const e of EX) {
      if (!DEMO.has(e.id)) { missing.push(e.id); continue; }
      const sc = DEMO._t.get(e.id);
      for (let k = 0; k < 12; k++) {
        const svg = DEMO._t.render(sc, DEMO._t.sample(sc, sc.total * k / 12).P);
        if (/NaN|undefined|Infinity/.test(svg) || (svg.match(/<line/g) || []).length < 6) { bad.push(e.id + "@" + k); break; }
      }
      const th = DEMO.thumb(e.id);
      if (!th.startsWith("<svg") || /NaN/.test(th)) bad.push(e.id + ":thumb");
      if (!sc.mus.length) bad.push(e.id + ":muscles");
    }
    return { exercices: EX.length, scenes: new Set(EX.map(e => DEMO._t.get(e.id)?.key)).size, missing, bad };
  });
  check("toutes_les_scenes", !R.couverture.missing.length && !R.couverture.bad.length, R.couverture);

  await page.click("#go");
  await page.waitForSelector("#panel-prog .day");
  const rows = await page.evaluate(() => { const d = document.querySelector("#panel-prog .day"); return { ex: d.querySelectorAll(".ex").length, thumbs: d.querySelectorAll(".ex .thumb svg").length, label: d.querySelector(".more").textContent }; });
  check("vignettes_programme", rows.ex > 0 && rows.ex === rows.thumbs && rows.label.includes("Démo"), rows);

  await page.click("#panel-prog .day:first-of-type .more");
  await page.waitForSelector("#panel-prog .day:first-of-type .anim svg");
  const snap = () => page.$eval("#panel-prog .day:first-of-type .anim svg", s => s.innerHTML);
  const a = await snap(); await page.waitForTimeout(450); const b = await snap();
  const phase = await page.textContent("#panel-prog .day:first-of-type .anim-phase");
  const yt = await page.getAttribute("#panel-prog .day:first-of-type .anim-yt", "href");
  check("animation_joue", a !== b && phase.trim().length > 3 && yt.startsWith("https://www.youtube.com/results?search_query="), { same: a === b, phase, yt });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(DIR, "demo-phone-fonte.png"), fullPage: true, clip: await page.$eval("#panel-prog .day:first-of-type .ex", el => { const r = el.getBoundingClientRect(); return { x: 0, y: r.top + window.scrollY, width: 390, height: Math.min(760, r.height + 10) }; }) });
  await page.click('#panel-prog .day:first-of-type [data-demo="play"]');
  const c = await snap(); await page.waitForTimeout(400); const d = await snap();
  const playLbl = await page.textContent('#panel-prog .day:first-of-type [data-demo="play"]');
  check("pause", c === d && playLbl === "Lecture", { moved: c !== d, playLbl });
  await page.click('#panel-prog .day:first-of-type [data-demo="slow"]');
  const slow = await page.evaluate(() => ({ pressed: document.querySelector('#panel-prog .day [data-demo="slow"]').getAttribute("aria-pressed"), play: document.querySelector('#panel-prog .day [data-demo="play"]').textContent }));
  check("ralenti_relance", slow.pressed === "true" && slow.play === "Pause", slow);
  const stillOpen = await page.isVisible("#panel-prog .day:first-of-type .exd");
  await page.click("#panel-prog .day:first-of-type .more");
  const closed = await page.evaluate(() => { const h = document.querySelector("#panel-prog .day .anim-host"); return { empty: h.innerHTML === "", hidden: h.closest(".exd").hidden }; });
  check("fermeture_libere", stillOpen && closed.empty && closed.hidden, { stillOpen, closed });

  // thème sombre : capture pour contrôle visuel
  await page.emulateMedia({ colorScheme: "dark" });
  await page.click("#panel-prog .day:first-of-type .ex:nth-child(2) .more");
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(DIR, "demo-phone-fonte-dark.png"), fullPage: true, clip: await page.$eval("#panel-prog .day:first-of-type .ex:nth-child(2)", el => { const r = el.getBoundingClientRect(); return { x: 0, y: r.top + window.scrollY, width: 390, height: Math.min(760, r.height + 10) }; }) });
  const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("pas_de_debordement_mobile", !over, { over });
  await ctx.close();

  // mouvement réduit : pas de lecture automatique
  const ctxR = await browser.newContext({ viewport: { width: 1100, height: 900 }, reducedMotion: "reduce" });
  const pr = await ctxR.newPage();
  await quiet(pr);
  await pr.addInitScript(() => { window.claude = { use: async () => null }; });
  await pr.goto("file://" + path.join(DIR, "page.html"));
  await pr.click("#go");
  await pr.waitForSelector("#panel-prog .day");
  await pr.click("#panel-prog .day:first-of-type .more");
  await pr.waitForSelector("#panel-prog .day .anim svg");
  const r1 = await pr.$eval("#panel-prog .day .anim svg", s => s.innerHTML); await pr.waitForTimeout(400);
  const r2 = await pr.$eval("#panel-prog .day .anim svg", s => s.innerHTML);
  const rl = await pr.textContent('#panel-prog .day [data-demo="play"]');
  check("mouvement_reduit", r1 === r2 && rl === "Lecture", { moved: r1 !== r2, rl });
  await ctxR.close();

  // ---------- Fonte Suivi ----------
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p2 = await ctx2.newPage();
  await quiet(p2);
  await p2.addInitScript(SUIVI_MOCK);
  await p2.goto("file://" + path.join(DIR, "suivi-page.html"));
  await p2.waitForSelector("[data-act=start]");
  await p2.click('[data-act=start][data-si="0"]');
  await p2.waitForSelector(".livehead");
  const cards = await p2.evaluate(() => ({ cards: document.querySelectorAll(".exc").length, thumbs: document.querySelectorAll(".exc .exhead .thumb svg").length }));
  check("vignettes_seance", cards.cards > 0 && cards.cards === cards.thumbs, cards);
  await p2.click("#ex-0 .exhead .thumb");
  await p2.waitForSelector("#cues-0 .anim svg");
  const s1 = await p2.$eval("#cues-0 .anim svg", s => s.innerHTML); await p2.waitForTimeout(450);
  const s2 = await p2.$eval("#cues-0 .anim svg", s => s.innerHTML);
  check("demo_en_seance", s1 !== s2 && await p2.isVisible("#cues-0"), { same: s1 === s2 });
  await p2.waitForTimeout(600);
  await p2.screenshot({ path: path.join(DIR, "demo-phone-suivi.png"), fullPage: true, clip: await p2.$eval("#ex-0", el => { const r = el.getBoundingClientRect(); return { x: 0, y: r.top + window.scrollY, width: 390, height: Math.min(900, r.height + 10) }; }) });
  // saisir une série ne ferme pas la démo
  await p2.fill('#ex-0 .srow[data-j="0"] [data-f=w]', "40");
  await p2.fill('#ex-0 .srow[data-j="0"] [data-f=r]', "10");
  await p2.click('#ex-0 .srow[data-j="0"] .chk');
  check("demo_reste_ouverte", await p2.isVisible("#cues-0 .anim svg"));
  await p2.click("#ex-0 .exhead .thumb");
  check("demo_fermee", !(await p2.isVisible("#cues-0")) && (await p2.$eval("#cues-0 .anim-host", h => h.innerHTML)) === "");
  await p2.click("[data-act=add-ex]");
  await p2.waitForSelector(".lib-item");
  const lib = await p2.evaluate(() => ({ items: document.querySelectorAll(".lib-item[data-act=lib-pick]").length, thumbs: document.querySelectorAll(".lib-item .thumb svg").length }));
  check("vignettes_bibliotheque", lib.items > 0 && lib.items === lib.thumbs, lib);
  await p2.screenshot({ path: path.join(DIR, "demo-phone-biblio.png") });
  const over2 = await p2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("suivi_pas_de_debordement", !over2, { over2 });
  await ctx2.close();

  await browser.close();
  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
})();
