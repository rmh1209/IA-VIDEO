/* API de l'appli : coach IA (diffusé en direct), paiement Stripe et jetons d'accès. Aucun compte : la preuve d'achat
   est un jeton signé rangé sur le téléphone, que l'on peut recopier sur un autre appareil. */
import { validate, coachTurn, errorCode, RequestError } from "./coach.js";
import { signToken, readToken } from "./tokens.js";
import { stripe, periodEnd } from "./stripe.js";
import { takeQuota, limits, bump } from "./quota.js";

const DAY = 864e5, GRACE = 3 * DAY;
const DEVICE = /^[A-Za-z0-9_-]{16,64}$/;
const ACTIVE = ["active", "trialing", "past_due"];
const RENONCIATION = "En validant, tu demandes l'accès immédiat au contenu numérique et tu reconnais perdre ton droit de rétractation (article L221-28 du Code de la consommation).";

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const fail = (code, status) => json({ error: code }, status);
const bad = detail => new RequestError("invalid_request", 400, detail);
const originOf = request => new URL(request.url).origin;
// adresse IP jamais stockée en clair : seule une empreinte sert aux plafonds journaliers (effacée après 2 jours)
const ipOf = async request => {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("fonte:" + (request.headers.get("CF-Connecting-IP") || "local")));
  return [...new Uint8Array(d)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
};
const today = () => new Date().toISOString().slice(0, 10);

const coachReady = env => !!(env.ANTHROPIC_API_KEY && env.QUOTAS);
const payReady = env => !!(env.STRIPE_SECRET_KEY && env.ACCESS_SECRET && env.STRIPE_PRICE_FONTE && env.STRIPE_PRICE_PREMIUM && env.STRIPE_PRICE_PREMIUM_REDUIT && env.QUOTAS);

async function readJson(request, max) {
  if ((+request.headers.get("content-length") || 0) > max) throw new RequestError("prompt_too_large", 413);
  const text = await request.text();
  if (text.length > max) throw new RequestError("prompt_too_large", 413);
  try { return JSON.parse(text) || {}; } catch (e) { throw bad("JSON illisible"); }
}

/* jetons présentés par l'appli : { fonte, premium } */
async function accessOf(env, acces) {
  const a = acces && typeof acces === "object" ? acces : {};
  const fonte = await readToken(a.fonte, env.ACCESS_SECRET), premium = await readToken(a.premium, env.ACCESS_SECRET);
  return { fonte: fonte && fonte.p === "fonte" ? fonte : null, premium: premium && premium.p === "premium" ? premium : null };
}

