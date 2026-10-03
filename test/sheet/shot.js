const { chromium } = require("/opt/node-tools/node_modules/playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: 812, height: 900 } });
  const errs = [];
  p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto("file://" + path.join(__dirname, "sheet.html"));
  await p.waitForTimeout(300);
  const h = await p.evaluate(() => document.body.scrollHeight);
  const per = 3 * 230; // ~3 rangées par image
  let i = 0;
  for (let y = 0; y < h; y += per * 2) {
    await p.screenshot({ fullPage: true, path: path.join(__dirname, `s${String(i++).padStart(2, "0")}.png`), clip: { x: 0, y, width: 812, height: Math.min(per * 2, h - y) } });
  }
  console.log("pages", i, "errors", JSON.stringify(errs));
  await b.close();
})();
