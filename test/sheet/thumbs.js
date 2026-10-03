// Planche des vignettes à taille réelle (56 × 42), clair puis sombre
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  for (const scheme of ["light", "dark"]) {
    const p = await b.newPage({ viewport: { width: 760, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme });
    await p.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
    await p.route("https://fonts.gstatic.com/**", r => r.abort());
    await p.addInitScript(() => { window.claude = { use: async () => null }; });
    await p.goto("file://" + path.join(__dirname, "../page.html"));
    await p.evaluate(() => {
      for (const el of [...document.body.children]) if (el.tagName !== "STYLE" && el.tagName !== "LINK") el.style.display = "none";
      const g = document.createElement("div");
      g.style.cssText = "display:grid;grid-template-columns:repeat(8,88px);gap:6px;padding:8px;background:var(--bg)";
      document.body.appendChild(g);
      for (const e of EX) { const c = document.createElement("div"); c.style.cssText = "font:10px/1.1 sans-serif;color:var(--muted)"; c.innerHTML = `<span class="thumb" style="width:84px;height:63px">${DEMO.thumb(e.id)}</span>${e.id}`; g.appendChild(c); }
    });
    await p.screenshot({ path: path.join(__dirname, `thumbs-${scheme}.png`), fullPage: true });
    await p.close();
  }
  await b.close();
  console.log("ok");
})();
