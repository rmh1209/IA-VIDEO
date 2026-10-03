/* Crée (une seule fois) les produits et prix Stripe de Fonte, le portail client, et les inscrit dans wrangler.jsonc.
   Utilisation : STRIPE_SECRET_KEY=sk_test_... npm run produits-stripe   (sk_live_... pour la vraie boutique)
   Relancer le script ne crée pas de doublon : les prix sont retrouvés par leur clé (lookup_key). */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const KEY = process.env.STRIPE_SECRET_KEY;
const BASE = (process.env.STRIPE_API_BASE || "https://api.stripe.com").replace(/\/$/, "");
if (!KEY || !/^(sk|rk)_(test|live)_/.test(KEY)) {
  console.error("Indique ta clé secrète Stripe : STRIPE_SECRET_KEY=sk_test_... npm run produits-stripe");
  process.exit(1);
}
const live = KEY.includes("_live_");

function form(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v, key, out);
    else out.push([key, String(v)]);
  }
  return out;
}
async function api(method, path, params) {
  const qs = params ? new URLSearchParams(form(params)).toString() : "";
  const res = await fetch(method === "GET" && qs ? `${BASE}${path}?${qs}` : `${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, ...(method === "GET" ? {} : { "Content-Type": "application/x-www-form-urlencoded" }) },
    body: method === "GET" ? undefined : qs
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} : ${(data.error && data.error.message) || res.status}`);
  return data;
}

const PRICES = [
  { var: "STRIPE_PRICE_FONTE", lookup: "fonte_programme_19", product: "Fonte · programme complet", desc: "Programme complet, coach IA illimité, nutrition, mobilité et export PDF. Paiement unique.", amount: 1900 },
  { var: "STRIPE_PRICE_PREMIUM", lookup: "fonte_premium_499", product: "Fonte Suivi Premium", desc: "Conseil de charge, courbes, records, séries par muscle et analyse du coach. Sans engagement.", amount: 499, monthly: true },
  { var: "STRIPE_PRICE_PREMIUM_REDUIT", lookup: "fonte_premium_reduit_249", product: "Fonte Suivi Premium", desc: null, amount: 249, monthly: true, nickname: "−50 % avec le programme Fonte" }
];

const found = {}, products = {};
const existing = await api("GET", "/v1/prices", { lookup_keys: PRICES.map(p => p.lookup), active: true, limit: 10 });
for (const p of existing.data) found[p.lookup_key] = p;
for (const p of PRICES) {
  let price = found[p.lookup];
  if (!price) {
    let productId = products[p.product];
    if (!productId) {
      const prod = await api("POST", "/v1/products", { name: p.product, description: p.desc, metadata: { appli: "fonte" } });
      productId = products[p.product] = prod.id;
    }
    price = await api("POST", "/v1/prices", {
      product: productId, currency: "eur", unit_amount: p.amount, lookup_key: p.lookup, nickname: p.nickname || null,
      tax_behavior: "inclusive", recurring: p.monthly ? { interval: "month" } : null
    });
    console.log(`Créé : ${p.product} ${(p.amount / 100).toFixed(2).replace(".", ",")} €${p.monthly ? " par mois" : ""} → ${price.id}`);
  } else {
    products[p.product] = typeof price.product === "string" ? price.product : price.product.id;
    console.log(`Déjà là : ${p.lookup} → ${price.id}`);
  }
  p.id = price.id;
}

// portail client : changer de carte, voir ses factures, résilier à la fin de la période payée
let portalId = "";
try {
  const list = await api("GET", "/v1/billing_portal/configurations", { active: true, limit: 100 });
  const mine = list.data.find(c => c.metadata && c.metadata.appli === "fonte");
  if (mine) portalId = mine.id;
  else {
    const conf = await api("POST", "/v1/billing_portal/configurations", {
      business_profile: { headline: "Fonte : gère ton abonnement Premium" },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: { enabled: true, allowed_updates: ["email", "address"] },
        subscription_cancel: { enabled: true, mode: "at_period_end" }
      },
      metadata: { appli: "fonte" }
    });
    portalId = conf.id;
  }
  console.log(`Portail client → ${portalId}`);
} catch (e) {
  console.warn(`Portail client non créé (${e.message}). Active-le dans le tableau de bord Stripe : Paramètres > Billing > Portail client.`);
}

const conf = fileURLToPath(new URL("../wrangler.jsonc", import.meta.url));
let txt = readFileSync(conf, "utf8");
const set = (name, value) => { txt = txt.replace(new RegExp(`("${name}"\\s*:\\s*)"[^"]*"`), `$1"${value}"`); };
PRICES.forEach(p => set(p.var, p.id));
set("STRIPE_PORTAL_CONFIG", portalId);
writeFileSync(conf, txt);
console.log(`\nwrangler.jsonc mis à jour (${live ? "boutique réelle" : "mode test"}). Prochaine étape : npx wrangler deploy`);
