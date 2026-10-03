// Script de création des produits Stripe : contre le faux Stripe, sur une copie de la config ; relancé, il ne crée rien de plus
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startMocks } from "./mocks.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), TMP = path.join(HERE, "srv", "produits");
rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true });
cpSync(path.join(HERE, "..", "server", "outils"), path.join(TMP, "outils"), { recursive: true });
cpSync(path.join(HERE, "..", "server", "wrangler.jsonc"), path.join(TMP, "wrangler.jsonc"));
const mocks = await startMocks();
const run = async () => (await promisify(execFile)("node", [path.join(TMP, "outils", "creer-produits-stripe.mjs")], { env: { ...process.env, STRIPE_SECRET_KEY: "sk_test_mock", STRIPE_API_BASE: "http://127.0.0.1:8793" }, encoding: "utf8" })).stdout;
const R = {};
try {
  const out1 = await run(), conf1 = readFileSync(path.join(TMP, "wrangler.jsonc"), "utf8");
  const prices = Object.values(mocks.state.prices);
  const v = name => (conf1.match(new RegExp(`"${name}"\\s*:\\s*"([^"]*)"`)) || [])[1];
  const byKey = k => prices.find(p => p.lookup_key === k);
  R.creation = prices.length === 3 && Object.keys(mocks.state.products).length === 2 && byKey("fonte_programme_19").unit_amount === 1900 && !byKey("fonte_programme_19").recurring
    && byKey("fonte_premium_499").recurring.interval === "month" && byKey("fonte_premium_reduit_249").unit_amount === 249 && byKey("fonte_premium_499").product === byKey("fonte_premium_reduit_249").product
    && prices.every(p => p.tax_behavior === "inclusive" && p.currency === "eur") ? "OK" : "FAIL " + JSON.stringify(prices);
  R.config_remplie = v("STRIPE_PRICE_FONTE") === byKey("fonte_programme_19").id && v("STRIPE_PRICE_PREMIUM") === byKey("fonte_premium_499").id && v("STRIPE_PRICE_PREMIUM_REDUIT") === byKey("fonte_premium_reduit_249").id && /^bpc_/.test(v("STRIPE_PORTAL_CONFIG")) && conf1.includes("// compteurs des questions") ? "OK" : "FAIL " + conf1;
  const out2 = await run();
  R.relance_sans_doublon = Object.values(mocks.state.prices).length === 3 && Object.keys(mocks.state.portals).length === 1 && /Déjà là/.test(out2) ? "OK" : "FAIL " + out2;
  R.sortie = out1.trim().split("\n");
} catch (e) { R.exception = String(e.stdout || "") + String(e.stderr || e); }
mocks.close();
console.log(JSON.stringify(R, null, 1));
