// Planche contact : chaque scène à 3 instants (départ, milieu, position clé). Usage : node make.js [filtre]
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "../..");
const files = ["src/data.js", ...fs.readdirSync(path.join(root, "src")).filter(f => /^anim-sc\d\.js$/.test(f)).sort().map(f => "src/" + f), "src/anim-core.js"];
const js = files.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
const css = fs.readFileSync(path.join(__dirname, "figcss.css"), "utf8");
const filter = process.argv[2] || "";
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
body{margin:0;background:#EEF0ED;font:12px system-ui}
.grid{display:grid;grid-template-columns:repeat(3,260px);gap:6px;padding:8px}
.cell{background:#fff;border-radius:6px;padding:4px}
.cell p{margin:2px 4px;font-weight:600}
</style></head><body><div class="grid" id="g"></div>
<script>${js}
if (typeof DSC_MAP === "undefined") { window.DSC_MAP = {}; window.DSC_OV = {}; }
const want = ${JSON.stringify(filter)};
const keys = Object.keys(DSC).filter(k => !want || want.split(",").some(w => k.includes(w)));
const g = document.getElementById("g");
for (const k of keys) {
  // exercice représentatif pour les muscles : premier exercice de la table qui pointe vers cette scène
  let id = Object.keys(DSC_MAP).find(i => DSC_MAP[i] === k);
  if (!id) { id = "__" + k; DSC_MAP[id] = k; }
  const sc = DEMO._t.get(id);
  const st = [0, null, sc.th];
  const tl = sc.tl; let acc = 0, tMid = 0;
  // milieu de la première transition qui change de position
  let from = tl[tl.length - 1][0];
  for (const [to, d] of tl) { if (to !== from) { tMid = acc + d / 2; break; } acc += d; from = to; }
  const poses = [sc.F[0], DEMO._t.sample(sc, tMid).P, sc.F[sc.th]];
  poses.forEach((P, i) => {
    const c = document.createElement("div"); c.className = "cell";
    c.innerHTML = '<p>' + k + ' (' + id + ') ' + ["départ", "milieu", "clé"][i] + '</p><svg class="fig" viewBox="' + sc.vb.join(" ") + '">' + DEMO._t.render(sc, P) + '</svg>';
    g.appendChild(c);
  });
}
</script></body></html>`;
fs.writeFileSync(path.join(__dirname, "sheet.html"), html);
console.log("ok", files.join(" "));
