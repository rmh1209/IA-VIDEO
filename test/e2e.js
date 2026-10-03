const { chromium } = require("/opt/node-tools/node_modules/playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const route = async p => { await p.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" })); await p.route("https://fonts.gstatic.com/**", r => r.abort()); p.on("pageerror", e => errors.push(e.message)); };
  const f = await ctx.newPage(); await route(f);
  await f.goto("file://" + path.join(__dirname, "page.html"));
  // profil : force, intermédiaire, 4 séances, haltères, épaules
  for (const sel of ['[data-k=goal] [data-v=force]', '[data-k=level] [data-v=inter]', '[data-k=days] [data-v="4"]', '[data-k=eq] [data-v=halteres]', '[data-k=pain] [data-v=epaules]']) await f.click(sel);
  await f.click("#go");
  await f.waitForSelector(".suivi a.primary");
  const free = await f.evaluate(() => ({ href: document.querySelector(".suivi a.primary").href, txt: document.querySelector(".suivi").textContent }));
  await f.click('#panel-prog .paywall [data-act=unlock]');
  const paid = await f.evaluate(() => ({ href: document.querySelector(".suivi a.primary").href, txt: document.querySelector(".suivi").textContent, plan: plan.sessions.map(s => [s.name, s.ex.map(x => x.id + ":" + x.sets + ":" + x.reps)]) , paywallLi: [...document.querySelectorAll(".paywall li")].length }));
  await f.click("[data-act=copycode]");
  await f.waitForTimeout(200);
  const copy = await f.evaluate(() => ({ box: !document.querySelector("#code-box").hidden, val: document.querySelector("#code-out").value.slice(0, 2), toast: document.querySelector("#toast-txt").textContent }));
  const hash = paid.href.split("#")[1];
  const s = await ctx.newPage(); await route(s);
  await s.goto("file://" + path.join(__dirname, "suivi-page.html") + "#" + hash);
  await s.waitForSelector("[data-act=import-pending]");
  await s.click("[data-act=import-pending]");
  const imported = await s.evaluate(() => ({ plan: program().sessions.map(x => [x.name, x.ex.map(e => e.id + ":" + e.sets + ":" + e.reps)]), bundle: profile.bundle, from: program().from }));
  const same = JSON.stringify(imported.plan) === JSON.stringify(paid.plan);
  const geo = await s.evaluate(async () => {
    startWorkout(0);
    await new Promise(r => setTimeout(r, 50));
    const row = document.querySelector('#ex-0 .srow[data-j="0"]');
    row.querySelector('[data-f=w]').value = "20"; row.querySelector('[data-f=w]').dispatchEvent(new Event("input", { bubbles: true }));
    row.querySelector('[data-f=r]').value = "5"; row.querySelector('[data-f=r]').dispatchEvent(new Event("input", { bubbles: true }));
    row.querySelector(".chk").click();
    await new Promise(r => setTimeout(r, 300));
    const btns = [...document.querySelectorAll("#rest-in button")].map(x => Math.round(x.getBoundingClientRect().height));
    const lbl = document.querySelector("#rest-l").getBoundingClientRect().height;
    const head = [...document.querySelectorAll("#ex-0 .srow.h span")].slice(0, 2).map(x => { const r = x.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; });
    return { btns, lbl: Math.round(lbl), head, kg: row.querySelector('[data-f=w]').value };
  });
  console.log(JSON.stringify({
    lien_gratuit_sans_remise: /#fonte-F1/.test(free.href) && /Débloque ton programme/.test(free.txt),
    lien_payant_avec_remise: /2,49 €/.test(paid.txt) && /−50 % inclus/.test(paid.txt) && paid.paywallLi === 0,
    copie_code: copy.val === "F1" && (copy.box || /copié/.test(copy.toast)),
    import_identique: same, bundle: imported.bundle, from: imported.from,
    minuteur_boutons_une_ligne: geo.btns.every(h => h <= 44), libelle_une_ligne: geo.lbl <= 20, entete_sans_chevauchement: geo.head[0][1] <= geo.head[1][0], geo,
    longueur_lien: paid.href.length, errors }, null, 1));
  await b.close();
})();
