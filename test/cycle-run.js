// Nouveau cycle : les exercices accessoires changent, les deux principaux restent ; Fonte et le carnet calculent le même programme
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const fs = require("fs"), path = require("path");
const DIR = __dirname;
const MOCK = eval(fs.readFileSync(path.join(DIR, "suivi-run.js"), "utf8").match(/const MOCK = (`[\s\S]*?`);/)[1]);
const R = {}, errors = [];
const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra ?? null).slice(0, 700); };
const ST = [
  { goal: "muscle", level: "conf", days: "4", time: "5", eq: "gym", pain: [] },
  { goal: "force", level: "inter", days: "3", time: "4", eq: "gym", pain: ["epaules"] },
  { goal: "seche", level: "deb", days: "3", time: "4", eq: "halteres", pain: [] },
  { goal: "forme", level: "conf", days: "5", time: "4", eq: "pdc", pain: ["genoux"] }
];
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const quiet = async p => { await p.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" })); await p.route("https://fonts.gstatic.com/**", r => r.abort()); await p.route("https://cdnjs.cloudflare.com/**", r => r.abort()); p.on("pageerror", e => errors.push(e.message)); };
  const fonte = await ctx.newPage(); await quiet(fonte);
  await fonte.addInitScript(() => { window.claude = { use: async () => null }; });
  await fonte.goto("file://" + path.join(DIR, "page.html"));
  const suivi = await ctx.newPage(); await quiet(suivi);
  await suivi.addInitScript(MOCK);
  await suivi.goto("file://" + path.join(DIR, "suivi-page.html"));
  await suivi.waitForSelector("[data-act=start]");
  const ids = s => s.map(x => x.ex.map(e => e.id));
  let rotated = 0, kept = true, dup = false, same = true, sizes = true;
  for (const st of ST) {
    const f1 = ids(await fonte.evaluate(s => buildPlan({ ...s, cycle: 1 }).sessions, st));
    const f2 = ids(await fonte.evaluate(s => buildPlan({ ...s, cycle: 2 }).sessions, st));
    const s2 = ids(await suivi.evaluate(s => buildPlan({ ...s, cycle: 2 }), st));
    const s1 = ids(await suivi.evaluate(s => buildPlan({ ...s, cycle: 1 }), st));
    if (JSON.stringify(f2) !== JSON.stringify(s2) || JSON.stringify(f1) !== JSON.stringify(s1)) same = false;
    f1.forEach((sess, i) => {
      if (sess.slice(0, 2).join() !== f2[i].slice(0, 2).join()) kept = false;
      if (sess.length !== f2[i].length) sizes = false;
      if (new Set(f2[i]).size !== f2[i].length) dup = true;
      rotated += f2[i].slice(2).filter((id, k) => id !== sess[k + 2]).length;
    });
  }
  check("memes_programmes_fonte_et_carnet", same);
  check("principaux_gardes", kept && sizes && !dup, { kept, sizes, dup });
  check("accessoires_renouveles", rotated >= 8, rotated);
  // cycle 1 inchangé : identique à l'ancien comportement (sans paramètre de cycle)
  const legacy = await fonte.evaluate(s => JSON.stringify(buildPlan(s).sessions.map(x => x.ex.map(e => e.id))) === JSON.stringify(buildPlan({ ...s, cycle: 1 }).sessions.map(x => x.ex.map(e => e.id))), ST[0]);
  check("cycle1_inchange", legacy);
  // appli installée : le Programme suit le carnet au nouveau cycle, même au niveau confirmé
  const pwa = await ctx.newPage(); await quiet(pwa);
  await pwa.addInitScript(() => { window.claude = { use: async () => null }; window.FONTE_PWA = { page: "programme", payOn: () => false, needsConsent: () => false }; });
  await pwa.goto("file://" + path.join(DIR, "page.html"));
  await pwa.evaluate(() => { document.querySelector('[data-k="level"] [data-v="conf"]') && document.querySelector('[data-k="level"] [data-v="conf"]').click(); });
  await pwa.click("#go");
  await pwa.waitForSelector("#panel-prog .day");
  const before = await pwa.evaluate(() => ({ lvl: plan.from.level, ids: plan.sessions.map(s => s.ex.map(e => e.id)) }));
  const carnetNext = await suivi.evaluate(f => buildPlan({ ...f, cycle: 2 }).map(s => s.ex.map(e => e.id)), before.lvl === "conf" ? { ...(await pwa.evaluate(() => plan.from)), cycle: 2 } : await pwa.evaluate(() => plan.from));
  await pwa.evaluate(() => { localStorage.setItem("fonte.shared", JSON.stringify({ stage: { n: 1, cycle: 2, at: Date.now(), done: 3 }, from: { ...plan.from, cycle: 2 }, at: Date.now() })); pullSuivi(); });
  const after = await pwa.evaluate(() => ({ cycle: plan.from.cycle, ids: plan.sessions.map(s => s.ex.map(e => e.id)) }));
  check("programme_suit_nouveau_cycle", after.cycle === 2 && JSON.stringify(after.ids) === JSON.stringify(carnetNext) && JSON.stringify(after.ids) !== JSON.stringify(before.ids), { before: before.ids, after: after.ids, carnetNext });
  await browser.close();
  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
})();
