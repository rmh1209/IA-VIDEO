// De bout en bout : l'appli servie par le vrai serveur (workerd), dans un navigateur, avec le faux Claude et le faux Stripe
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { startStack, BASE } from "./srv/harness.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const DIR = path.dirname(fileURLToPath(import.meta.url));

const R = {}, errors = [];
const check = (name, cond, extra) => { R[name] = cond ? "OK" : "FAIL " + JSON.stringify(extra ?? null).slice(0, 900); };
const quiet = async (p, tag) => {
  await p.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await p.route("https://fonts.gstatic.com/**", r => r.abort());
  await p.route("https://cdnjs.cloudflare.com/**", r => r.abort());
  p.on("pageerror", e => errors.push(tag + " pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(tag + " console: " + m.text()); });
};
const lastAssistant = page => page.evaluate(() => { const m = chat.filter(x => x.role === "assistant").pop(); return m ? { content: m.content, note: m.note || "", actions: m.actions.map(a => a.txt), retry: !!m.retry } : null; });
const waitIdle = page => page.waitForFunction(() => !busy, null, { timeout: 20000 });

const stack = await startStack();
const claude = stack.mocks.state.claude;
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  const page = await ctx.newPage();
  await quiet(page, "programme");
  await page.goto(BASE + "/index.html?source=pwa");
  await page.waitForSelector("#go");
  await page.click("#go");
  await page.waitForSelector("#panel-prog .day");
  await page.click("#tab-coach");
  await page.waitForFunction(() => coachState === "ready", null, { timeout: 10000 });
  const gate = await page.evaluate(() => ({ consent: !!document.querySelector("#coach-off .pwa-consent"), form: document.querySelector("#coach-form").hidden, sugg: document.querySelector("#coach-sugg").hidden, btn: document.querySelector("[data-pwa-consent]").disabled, txt: document.querySelector(".pwa-consent").textContent }));
  check("accord_avant_le_coach", gate.consent && gate.form && gate.sugg && gate.btn && /intelligence artificielle/.test(gate.txt) && /15 ans/.test(gate.txt) && /santé/.test(gate.txt), gate);
  await page.screenshot({ path: path.join(DIR, "serveur-accord.png") });
  const callsBefore = claude.length;
  await page.check("[data-pwa-consent-box]");
  await page.click("[data-pwa-consent]");
  await page.waitForSelector("#coach-form:not([hidden])");
  const shell = await page.evaluate(() => ({ off: document.querySelector("#coach-off").hidden, quota: document.querySelector("#coach-quota").textContent, pay: FONTE_PWA.payOn(), coach: FONTE_PWA.coachOn(), accord: JSON.parse(localStorage.getItem("fonte.accord.coach")) }));
  check("coach_disponible", shell.off && shell.pay && shell.coach && shell.quota === "3 questions offertes" && shell.accord && shell.accord.v === 1 && claude.length === callsBefore, shell);

  // 1re question : réponse diffusée, cerveau dans le prompt système, contexte en premier message
  await page.fill("#coach-input", "Bonjour coach, tu peux m'aider ?");
  await page.click("#coach-send");
  await waitIdle(page);
  const a1 = await lastAssistant(page), req1 = claude.at(-1).body;
  const quota1 = await page.textContent("#coach-quota");
  check("question_reponse", a1.content === "Bonjour ! Voici ma réponse de coach." && quota1 === "2 questions offertes", { a1, quota1 });
  const first = req1.messages[0].content;
  check("prompt_serveur", req1.system[0].text.startsWith("TU ES LE COACH FONTE") && first[0].text.startsWith("=== CONTEXTE DE L'UTILISATEUR") && first[1].text === "Bonjour coach, tu peux m'aider ?"
    && req1.tools.length === 8 && req1.tools.every(t => t.eager_input_streaming) && !JSON.stringify(req1.messages).includes("TU ES LE COACH FONTE"), { first: first.map(b => b.text.slice(0, 50)), tools: req1.tools.length });

  // 2e question : le coach cherche puis remplace un exercice ; les outils tournent dans l'appli
  const before = await page.evaluate(() => plan.sessions[0].ex[0].n);
  const n0 = claude.length;
  await page.fill("#coach-input", `Remplace « ${before} » par autre chose`);
  await page.click("#coach-send");
  await waitIdle(page);
  const a2 = await lastAssistant(page), after = await page.evaluate(() => plan.sessions[0].ex[0].n);
  const reqs = claude.slice(n0).map(x => x.body);
  const r3 = reqs[2] || { messages: [] };
  const echo = r3.messages.at(-4);
  const toolRes = r3.messages.at(-3) && r3.messages.at(-3).content[0];
  // l'historique ne fait que s'allonger d'un tour à l'autre (condition pour que les blocs de réflexion restent valides)
  const prefix = (a, b) => a && b && JSON.stringify(b.messages.slice(0, a.messages.length)) === JSON.stringify(a.messages);
  const appendOnly = prefix(reqs[0], reqs[1]) && prefix(reqs[1], reqs[2]) && JSON.stringify(reqs[0].system) === JSON.stringify(reqs[2].system) && JSON.stringify(reqs[0].tools) === JSON.stringify(reqs[2].tools);
  check("outils_dans_l_appli", reqs.length === 3 && after === "Presse à cuisses" && a2.actions.length === 1 && a2.content.includes("presse à cuisses") && (await page.textContent("#coach-quota")) === "1 question offerte", { n: reqs.length, before, after, a2 });
  check("historique_renvoye_tel_quel", appendOnly && echo && echo.role === "assistant" && echo.content[0].type === "thinking" && echo.content[0].signature === "sig_t1" && toolRes.type === "tool_result" && toolRes.tool_use_id === "toolu_1" && /nom/.test(toolRes.content), { appendOnly, echo, toolRes: toolRes && { ...toolRes, content: String(toolRes.content).slice(0, 120) } });
  // annuler la modification faite par le coach
  await page.click('#coach-log [data-act="undo"]');
  check("annuler_modif_coach", (await page.evaluate(() => plan.sessions[0].ex[0].n)) === before);

  // entrée d'outil illisible : le texte du premier essai disparaît
  await page.fill("#coach-input", "json cassé : remplace le squat");
  await page.click("#coach-send");
  await waitIdle(page);
  const a3 = await lastAssistant(page);
  check("relance_sans_texte_fantome", !a3.content.includes("premier essai") && a3.content.includes("presse à cuisses"), a3);
  const q3 = await page.textContent("#coach-quota");

  // questions offertes épuisées : mur de paiement ; réinstallation simulée, le serveur garde le compte
  const wall1 = await page.evaluate(() => !!document.querySelector("#coach-log .paywall"));
  await page.evaluate(() => { freeUsed = 0; renderLog(); renderQuota(); });
  const nq = claude.length;
  await page.fill("#coach-input", "Encore une question");
  await page.click("#coach-send");
  await waitIdle(page);
  const wall2 = await page.evaluate(() => ({ wall: !!document.querySelector("#coach-log .paywall"), msgs: chat.length, demo: document.querySelector("#coach-log .paywall .demo").textContent }));
  check("questions_offertes_serveur", q3 === "Questions offertes utilisées" && wall1 && wall2.wall && claude.length === nq && wall2.demo.includes("Déjà payé"), { q3, wall1, wall2, calls: claude.length - nq });

  // paiement du programme : page Stripe, retour, déblocage
  await page.click("#coach-log .paywall .unlock");
  await page.waitForSelector(".pwa-box [data-buy]");
  const sheetFonte = await page.evaluate(() => ({ txt: document.querySelector(".pwa-box").textContent, disabled: document.querySelector("[data-buy]").disabled, cgv: document.querySelector('.pwa-box a[href="legal/conditions.html"]') !== null }));
  await page.screenshot({ path: path.join(DIR, "serveur-feuille-achat.png") });
  await page.check("[data-buy-ok]");
  await page.click("[data-buy]");
  await page.waitForURL(/127\.0\.0\.1:8793\/payer\//);
  const coFonte = stack.mocks.state.stripe.filter(x => x.path === "/v1/checkout/sessions").at(-1).body;
  check("feuille_achat_accord", sheetFonte.disabled && sheetFonte.cgv && /19 € TTC/.test(sheetFonte.txt) && /droit de rétractation/.test(sheetFonte.txt) && coFonte["metadata[accord_immediat]"] === "oui" && coFonte["invoice_creation[enabled]"] === "true" && /L221-28/.test(coFonte["invoice_creation[invoice_data][footer]"]) && coFonte.submit_type === "pay", { sheetFonte, coFonte });
  const price = await page.textContent("#prix");
  await page.click("#payer");
  await page.waitForURL(u => u.href.startsWith(BASE + "/index.html"));
  await page.waitForFunction(() => unlocked === true, null, { timeout: 10000 });
  const paid = await page.evaluate(() => ({ url: location.href, toast: document.querySelector("#toast").textContent, locked: document.querySelectorAll("#panel-prog .day.locked, #panel-prog .paywall").length, has: FONTE_PWA.has("fonte"), code: FONTE_PWA.accessCode() }));
  check("achat_programme", price === "price_fonte" && paid.has && !paid.url.includes("achat=") && paid.toast.includes("Fonte est débloqué") && paid.locked === 0, paid);
  await page.screenshot({ path: path.join(DIR, "serveur-achat.png") });

  // coach illimité après achat, jeton envoyé au serveur
  await page.click("#tab-coach");
  await page.fill("#coach-input", "Merci, une question de plus");
  await page.click("#coach-send");
  await waitIdle(page);
  const a4 = await lastAssistant(page), req4 = claude.at(-1);
  check("coach_apres_achat", a4.content.startsWith("Bonjour") && (await page.textContent("#coach-quota")) === "" && req4.body.messages[0].content[0].text.includes("version complète débloquée"), { a4, quota: await page.textContent("#coach-quota") });
  // surcharge : message clair et bouton Réessayer
  await page.fill("#coach-input", "surcharge");
  await page.click("#coach-send");
  await waitIdle(page);
  const a5 = await lastAssistant(page);
  check("erreur_surcharge", a5.note.includes("très demandé") && a5.retry, a5);
  await page.screenshot({ path: path.join(DIR, "serveur-coach.png"), fullPage: false });

  // carnet : achats, Premium à prix réduit
  await page.click('.appnav a[href="carnet.html#offre"]');
  await page.waitForSelector("#acces");
  const offre = await page.evaluate(() => ({ achats: [...document.querySelectorAll(".achats li")].map(li => li.className + ":" + li.textContent), btn: document.querySelector('[data-act="plan-pro"]').textContent, note: document.querySelector('[data-act="plan-pro"]').nextElementSibling.textContent }));
  check("offre_carnet", offre.achats[0].startsWith("ok:") && offre.achats[1].includes("Inactif") && offre.btn.includes("2,49 €") && offre.note.includes("Stripe"), offre);
  await page.click('[data-act="code-copy"]');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check("copier_code_acces", clip === paid.code && clip.length > 100, clip.length);
  await page.screenshot({ path: path.join(DIR, "serveur-offre.png"), fullPage: true });
  await page.click('[data-act="plan-pro"]');
  await page.waitForSelector(".pwa-box [data-buy]");
  const sheetPrem = await page.evaluate(() => document.querySelector(".pwa-box").textContent);
  await page.check("[data-buy-ok]");
  await page.click("[data-buy]");
  await page.waitForURL(/127\.0\.0\.1:8793\/payer\//);
  const coPrem = stack.mocks.state.stripe.filter(x => x.path === "/v1/checkout/sessions").at(-1).body;
  check("feuille_premium_accord", /2,49 € TTC/.test(sheetPrem) && /trois clics/.test(sheetPrem) && /L221-25/.test(coPrem["subscription_data[description]"]) && coPrem["metadata[accord_immediat]"] === "oui", { sheetPrem, coPrem });
  const pprice = await page.textContent("#prix");
  await page.click("#payer");
  await page.waitForURL(u => u.href.startsWith(BASE + "/carnet.html"));
  await page.waitForFunction(() => FONTE_PWA.has("premium"), null, { timeout: 10000 });
  await page.waitForTimeout(200);
  const prem = await page.evaluate(() => ({ url: location.href, view, badge: document.querySelector("#plan-badge").textContent, toast: document.querySelector("#toast").textContent, portal: !!document.querySelector('[data-act="portal"]'), actif: document.querySelector(".plancard.best, .plancard:last-child").textContent }));
  check("abonnement_premium", pprice === "price_reduit" && prem.view === "offre" && !prem.url.includes("achat=") && prem.badge === "Premium · −50 %" && prem.toast.includes("Bienvenue dans Premium") && prem.portal && /prochain renouvellement/.test(prem.actif), prem);

  // analyse du coach (Premium) après une vraie séance
  await page.click('.nav [data-view="seance"]');
  await page.click('[data-act=start][data-si="0"]');
  await page.waitForSelector(".livehead");
  for (let j = 0; j < 3; j++) { await page.fill(`#ex-0 .srow[data-j="${j}"] [data-f=w]`, "30"); await page.fill(`#ex-0 .srow[data-j="${j}"] [data-f=r]`, "8"); await page.click(`#ex-0 .srow[data-j="${j}"] .chk`); }
  await page.click("[data-act=finish]");
  await page.click("[data-act=save-workout]");
  await page.click('.nav [data-view="progres"]');
  await page.waitForSelector("#ai-btn:not([disabled])");
  await page.click("#ai-btn");
  await page.waitForFunction(() => !ai.busy && ai.text, null, { timeout: 15000 });
  const an = await page.evaluate(() => ({ text: ai.text, note: ai.note, html: document.querySelector("#ai-txt").textContent }));
  const reqA = claude.at(-1).body;
  check("analyse_premium", an.html.includes("Ce qui progresse") && !an.note && reqA.messages.length === 1 && reqA.messages[0].content.startsWith("=== MISSION DANS FONTE SUIVI") && !reqA.tools, { an, m: String(reqA.messages[0].content).slice(0, 60) });

  // portail client Stripe et retour
  await page.click('.nav [data-view="offre"]');
  await page.click('[data-act="portal"]');
  await page.waitForURL(/127\.0\.0\.1:8793\/portail/);
  const cus = await page.textContent("#client");
  await page.click("#retour");
  await page.waitForURL(u => u.href.startsWith(BASE + "/carnet.html"));
  check("portail_client", /^cus_test_/.test(cus) && (await page.evaluate(() => view)) === "offre", cus);

  // résiliation en trois clics : Offre > Résilier mon abonnement > Confirmer, confirmation téléchargeable
  await page.click('[data-act="resilier"]');
  await page.waitForSelector("[data-cancel-ok]");
  await page.click("[data-cancel-ok]");
  await page.waitForSelector("[data-cancel-proof]");
  const conf = await page.textContent(".pwa-box");
  const [proof] = await Promise.all([page.waitForEvent("download"), page.click("[data-cancel-proof]")]);
  const proofTxt = fs.readFileSync(await proof.path(), "utf8");
  await page.click(".pwa-box [data-sheet-close]");
  await page.waitForTimeout(150);
  const afterCancel = await page.evaluate(() => ({ card: document.querySelector(".plancard.best, .plancard:last-child").textContent, btn: !!document.querySelector('[data-act="resilier"]'), premium: FONTE_PWA.has("premium") }));
  const subNow = Object.values(stack.mocks.state.subs).at(-1);
  check("resiliation_trois_clics", /Résiliation enregistrée/.test(conf) && /Fin de l'abonnement/.test(proofTxt) && /Camille Martin/.test(proofTxt) && proof.suggestedFilename().startsWith("fonte-confirmation-resiliation-")
    && subNow.cancel_at_period_end === true && /Résiliation enregistrée/.test(afterCancel.card) && !afterCancel.btn && afterCancel.premium, { conf, proofTxt, afterCancel, sub: subNow.cancel_at_period_end });

  // tes données : export complet (portabilité), puis retrait de l'accord pour le coach
  const [exp] = await Promise.all([page.waitForEvent("download"), page.click('[data-act="data-export"]')]);
  const dumpPath = await exp.path(), dump = JSON.parse(fs.readFileSync(dumpPath, "utf8"));
  check("export_donnees", dump.appli === "fonte" && !!dump.donnees["fonte.v2"] && !!dump.donnees["fonte-suivi.v1"] && !!dump.donnees["fonte.acces.premium"] && exp.suggestedFilename().startsWith("fonte-mes-donnees-"), Object.keys(dump.donnees || {}));
  await page.click('[data-act="accord-off"]');
  await page.waitForTimeout(100);
  check("retrait_accord", (await page.evaluate(() => localStorage.getItem("fonte.accord.coach"))) === null && /pas d'accord donné/.test(await page.textContent(".datatools")));

  // pages légales servies par le serveur : informations de l'éditeur renseignées, politique de sécurité stricte
  const hIndex = await fetch(BASE + "/index.html"), hLegal = await fetch(BASE + "/legal/conditions.html");
  await page.goto(BASE + "/legal/conditions.html");
  const lg = await page.evaluate(() => ({ todo: document.querySelectorAll(".todo").length, txt: document.body.textContent }));
  check("pages_legales_serveur", lg.todo === 0 && lg.txt.includes("Camille Martin") && lg.txt.includes("Médiateur de test") && /connect-src 'self'/.test(hIndex.headers.get("content-security-policy") || "") && /frame-ancestors 'none'/.test(hLegal.headers.get("content-security-policy") || ""), { todo: lg.todo, csp: hIndex.headers.get("content-security-policy") });

  // paiement annulé
  await page.goto(BASE + "/index.html");
  await page.waitForSelector("#panel-prog .day", { state: "attached" });
  const code = await page.evaluate(() => FONTE_PWA.accessCode());

  // autre téléphone : retrouver ses achats avec le code
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  await quiet(p2, "autre-appareil");
  await p2.goto(BASE + "/carnet.html#offre");
  await p2.waitForSelector("#acces");
  const fresh = await p2.evaluate(() => ({ badge: document.querySelector("#plan-badge").textContent, achats: [...document.querySelectorAll(".achats li")].map(li => li.className) }));
  await p2.click(".restore summary");
  await p2.fill("#restore-in", "Mon code :\n" + code + "\n");
  await p2.click('[data-act="restore"]');
  await p2.waitForFunction(() => FONTE_PWA.has("premium") && FONTE_PWA.has("fonte"), null, { timeout: 10000 });
  await p2.waitForTimeout(200);
  const rest = await p2.evaluate(() => ({ badge: document.querySelector("#plan-badge").textContent, toast: document.querySelector("#toast").textContent }));
  check("restauration_autre_appareil", fresh.badge === "Gratuit" && fresh.achats.join() === "," && rest.badge === "Premium · −50 %" && rest.toast.includes("Premium est actif"), { fresh, rest });
  await p2.goto(BASE + "/index.html");
  await p2.waitForSelector("#go");
  await p2.click("#go");
  await p2.waitForSelector("#panel-prog .day");
  check("programme_debloque_ailleurs", await p2.evaluate(() => unlocked && !document.querySelector("#panel-prog .paywall")));
  // abonnement résilié côté Stripe : Premium s'arrête à la vérification suivante
  Object.values(stack.mocks.state.subs).forEach(s => { s.status = "canceled"; });
  await p2.goto(BASE + "/carnet.html#offre");
  await p2.waitForSelector("#acces");
  await p2.evaluate(() => FONTE_PWA.refresh(true));
  await p2.waitForFunction(() => !FONTE_PWA.has("premium"), null, { timeout: 10000 });
  await p2.waitForTimeout(150);
  const ended = await p2.evaluate(() => ({ badge: document.querySelector("#plan-badge").textContent, toast: document.querySelector("#toast").textContent, fonte: FONTE_PWA.has("fonte") }));
  check("fin_abonnement", ended.badge === "Gratuit" && ended.toast.includes("terminé") && ended.fonte, ended);
  // code inconnu
  await p2.click(".restore summary").catch(() => {});
  await p2.fill("#restore-in", "abcdefghijklmnopqrstuvwxyz.abcdefghijklmnopqrstuvwxyz");
  await p2.click('[data-act="restore"]');
  await p2.waitForTimeout(400);
  check("code_inconnu", (await p2.textContent("#toast")).includes("Code non reconnu"), await p2.textContent("#toast"));
  // paiement abandonné sur la page Stripe
  const p3 = await ctx2.newPage();
  await quiet(p3, "annulation");
  await p3.goto(BASE + "/index.html");
  await p3.waitForSelector("#go");
  await p3.evaluate(() => { localStorage.removeItem("fonte.acces.fonte"); });
  await p3.reload();
  await p3.click("#go");
  await p3.waitForSelector("#panel-prog .paywall .unlock");
  await p3.click("#panel-prog .paywall .unlock");
  await p3.check("[data-buy-ok]");
  await p3.click("[data-buy]");
  await p3.waitForURL(/127\.0\.0\.1:8793\/payer\//);
  await p3.click("#annuler");
  await p3.waitForURL(u => u.href.startsWith(BASE + "/index.html"));
  await p3.waitForTimeout(300);
  const ann = await p3.evaluate(() => ({ url: location.href, toast: document.querySelector("#toast").textContent, unlocked }));
  check("paiement_annule", !ann.url.includes("achat") && ann.toast.includes("annulé") && !ann.unlocked, ann);

  // sauvegarde importée sur un appareil neuf, puis tout effacer
  const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p4 = await ctx3.newPage();
  await quiet(p4, "import");
  await p4.goto(BASE + "/carnet.html#offre");
  await p4.waitForSelector("#data-import", { state: "attached" });
  await p4.setInputFiles("#data-import", dumpPath);
  await p4.click("[data-act=confirm-ok]");
  await p4.waitForLoadState("load");
  await p4.waitForSelector("#acces");
  await p4.waitForTimeout(300);
  const imported = await p4.evaluate(() => ({ n: workouts.length, fonte: FONTE_PWA.has("fonte"), prog: !!localStorage.getItem("fonte.v2") }));
  check("import_sauvegarde", imported.n >= 1 && imported.fonte && imported.prog, imported);
  await p4.click('[data-act="data-erase"]');
  await p4.click("[data-act=confirm-ok]");
  await p4.waitForLoadState("load");
  await p4.waitForSelector("#acces");
  await p4.waitForTimeout(300);
  const erased = await p4.evaluate(() => { const st = JSON.parse(localStorage.getItem("fonte-suivi.v1") || "{}"); return { n: workouts.length, stored: (st.workouts || []).length, fonte: FONTE_PWA.has("fonte"), keys: Object.keys(localStorage).filter(k => /^fonte/.test(k)) }; });
  check("tout_effacer", erased.n === 0 && erased.stored === 0 && !erased.fonte && !erased.keys.some(k => /acces\.|fonte\.v2|accord/.test(k)), erased);
  await ctx3.close();

  // le service worker ne met jamais l'API en cache
  const cachedApi = await page.evaluate(async () => { const out = []; for (const k of await caches.keys()) { const c = await caches.open(k); for (const r of await c.keys()) if (r.url.includes("/api/")) out.push(r.url); } return out; });
  check("api_hors_cache", cachedApi.length === 0, cachedApi);
  const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("pas_de_debordement", !over);
} catch (e) {
  R.exception = String(e && e.stack || e).slice(0, 1500);
} finally {
  await browser.close();
  await stack.stop();
}
R.errors = errors;
R.wrangler = stack.logs.join("").split("\n").filter(l => /✘|Uncaught|TypeError|ReferenceError/.test(l) && !/coach overloaded 529/.test(l)).slice(0, 6);
console.log(JSON.stringify(R, null, 1));
