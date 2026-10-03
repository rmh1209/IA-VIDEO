// Captures nettes des cartes de progression (téléphone, clair puis sombre)
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const fs = require("fs"), path = require("path");
const DIR = __dirname;
const MOCK = eval(fs.readFileSync(path.join(DIR, "suivi-run.js"), "utf8").match(/const MOCK = (`[\s\S]*?`);/)[1]);
(async () => {
  const b = await chromium.launch();
  for (const scheme of ["light", "dark"]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    await p.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
    await p.route("https://fonts.gstatic.com/**", r => r.abort());
    await p.addInitScript(MOCK);
    await p.goto("file://" + path.join(DIR, "suivi-page.html"));
    await p.waitForSelector("[data-act=start]");
    await p.evaluate(() => {
      const now = Date.now();
      for (let i = 0; i < 14; i++) { const at = now - i * 2.4 * 86400000 - 3600000; putWorkout({ id: "s" + i, name: "Full body A", si: 0, startedAt: at, endedAt: at + 3000000, dur: 3000, ex: [{ id: "goblet", n: "Goblet squat", sets: [{ w: 24 + i, r: 10 }, { w: 24, r: 10 }] }, { id: "pompes", n: "Pompes", sets: [{ w: null, r: 18 + i }, { w: null, r: 15 }] }, { id: "planche", n: "Gainage planche", sets: [{ w: null, r: 50 + 3 * i }] }], prs: i % 3 ? [] : [{}], vol: 900, nsets: 5 }); }
      profile.body = { sex: "h", kg: 78 }; profile.stage = { n: 1, at: 0, cycle: 1, done: 0 }; saveProfile(); render(true);
    });
    await p.locator(".tierline").screenshot({ path: path.join(DIR, `pal-home-tier-${scheme}.png`) });
    await p.locator(".stage").screenshot({ path: path.join(DIR, `pal-home-stage-${scheme}.png`) });
    await p.click('.nav [data-view="progres"]');
    await p.waitForSelector(".tiers");
    await p.locator(".tiers").screenshot({ path: path.join(DIR, `pal-tiers-${scheme}.png`) });
    await p.locator(".force").screenshot({ path: path.join(DIR, `pal-force-${scheme}.png`) });
    await ctx.close();
  }
  await b.close();
  console.log("ok");
})();
