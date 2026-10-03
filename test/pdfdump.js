const { chromium } = require("/opt/node-tools/node_modules/playwright");
const fs = require("fs"), path = require("path");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await p.route("https://fonts.gstatic.com/**", r => r.abort());
  await p.addScriptTag; 
  await p.goto("file://" + path.join(__dirname, "page.html"));
  await p.addScriptTag({ path: path.join(__dirname, "node_modules/jspdf/dist/jspdf.umd.min.js") });
  const b64 = await p.evaluate(async () => {
    state = { goal: "seche", level: "inter", days: "4", time: "5", eq: "halteres", pain: ["epaules"] };
    plan = buildPlan(clone(state)); unlocked = true;
    nutri = { sexe: "f", age: 31, taille: 168, poids: 66, act: "leger", reg: "vege", example: false };
    const blob = buildPDF(window.jspdf.jsPDF);
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ""; buf.forEach(c => s += String.fromCharCode(c)); return btoa(s);
  });
  fs.writeFileSync(path.join(__dirname, "programme.pdf"), Buffer.from(b64, "base64"));
  await b.close();
})();
