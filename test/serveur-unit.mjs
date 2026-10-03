// Garde-fou : en mode réel (clé sk_live_), pas de paiement tant que les mentions légales de l'éditeur manquent
import { handleApi, legalComplete } from "../server/src/api.js";
const kv = new Map(), QUOTAS = { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } };
const base = { QUOTAS, ACCESS_SECRET: "x".repeat(40), ANTHROPIC_API_KEY: "k", STRIPE_PRICE_FONTE: "p1", STRIPE_PRICE_PREMIUM: "p2", STRIPE_PRICE_PREMIUM_REDUIT: "p3" };
const ED = { EDITEUR_NOM: "A", EDITEUR_STATUT: "EI", EDITEUR_ADRESSE: "1 rue", EDITEUR_EMAIL: "a@b.fr", EDITEUR_TELEPHONE: "01", EDITEUR_SIRET: "1", EDITEUR_TVA: "293 B", EDITEUR_DIRECTEUR: "A", MEDIATEUR_NOM: "M", MEDIATEUR_SITE: "m.fr" };
const cfg = async env => (await handleApi(new Request("https://fonte.example/api/config"), env, { waitUntil() {} })).json();
const R = {};
const live = await cfg({ ...base, STRIPE_SECRET_KEY: "sk_live_abc" });
const liveOk = await cfg({ ...base, ...ED, STRIPE_SECRET_KEY: "sk_live_abc" });
const test = await cfg({ ...base, STRIPE_SECRET_KEY: "sk_test_abc" });
const partial = { ...ED, MEDIATEUR_SITE: "" };
R.reel_sans_mentions_bloque = live.paiement === false && live.legal === false ? "OK" : "FAIL " + JSON.stringify(live);
R.reel_avec_mentions = liveOk.paiement === true && liveOk.legal === true ? "OK" : "FAIL " + JSON.stringify(liveOk);
R.test_sans_mentions_autorise = test.paiement === true && test.legal === false ? "OK" : "FAIL " + JSON.stringify(test);
R.mentions_incompletes = !legalComplete(partial) && legalComplete(ED) ? "OK" : "FAIL";
const checkoutLive = await handleApi(new Request("https://fonte.example/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://fonte.example" }, body: JSON.stringify({ produit: "fonte", accord: true }) }), { ...base, STRIPE_SECRET_KEY: "sk_live_abc" }, { waitUntil() {} });
R.paiement_reel_refuse = checkoutLive.status === 503 ? "OK" : "FAIL " + checkoutLive.status;
// preuve de l'accord enregistrée (appareil, date, version), même si l'appel au modèle échoue ensuite
const waits = [];
const coachEnv = { ...base, ...ED, STRIPE_SECRET_KEY: "sk_test_abc", ANTHROPIC_BASE_URL: "http://127.0.0.1:9" };
const dev = "appareil-preuve-accord-xx";
const res = await handleApi(new Request("https://fonte.example/api/coach", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://fonte.example" }, body: JSON.stringify({ kind: "coach", device: dev, consentement: 1, messages: [{ role: "user", content: "Bonjour" }] }) }), coachEnv, { waitUntil: p => waits.push(p) });
await res.text().catch(() => {});
await Promise.allSettled(waits);
const proof = kv.get("c:" + dev);
R.preuve_accord = proof && JSON.parse(proof).v === 1 && JSON.parse(proof).premier ? "OK" : "FAIL " + proof;
console.log(JSON.stringify(R, null, 1));
