// API du serveur dans workerd : coach (flux, outils, relance, repli, refus, erreurs), quotas, paiement, jetons, portail
import { startStack, ask, post, BASE } from "./srv/harness.mjs";

const R = {};
const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra ?? null).slice(0, 900); };
const dev = n => ("appareil-de-test-" + n).padEnd(24, "x");
const CTX = "=== CONTEXTE DE L'UTILISATEUR ===\nProgramme actuel :\nSéance 1 (lundi) · Full body A\n  1. Goblet squat — 3 × 8 à 12, repos 2 min, RIR 2";
const TOOLS = [
  { name: "chercher_exercices", description: "Cherche dans la base.", input_schema: { type: "object", properties: { texte: { type: "string" } } } },
  { name: "remplacer_exercice", description: "Remplace un exercice.", input_schema: { type: "object", properties: { ancien: { type: "string" }, nouveau: { type: "string" }, seance: { type: "integer" } }, required: ["ancien", "nouveau"] } }
];
const q = (text, extra = {}) => ({ kind: "coach", device: dev(extra.d || 1), consentement: 1, tools: TOOLS, messages: [{ role: "user", content: [{ type: "text", text: CTX }, { type: "text", text }] }], ...extra });

const stack = await startStack();
try {
  const cfg = await (await fetch(BASE + "/api/config")).json();
  check("config", cfg.coach === true && cfg.paiement === true && cfg.legal === true && cfg.questions === 3, cfg);
  // sans l'accord explicite de la personne, rien ne part vers Claude
  const nc = stack.mocks.state.claude.length, noConsent = await ask({ ...q("Bonjour"), consentement: undefined });
  check("accord_exige", noConsent.status === 400 && noConsent.json.error === "consent_required" && stack.mocks.state.claude.length === nc, noConsent);
  const ed = await (await fetch(BASE + "/legal/editeur.js")).text();
  check("editeur_depuis_config", ed.includes("Camille Martin") && ed.includes("Médiateur de test"), ed.slice(0, 120));

  // question simple : texte au fil de l'eau, réponse complète renvoyée, paramètres envoyés à Claude
  const a = await ask(q("Bonjour coach", { d: 1 }));
  const sent = stack.mocks.state.claude.at(-1), b = sent.body;
  check("question_simple", a.status === 200 && a.text === "Bonjour ! Voici ma réponse de coach." && a.done.m.stop_reason === "end_turn" && a.done.m.content[0].type === "thinking" && a.done.m.content[0].signature === "sig_q" && a.done.left === 2, a);
  check("parametres_claude", b.model === "claude-opus-5-5" && b.stream === true && b.max_tokens === 16000 && b.thinking.type === "adaptive" && b.thinking.block_binding.prefix_mismatch_behavior === "drop_block"
    && b.output_config.effort === "medium" && b.cache_control.type === "ephemeral" && b.fallbacks === "default" && b.system[0].cache_control.type === "ephemeral"
    && b.system[0].text.startsWith("TU ES LE COACH FONTE") && b.system[0].text.includes("DANS L'APPLI FONTE") && b.tools.every(t => t.eager_input_streaming === true)
    && /server-side-fallback-2026-07-01/.test(sent.headers["anthropic-beta"]) && /thinking-binding-controls-2026-08-01/.test(sent.headers["anthropic-beta"]), { b: { ...b, system: b.system[0].text.slice(0, 40) }, beta: sent.headers["anthropic-beta"] });
  const deep = await ask(q("Bonjour", { d: 9, tier: "complex" }));
  const bd = stack.mocks.state.claude.at(-1).body;
  check("analyse_approfondie", deep.done && bd.output_config.effort === "high" && bd.max_tokens === 32000, bd.output_config);

  // outils : la boucle tourne dans l'appli, le serveur valide la reprise
  const t1 = await ask(q("Remplace le goblet squat", { d: 2 }));
  const use1 = t1.done.m.content.find(c => c.type === "tool_use");
  const m1 = [...q("").messages.slice(0, 0), { role: "user", content: [{ type: "text", text: CTX }, { type: "text", text: "Remplace le goblet squat" }] }, { role: "assistant", content: t1.done.m.content }, { role: "user", content: [{ type: "tool_result", tool_use_id: use1.id, content: JSON.stringify([{ nom: "Presse à cuisses" }]) }] }];
  const t2 = await ask({ kind: "coach", device: dev(2), consentement: 1, tools: TOOLS, messages: m1 });
  const use2 = t2.done && t2.done.m.content.find(c => c.type === "tool_use");
  const echoed = stack.mocks.state.claude.at(-1).body.messages[1].content;
  check("outils_tour1", use1 && use1.name === "chercher_exercices" && use1.input.texte === "pectoraux" && t1.done.m.stop_reason === "tool_use" && t1.done.left === 2, t1.done);
  check("outils_tour2_reprise", use2 && use2.name === "remplacer_exercice" && use2.input.ancien === "Goblet squat" && t2.done.left === undefined && echoed[0].type === "thinking" && echoed[0].signature === "sig_t1", { t2: t2.done, echoed });
  const m2 = [...m1, { role: "assistant", content: t2.done.m.content }, { role: "user", content: [{ type: "tool_result", tool_use_id: use2.id, content: "{\"ok\":true}" }] }];
  const t3 = await ask({ kind: "coach", device: dev(2), consentement: 1, tools: TOOLS, messages: m2 });
  check("outils_tour3_final", t3.text.includes("presse à cuisses") && t3.done.m.stop_reason === "end_turn", t3);

  // entrée d'outil illisible : le tour est relancé et l'appli efface le texte du premier essai
  const j = await ask(q("json cassé, remplace", { d: 3 }));
  const ti = j.events.findIndex(e => e.t === "text"), ri = j.events.findIndex(e => e.t === "reset");
  check("relance_json_casse", ti >= 0 && ri > ti && j.done && j.done.m.content.some(c => c.type === "tool_use" && c.id === "toolu_1"), j.events.map(e => e.t));

  // repli sur un autre modèle en cours de réponse : réflexion et appel d'outil d'avant le repli écartés
  const f = await ask(q("Question qui part en repli", { d: 4 }));
  const types = f.done && f.done.m.content.map(c => c.type + (c.signature ? ":" + c.signature : ""));
  check("repli_modele", f.text === "Début de réponse. Suite par le modèle de repli." && JSON.stringify(types) === JSON.stringify(["text", "fallback", "thinking:sig_apres", "text"]), types);

  // refus, surcharge (question offerte rendue), réponse coupée
  const r = await ask(q("refus total", { d: 5 }));
  check("refus", r.done && r.done.m.stop_reason === "refusal" && r.done.m.content.length === 0, r.done);
  const s = await ask(q("surcharge", { d: 6 }));
  const s2 = await ask(q("Bonjour", { d: 6 }));
  check("surcharge_question_rendue", s.error && s.error.code === "overloaded" && s2.done && s2.done.left === 2, { s: s.error, left: s2.done && s2.done.left });
  const c = await ask(q("réponse coupe", { d: 7 }));
  check("reponse_coupee", c.done && c.done.m.stop_reason === "max_tokens", c.done);

  // 3 questions offertes par appareil, puis paiement demandé
  const dq = 8, lefts = [];
  for (let i = 0; i < 3; i++) lefts.push((await ask(q("Question " + i, { d: dq }))).done.left);
  const over = await ask(q("Question 4", { d: dq }));
  check("questions_offertes", JSON.stringify(lefts) === "[2,1,0]" && over.status === 402 && over.json.error === "quota", { lefts, over });

  // contrôles d'entrée
  const img = await ask({ kind: "coach", device: dev(10), messages: [{ role: "user", content: [{ type: "image", source: { type: "url", url: "http://x" } }] }] });
  const orphan = await ask({ kind: "coach", device: dev(10), messages: [{ role: "user", content: "a" }, { role: "assistant", content: [{ type: "text", text: "b" }] }, { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_x", content: "c" }] }] });
  const badTool = await ask({ ...q("x", { d: 10 }), tools: [{ name: "executer_code", description: "x", input_schema: { type: "object" } }] });
  const cc = await ask({ kind: "coach", device: dev(10), messages: [{ role: "user", content: [{ type: "text", text: "x", cache_control: { type: "ephemeral" } }] }] });
  const noDev = await ask({ ...q("x"), device: "court" });
  const xsite = await ask(q("x", { d: 10 }), { Origin: "https://autre-site.example" });
  const get = await fetch(BASE + "/api/coach");
  const huge = await ask(q("x".repeat(250000), { d: 10 }));
  check("controles_entree", img.status === 400 && orphan.status === 400 && badTool.status === 400 && cc.status === 400 && noDev.status === 400 && xsite.status === 403 && get.status === 405 && huge.status === 413,
    [img.status, orphan.status, badTool.status, cc.status, noDev.status, xsite.status, get.status, huge.status]);

  // analyse du carnet : réservée à Premium
  const ana = { kind: "analyse", device: dev(11), consentement: 1, messages: [{ role: "user", content: "=== MISSION DANS FONTE SUIVI ===\nanalyse\n=== SES SÉANCES (8 dernières semaines) ===\n..." }] };
  const a0 = await ask(ana);
  check("analyse_premium_requis", a0.status === 402 && a0.json.error === "premium_required", a0);

  // achat du programme (19 €) : Checkout, page Stripe, retour, jeton
  const noAccord = await post("/api/checkout", { produit: "fonte" });
  check("paiement_sans_accord_refuse", noAccord.status === 400 && noAccord.json.error === "consent_required", noAccord);
  const co = await post("/api/checkout", { produit: "fonte", accord: true });
  const sess = Object.values(stack.mocks.state.sessions).at(-1);
  const coReq = stack.mocks.state.stripe.find(x => x.path === "/v1/checkout/sessions");
  const pay = await fetch(sess.url + "/ok", { redirect: "manual" });
  const back = new URL(pay.headers.get("location"));
  const sid = back.searchParams.get("achat");
  const cf = await post("/api/checkout/confirm", { session: sid });
  check("achat_programme", co.json.url === sess.url && coReq.body.mode === "payment" && coReq.body["line_items[0][price]"] === "price_fonte" && coReq.body.locale === "fr" && coReq.body["custom_text[submit][message]"].includes("L221-28")
    && back.pathname === "/index.html" && cf.status === 200 && cf.json.produit === "fonte" && typeof cf.json.jeton === "string", { co, coReq: coReq && coReq.body, back: String(back), cf });
  const fonteTok = cf.json.jeton;
  const unpaid = await post("/api/checkout", { produit: "fonte", accord: true });
  const sess2 = Object.values(stack.mocks.state.sessions).at(-1);
  const np = await post("/api/checkout/confirm", { session: sess2.id });
  check("session_non_payee", unpaid.status === 200 && np.status === 402 && np.json.error === "not_paid", np);

  // avec le jeton : coach sans limite des questions offertes
  const paidAsks = [];
  for (let i = 0; i < 4; i++) paidAsks.push(await ask(q("Question payante " + i, { d: 12, acces: { fonte: fonteTok } })));
  check("coach_illimite_apres_achat", paidAsks.every(x => x.done && x.done.left === undefined), paidAsks.map(x => x.status));
  const forged = fonteTok.replace(/^.{12}/, m => m.slice(0, 11) + (m[11] === "A" ? "B" : "A"));
  const fq = []; for (let i = 0; i < 4; i++) fq.push(await ask(q("Q " + i, { d: 13, acces: { fonte: forged } })));
  check("jeton_falsifie_refuse", fq[3].status === 402 && fq[3].json.error === "quota", fq.map(x => x.status));

  // abonnement Premium : prix réduit avec le programme, plein tarif sinon
  const pr = await post("/api/checkout", { produit: "premium", accord: true, acces: { fonte: fonteTok } });
  const prReq = stack.mocks.state.stripe.filter(x => x.path === "/v1/checkout/sessions").at(-1);
  const full = await post("/api/checkout", { produit: "premium", accord: true });
  const fullReq = stack.mocks.state.stripe.filter(x => x.path === "/v1/checkout/sessions").at(-1);
  check("prix_premium", pr.status === 200 && prReq.body.mode === "subscription" && prReq.body["line_items[0][price]"] === "price_reduit" && fullReq.body["line_items[0][price]"] === "price_premium" && prReq.body.success_url.includes("/carnet.html?achat={CHECKOUT_SESSION_ID}#offre"), { pr: prReq.body, full: fullReq.body["line_items[0][price]"] });
  const psess = Object.values(stack.mocks.state.sessions).find(x => x.url === pr.json.url);
  const ppay = await fetch(psess.url + "/ok", { redirect: "manual" });
  const pid = new URL(ppay.headers.get("location")).searchParams.get("achat");
  const pc = await post("/api/checkout/confirm", { session: pid });
  check("abonnement_premium", pc.status === 200 && pc.json.produit === "premium" && pc.json.statut === "actif" && pc.json.exp > Date.now() + 32 * 864e5, pc.json);
  const premTok = pc.json.jeton;
  const a1 = await ask({ ...ana, acces: { premium: premTok } });
  check("analyse_avec_premium", a1.done && a1.text.includes("Ce qui progresse") && a1.done.left === undefined, a1);

  // restauration sur un autre appareil, puis abonnement arrêté
  const ac = await post("/api/access", { jetons: [fonteTok, premTok, "n'importe.quoi"] });
  check("restauration", ac.json.fonte === fonteTok && typeof ac.json.premium === "string" && ac.json.statut === "actif", ac.json);
  // résiliation : effet à la fin du mois payé, l'accès continue jusque-là
  const rs = await post("/api/resiliation", { jeton: premTok });
  const rs2 = await post("/api/resiliation", { jeton: premTok });
  const afterRs = await post("/api/access", { jetons: [premTok] });
  const subRs = Object.values(stack.mocks.state.subs).at(-1);
  check("resiliation", rs.status === 200 && rs.json.statut === "resilie" && rs.json.fin > Date.now() + 29 * 864e5 && rs.json.ref === subRs.id && rs.json.editeur.nom === "Camille Martin" && subRs.cancel_at_period_end === true
    && rs2.status === 200 && typeof afterRs.json.premium === "string" && afterRs.json.resilie === true, { rs: rs.json, rs2: rs2.status, afterRs: afterRs.json });
  const badRs = await post("/api/resiliation", { jeton: fonteTok });
  check("resiliation_jeton_programme_refuse", badRs.status === 400, badRs);
  const portal = await post("/api/portal", { jeton: premTok });
  check("portail_client", portal.status === 200 && portal.json.url.includes("customer=cus_test_") && decodeURIComponent(portal.json.url).includes("/carnet.html#offre"), portal.json);
  Object.values(stack.mocks.state.subs).forEach(sub => { sub.status = "canceled"; });
  const ended = await post("/api/access", { jetons: [premTok] });
  check("abonnement_arrete", ended.json.premium === null && ended.json.statut === "termine", ended.json);
  const authOk = stack.mocks.state.stripe.every(x => x.auth === "Bearer sk_test_mock");
  check("cle_stripe_cote_serveur", authOk);
} catch (e) {
  R.exception = String(e && e.stack || e);
} finally {
  await stack.stop();
}
const errs = stack.logs.join("").split("\n").filter(l => /✘|Uncaught|TypeError|ReferenceError/.test(l) && !/coach overloaded 529/.test(l));
R.wrangler_errors = errs.slice(0, 8);
console.log(JSON.stringify(R, null, 1));
