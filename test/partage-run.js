// Carte de séance à partager : image 1080 × 1350, partage natif ou enregistrement
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const fs = require("fs"), path = require("path");
const DIR = __dirname;
const MOCK = eval(fs.readFileSync(path.join(DIR, "suivi-run.js"), "utf8").match(/const MOCK = (`[\s\S]*?`);/)[1]);
const R = {}, errors = [];
const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra ?? null).slice(0, 600); };
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("https://fonts.gstatic.com/**", r => r.abort());
  await page.addInitScript(MOCK);
  await page.addInitScript(() => {
    window.__shared = null;
    navigator.canShare = d => !!(d && d.files && d.files.length);
    navigator.share = async d => { const f = d.files[0], bmp = await createImageBitmap(f), buf = new Uint8Array(await f.arrayBuffer()); let bin = ""; buf.forEach(b => { bin += String.fromCharCode(b); }); window.__shared = { name: f.name, type: f.type, size: f.size, w: bmp.width, h: bmp.height, title: d.title, b64: btoa(bin) }; };
  });
  await page.goto("file://" + path.join(DIR, "suivi-page.html"));
  await page.waitForSelector("[data-act=start]");
  // fin de séance : partager avant même d'enregistrer
  await page.click('[data-act=start][data-si="0"]');
  await page.waitForSelector(".livehead");
  for (let j = 0; j < 2; j++) { await page.fill(`#ex-0 .srow[data-j="${j}"] [data-f=w]`, "40"); await page.fill(`#ex-0 .srow[data-j="${j}"] [data-f=r]`, "10"); await page.click(`#ex-0 .srow[data-j="${j}"] .chk`); }
  await page.click("[data-act=finish]");
  await page.click('#sheet-box [data-act="share-w"]');
  await page.waitForFunction(() => window.__shared, null, { timeout: 10000 });
  const s1 = await page.evaluate(() => { const s = window.__shared; return { ...s, b64: s.b64.length }; });
  check("partage_fin_de_seance", s1.type === "image/png" && s1.name === "seance-fonte.png" && s1.w === 1080 && s1.h === 1350 && s1.size > 20000 && s1.title === "Ma séance Fonte", s1);
  const b64 = await page.evaluate(() => window.__shared.b64);
  fs.writeFileSync(path.join(DIR, "partage-carte.png"), Buffer.from(b64, "base64"));
  await page.click("[data-act=save-workout]");
  // historique : partager une séance passée ; sans partage natif, l'image est enregistrée
  await page.evaluate(() => { window.__shared = null; navigator.canShare = undefined; });
  await page.click('.nav [data-view="historique"]');
  await page.click('[data-act="open-w"]');
  await page.click('[data-act="share-w"]');
  await page.waitForFunction(() => window.__saved, null, { timeout: 10000 });
  const s2 = await page.evaluate(() => ({ name: window.__saved.filename, shared: window.__shared, toast: document.querySelector("#toast").textContent }));
  check("repli_enregistrement", s2.name === "seance-fonte.png" && !s2.shared && /Image enregistrée/.test(s2.toast), s2);
  await browser.close();
  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
})();
