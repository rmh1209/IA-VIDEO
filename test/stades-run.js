// Stades du programme dans Fonte : dosage, résumé, code vers le carnet, contexte du coach, dosage fixé
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const path = require("path");
const DIR = __dirname;
const R = {}, errors = [];
const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra ?? null).slice(0, 700); };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("https://fonts.gstatic.com/**", r => r.abort());
  await page.route("https://cdnjs.cloudflare.com/**", r => r.abort());
  await page.addInitScript(() => { window.claude = { use: async () => null }; });
  await page.goto("file://" + path.join(DIR, "page.html"));
  await page.click("#go");
  await page.waitForSelector("#panel-prog .day");
  await page.click("#panel-prog .paywall .unlock");
  await page.waitForSelector('[data-act="stage"][data-n="2"]');
  const dec = c => { let b = c.slice(2).replace(/-/g, "+").replace(/_/g, "/"); while (b.length % 4) b += "="; return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b), ch => ch.charCodeAt(0)))); };
  const s1 = await page.evaluate(() => ({ ex: JSON.parse(JSON.stringify(plan.sessions[0].ex)), sum: document.querySelector("#summary").textContent }));
  check("stade1_par_defaut", s1.sum.includes("Stade 1 · Fondations") && !s1.ex[0].b, s1.sum);

  await page.click('[data-act="stage"][data-n="2"]');
  const s2 = await page.evaluate(() => ({ ex: JSON.parse(JSON.stringify(plan.sessions[0].ex)), from: plan.from.stage, sum: document.querySelector("#summary").textContent, pressed: document.querySelector('[data-act="stage"][data-n="2"]').getAttribute("aria-pressed"), code: exportCode(), ctx: contexte() }));
  const o2 = await page.evaluate(dec, s2.code);
  const principal = s2.ex.findIndex(x => x.role === "principal");
  check("stade2_dosage", s2.from === 2 && s2.ex[principal].sets === Math.min(5, s1.ex[principal].sets + 1) && s2.ex[principal].b && s2.ex[principal].b.sets === s1.ex[principal].sets && s2.pressed === "true" && s2.sum.includes("Stade 2 · Construction"), { s1: s1.ex[principal], s2: s2.ex[principal], sum: s2.sum });
  check("code_vers_carnet", o2.k === 2 && o2.s[0][2][principal].length >= 10 && o2.s[0][2][principal][6] === s1.ex[principal].sets, o2.s[0][2][principal]);
  check("contexte_coach", s2.ctx.includes("Stade du programme : 2 sur 3 (Construction"), s2.ctx.split("\n").find(l => l.includes("Stade")));

  await page.click('[data-act="stage"][data-n="3"]');
  const s3 = await page.evaluate(() => JSON.parse(JSON.stringify(plan.sessions[0].ex)));
  check("stade3_dosage", s3[principal].sets === s1.ex[principal].sets && s3[principal].reps !== s1.ex[principal].reps && s3[principal].rir === "1 à 2", { s1: s1.ex[principal], s3: s3[principal] });
  await page.screenshot({ path: path.join(DIR, "stades-fonte.png"), fullPage: true, clip: await page.$eval(".stages", el => { const r = el.getBoundingClientRect(); return { x: 0, y: r.top + window.scrollY - 60, width: 390, height: r.height + 170 }; }) });

  // un dosage fixé par le coach ne bouge plus avec les stades
  const fixed = await page.evaluate(() => { const x = plan.sessions[0].ex[0]; toolDose({ exercice: x.n, series: 5, seance: 1 }); setStage(1); return { x: JSON.parse(JSON.stringify(plan.sessions[0].ex[0])), other: JSON.parse(JSON.stringify(plan.sessions[0].ex[1])) }; });
  check("dosage_fixe", fixed.x.fixed && fixed.x.sets === 5 && !fixed.other.fixed, fixed);
  check("retour_stade1", fixed.other.sets === s1.ex[1].sets && fixed.other.reps === s1.ex[1].reps, { now: fixed.other, base: s1.ex[1] });
  // annuler le changement de stade
  await page.click('[data-act="stage"][data-n="2"]');
  await page.click("#toast-undo");
  const und = await page.evaluate(() => plan.from.stage);
  check("annuler_stade", und === 1, und);
  // recréer le programme garde le stade choisi
  await page.click('[data-act="stage"][data-n="3"]');
  await page.evaluate(() => createProgram());
  const re = await page.evaluate(() => ({ st: plan.from.stage, x: plan.sessions[0].ex.find(x => x.role === "principal") }));
  check("recreation_garde_stade", re.st === 3 && re.x.b && re.x.rir === "1 à 2", re);
  const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("pas_de_debordement", !over);
  await browser.close();
  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
})();
