// Lance toute la batterie de tests et résume : node test/tout.mjs [fichier ...]
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SUITES = [
  "progress-unit.js", "run.js", "poids-agenda-run.js", "e2e.js", "demo-run.js", "stades-run.js", "cycle-run.js",
  "suivi-run.js", "paliers-run.js", "aides-run.js", "superset-run.js", "import-run.js", "partage-run.js", "bilan-run.js",
  "pwa-run.js", "a11y-run.js", "serveur-unit.mjs", "serveur-api.mjs", "serveur-appli.mjs", "produits-stripe.mjs",
];
const pick = process.argv.slice(2);
const list = pick.length ? SUITES.filter(f => pick.some(p => f.startsWith(p))) : SUITES;

const run = f => new Promise(res => {
  const t = Date.now(), p = spawn(process.execPath, [path.join(DIR, f)], { cwd: path.dirname(DIR) });
  let out = "", err = "";
  p.stdout.on("data", d => { out += d; });
  p.stderr.on("data", d => { err += d; });
  p.on("close", code => res({ out, err, code, s: Math.round((Date.now() - t) / 1000) }));
});
// le dernier objet JSON affiché en début de ligne
const lastJSON = txt => {
  for (let i = txt.length; (i = txt.lastIndexOf("\n{", i - 1)) >= -1;) {
    try { return JSON.parse(txt.slice(i + 1)); } catch { if (i < 0) break; }
    if (i === 0) break;
  }
  try { return JSON.parse(txt); } catch { return null; }
};

let pass = 0;
const fails = [];
for (const f of list) {
  const r = await run(f), R = lastJSON(r.out);
  let ok = 0, ko = [];
  if (!R) ko.push(`sortie illisible (code ${r.code}) ${(r.err || r.out).slice(-300)}`);
  else for (const [k, v] of Object.entries(R)) {
    if (v === "OK" || v === true) ok++;
    else if (v === false || (typeof v === "string" && v.startsWith("FAIL"))) ko.push(`${k} : ${String(v).slice(0, 400)}`);
    else if (["errors", "wrangler_errors"].includes(k) && Array.isArray(v) && v.length) ko.push(`${k} : ${JSON.stringify(v).slice(0, 400)}`);
    else if (k === "exception") ko.push(`exception : ${String(v).slice(0, 400)}`);
  }
  pass += ok;
  ko.forEach(m => fails.push(`${f} › ${m}`));
  console.log(`${ko.length ? "✗" : "✓"} ${f.padEnd(22)} ${String(ok).padStart(3)} réussis${ko.length ? `, ${ko.length} en échec` : ""} (${r.s} s)`);
}
console.log(`\n${pass} vérifications réussies, ${fails.length} en échec.`);
fails.forEach(m => console.log("  - " + m));
process.exitCode = fails.length ? 1 : 0;