/* ===== Coach ===== */
async function coach(request, env, ctx) {
  if (!coachReady(env)) return fail("coach_off", 503);
  const body = await readJson(request, 300000);
  const req = validate(body);
  if (!DEVICE.test(String(body.device || ""))) throw bad("identifiant d'appareil");
  const access = await accessOf(env, body.acces);
  const q = await takeQuota(env, { kind: req.kind, newQuestion: req.newQuestion, device: body.device, ip: await ipOf(request), access });
  if (!q.ok) return fail(q.code, q.status);

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter(), enc = new TextEncoder(), ctl = new AbortController();
  if (request.signal) request.signal.addEventListener("abort", () => ctl.abort());
  let open = true, wrote = false;
  const send = obj => {
    if (!open) return;
    writer.write(enc.encode(JSON.stringify(obj) + "\n")).catch(() => { open = false; ctl.abort(); });
  };
  const ping = setInterval(() => send({ t: "ping" }), 15000); // garde la connexion ouverte pendant que le modèle réfléchit
  const run = (async () => {
    try {
      const m = await coachTurn(env, req, { signal: ctl.signal, onText: d => { wrote = true; send({ t: "text", d }); }, onReset: () => send({ t: "reset" }) });
      send({ t: "done", m, ...(q.left != null ? { left: q.left } : {}) });
    } catch (e) {
      const { code } = errorCode(e);
      if (code !== "cancelled") console.error("coach", code, e && e.status, e && e.message);
      // question offerte rendue si le coach n'a rien pu répondre
      if (q.left != null && !wrote && code !== "cancelled") await refund(env, body.device);
      send({ t: "error", code });
    } finally {
      clearInterval(ping);
      await writer.close().catch(() => { /* appli déjà partie */ });
    }
  })();
  ctx.waitUntil(run);
  return new Response(readable, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
async function refund(env, device) {
  try {
    const key = `q:${device}`, n = +(await env.QUOTAS.get(key)) || 0;
    if (n > 0) await env.QUOTAS.put(key, String(n - 1), { expirationTtl: 15552000 });
  } catch (e) { /* tant pis : la question reste comptée */ }
}

/* ===== Paiement ===== */
async function premiumToken(env, sub) {
  if (!sub || !ACTIVE.includes(sub.status)) return { jeton: null, statut: "termine" };
  const end = periodEnd(sub) * 1000 || Date.now() + 32 * DAY, exp = end + GRACE;
  const cus = typeof sub.customer === "string" ? sub.customer : sub.customer && sub.customer.id;
  return { jeton: await signToken({ p: "premium", id: sub.id, cus: cus || null, exp }, env.ACCESS_SECRET), exp, statut: "actif" };
}

async function checkout(request, env) {
  const body = await readJson(request, 8000);
  const produit = body.produit === "fonte" || body.produit === "premium" ? body.produit : null;
  if (!produit) throw bad("produit");
  const base = originOf(request), acc = await accessOf(env, body.acces);
  const common = { locale: "fr", allow_promotion_codes: true, metadata: { produit }, custom_text: { submit: { message: RENONCIATION } } };
  const params = produit === "fonte"
    ? { ...common, mode: "payment", customer_creation: "always", line_items: [{ price: env.STRIPE_PRICE_FONTE, quantity: 1 }],
        success_url: `${base}/index.html?achat={CHECKOUT_SESSION_ID}`, cancel_url: `${base}/index.html?achat=annule` }
    : { ...common, mode: "subscription", line_items: [{ price: acc.fonte ? env.STRIPE_PRICE_PREMIUM_REDUIT : env.STRIPE_PRICE_PREMIUM, quantity: 1 }],
        subscription_data: { metadata: { produit, reduit: acc.fonte ? "oui" : "non" } },
        success_url: `${base}/carnet.html?achat={CHECKOUT_SESSION_ID}#offre`, cancel_url: `${base}/carnet.html?achat=annule#offre` };
  const s = await stripe(env, "POST", "/v1/checkout/sessions", params);
  return json({ url: s.url });
}

/* retour de la page de paiement : vérifie la session Stripe et remet le jeton d'accès */
async function confirm(request, env) {
  const body = await readJson(request, 4000);
  const id = String(body.session || "");
  if (!/^cs_[A-Za-z0-9_]{8,250}$/.test(id)) throw bad("session");
  const s = await stripe(env, "GET", `/v1/checkout/sessions/${id}`, { expand: ["subscription"] });
  if (s.status !== "complete" || !["paid", "no_payment_required"].includes(s.payment_status)) return fail("not_paid", 402);
  const produit = s.metadata && s.metadata.produit;
  if (produit === "fonte" && s.mode === "payment") {
    const cus = typeof s.customer === "string" ? s.customer : s.customer && s.customer.id;
    return json({ produit, jeton: await signToken({ p: "fonte", id: s.id, cus: cus || null, exp: 0 }, env.ACCESS_SECRET), statut: "actif" });
  }
  if (produit === "premium" && s.mode === "subscription" && s.subscription) {
    const sub = typeof s.subscription === "string" ? await stripe(env, "GET", `/v1/subscriptions/${s.subscription}`) : s.subscription;
    return json({ produit, ...(await premiumToken(env, sub)) });
  }
  throw bad("session inattendue");
}

/* vérifie ou restaure des jetons (autre appareil, abonnement renouvelé ou arrêté) */
async function accessCheck(request, env) {
  const body = await readJson(request, 8000);
  const list = Array.isArray(body.jetons) ? body.jetons.slice(0, 4) : [];
  const out = { fonte: null, premium: null, statut: null, exp: null };
  for (const t of list) {
    const p = await readToken(t, env.ACCESS_SECRET, { allowExpired: true });
    if (!p) continue;
    if (p.p === "fonte" && !out.fonte) out.fonte = t;
    if (p.p === "premium" && !out.premium) {
      let sub = null;
      try { sub = await stripe(env, "GET", `/v1/subscriptions/${encodeURIComponent(p.id)}`); }
      catch (e) { if (e.status !== 404) throw e; }
      const r = await premiumToken(env, sub);
      Object.assign(out, { premium: r.jeton, statut: r.statut, exp: r.exp || null });
    }
  }
  return json(out);
}

/* portail client Stripe : changer de carte, factures, résiliation */
async function portal(request, env) {
  const body = await readJson(request, 4000);
  const p = await readToken(body.jeton, env.ACCESS_SECRET, { allowExpired: true });
  if (!p || !p.cus) return fail("invalid_token", 400);
  const s = await stripe(env, "POST", "/v1/billing_portal/sessions", { customer: p.cus, return_url: `${originOf(request)}/carnet.html#offre`, configuration: env.STRIPE_PORTAL_CONFIG || null });
  return json({ url: s.url });
}

const PAY = { "/api/checkout": checkout, "/api/checkout/confirm": confirm, "/api/access": accessCheck, "/api/portal": portal };

export async function handleApi(request, env, ctx) {
  const path = new URL(request.url).pathname;
  try {
    if (path === "/api/config") return request.method === "GET" ? json({ coach: coachReady(env), paiement: payReady(env), questions: limits(env).freeQuestions }) : fail("method_not_allowed", 405);
    if (!(path === "/api/coach" || PAY[path])) return fail("not_found", 404);
    if (request.method !== "POST") return fail("method_not_allowed", 405);
    // l'API ne sert que l'appli : refuse les requêtes envoyées depuis un autre site
    const origin = request.headers.get("Origin");
    if (origin && origin !== originOf(request)) return fail("forbidden", 403);
    if (path === "/api/coach") return await coach(request, env, ctx);
    if (!payReady(env)) return fail("payments_off", 503);
    if ((await bump(env.QUOTAS, `s:${await ipOf(request)}:${today()}`, limits(env).stripePerIp, 172800)) < 0) return fail("daily_limit", 429);
    return await PAY[path](request, env);
  } catch (e) {
    if (e instanceof RequestError) return fail(e.code, e.status);
    console.error("api", path, e && e.status, e && e.message);
    return fail(e && e.status ? "payment_error" : "upstream_error", 502);
  }
}
