/* Fonte, appli installable : remplace le runtime de claude.ai (coach par le serveur de l'appli, téléchargements par le
   navigateur), gère les achats (jetons d'accès), garde l'appli disponible hors connexion, propose l'installation et relie
   les deux parties, Programme et Carnet. */
(() => {
  const carnet = /carnet(\.html)?$/i.test(location.pathname);
  const http = /^https?:$/.test(location.protocol);
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* stockage bloqué */ } }
  };
  const emit = (name, detail) => dispatchEvent(new CustomEvent(name, { detail }));
  const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);

  /* ===== Serveur de l'appli : coach et paiement disponibles ? (réponse gardée pour démarrer hors connexion) ===== */
  let config = (() => { try { return JSON.parse(store.get("fonte.config")); } catch (e) { return null; } })();
  const cached = !!config;
  config = config || { coach: false, paiement: false };
  const configReady = !http ? Promise.resolve(config) : Promise.race([
    fetch("api/config", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : { coach: false, paiement: false }))
      .then(c => { config = { coach: c.coach === true, paiement: c.paiement === true, legal: c.legal !== false, portail: typeof c.portail === "string" ? c.portail : null }; store.set("fonte.config", JSON.stringify(config)); emit("fonte:config", config); return config; }),
    new Promise(ok => setTimeout(() => ok(config), cached ? 2500 : 8000))
  ]).catch(() => config);

  /* ===== Accès : jetons d'achat signés par le serveur, rangés sur l'appareil ===== */
  const TOK = { fonte: "fonte.acces.fonte", premium: "fonte.acces.premium" };
  const token = p => store.get(TOK[p]);
  const decode = t => { try { const b = t.split(".")[0].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b), c => c.charCodeAt(0)))); } catch (e) { return null; } };
  const info = p => { const t = token(p), d = t && decode(t); return d && d.p === p ? d : null; };
  const has = p => { const d = info(p); return !!d && (!d.exp || d.exp > Date.now()); };
  function device() {
    let d = store.get("fonte.device");
    if (!d || !/^[A-Za-z0-9_-]{16,64}$/.test(d)) {
      const a = crypto.getRandomValues(new Uint8Array(16));
      d = btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      store.set("fonte.device", d);
    }
    return d;
  }
  const fail = (code, extra) => Object.assign(new Error(code), { code }, extra);
  async function api(path, body) {
    let res;
    try { res = await fetch("api/" + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
    catch (e) { throw fail("network"); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw fail(data.error || "upstream_error", { status: res.status });
    return data;
  }
  /* paiement : page Stripe, puis retour dans l'appli avec ?achat=<session> */
  async function buy(produit, accord) {
    const r = await api("checkout", { produit, accord: accord === true, acces: { fonte: token("fonte") } });
    location.assign(r.url);
  }
  const PENDING = "fonte.achat.attente";
  async function confirmPurchase(session, loud) {
    try {
      const r = await api("checkout/confirm", { session });
      store.set(PENDING, null);
      if (r.jeton) { store.set(TOK[r.produit], r.jeton); emit("fonte:acces", { nouveau: r.produit }); }
    } catch (e) {
      // paiement encore en cours de validation, ou pas de réseau : nouvel essai discret aux prochaines ouvertures
      if (e.code === "invalid_request") store.set(PENDING, null);
      if (loud) emit("fonte:acces", { attente: e.code === "not_paid", erreur: e.code !== "not_paid" });
    }
  }
  /* abonnement renouvelé ou arrêté : vérifié au plus une fois par jour, ou quand le jeton arrive à échéance */
  async function refresh(force) {
    const t = token("premium");
    if (!t || !config.paiement) return;
    const d = info("premium"), last = +store.get("fonte.acces.verif") || 0;
    if (!force && d && d.exp - Date.now() > 4 * 864e5 && Date.now() - last < 864e5) return;
    try {
      const before = has("premium"), r = await api("access", { jetons: [t] });
      store.set("fonte.acces.verif", String(Date.now()));
      store.set(TOK.premium, r.premium || null);
      store.set(CANCEL, r.resilie && r.premium ? JSON.stringify({ fin: r.fin || 0 }) : null);
      if (has("premium") !== before) emit("fonte:acces", { premium: r.statut });
    } catch (e) { /* hors connexion : nouvel essai plus tard */ }
  }
  /* autre téléphone : le code d'accès (un ou deux jetons) suffit à retrouver ses achats */
  async function restore(text) {
    const jetons = (String(text).match(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g) || []).slice(0, 4);
    if (!jetons.length) throw fail("invalid_code");
    const r = await api("access", { jetons });
    if (!r.fonte && !r.premium) throw fail(r.statut === "termine" ? "ended" : "invalid_code");
    if (r.fonte) store.set(TOK.fonte, r.fonte);
    if (r.premium) { store.set(TOK.premium, r.premium); store.set("fonte.acces.verif", String(Date.now())); }
    emit("fonte:acces", { restaure: true });
    return { fonte: !!r.fonte, premium: !!r.premium };
  }
  async function portal() {
    const r = await api("portal", { jeton: token("premium") || token("fonte") });
    location.assign(r.url);
  }
  const accessCode = () => [token("fonte"), token("premium")].filter(Boolean).join("\n");
  /* résiliation en trois clics : Offre > Résilier mon abonnement > Confirmer ; effet à la fin du mois payé */
  const CANCEL = "fonte.acces.resiliation";
  const cancelInfo = () => { try { return JSON.parse(store.get(CANCEL)); } catch (e) { return null; } };
  async function cancelSub() {
    const r = await api("resiliation", { jeton: token("premium") });
    store.set(CANCEL, JSON.stringify({ le: r.le, fin: r.fin }));
    emit("fonte:acces", { resilie: true });
    return r;
  }

  /* ===== Accord pour le coach : des données de santé partent vers un prestataire d'IA (RGPD, art. 9.2.a) ===== */
  const CONSENT = "fonte.accord.coach", CONSENT_V = 1;
  const consentInfo = () => { try { const c = JSON.parse(store.get(CONSENT)); return c && c.v === CONSENT_V ? c : null; } catch (e) { return null; } };
  const needsConsent = () => !!config.coach && !consentInfo();
  function consentHTML(title) {
    return `<div class="pwa-consent" role="group" aria-labelledby="pwa-consent-t"><b id="pwa-consent-t">${title || "Avant ta première question"}</b>
      <p>Le coach est une <b>intelligence artificielle</b> (Claude, de la société Anthropic). Pour te répondre, ta question et les informations utiles de ton profil (objectif, niveau, programme, zones sensibles, et ta nutrition si tu l'as remplie) passent par le serveur de Fonte jusqu'à Anthropic, qui génère la réponse. Le serveur de Fonte ne les garde pas.</p>
      <label class="pwa-check"><input type="checkbox" data-pwa-consent-box> <span>J'ai 15 ans ou plus et j'accepte que ces informations, dont certaines concernent ma santé, soient utilisées pour me répondre.</span></label>
      <div class="pwa-row"><button type="button" class="primary" data-pwa-consent disabled>Activer le coach</button><a href="legal/confidentialite.html#coach">En savoir plus</a></div>
      <p class="pwa-muted">Tu peux retirer ton accord à tout moment : Offre &gt; Tes données.</p></div>`;
  }
  document.addEventListener("change", e => {
    if (!e.target.matches("[data-pwa-consent-box]")) return;
    const b = e.target.closest(".pwa-consent").querySelector("[data-pwa-consent]");
    if (b) b.disabled = !e.target.checked;
  });
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-pwa-consent]");
    if (!b || !b.closest(".pwa-consent").querySelector("[data-pwa-consent-box]").checked) return;
    store.set(CONSENT, JSON.stringify({ v: CONSENT_V, t: Date.now() }));
    emit("fonte:accord", { ok: true });
  });
  function withdrawConsent() { store.set(CONSENT, null); emit("fonte:accord", { ok: false }); }

  /* ===== Feuilles de confirmation : achat (récapitulatif, accord exprès) et résiliation (confirmation téléchargeable) ===== */
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const dateFr = (t, withTime) => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
  function sheet(html, label) {
    css();
    const back = document.activeElement, d = document.createElement("div");
    d.className = "pwa-sheet";
    d.innerHTML = `<div class="pwa-box" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</div>`;
    document.body.appendChild(d);
    const close = () => { d.remove(); if (back && back.focus) back.focus(); };
    d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-sheet-close]")) close(); });
    d.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    const first = d.querySelector("input, button");
    if (first) first.focus();
    return { el: d, close };
  }
  const OFFERS = {
    fonte: () => ({ titre: "Débloquer Fonte", prix: "19 € TTC", rythme: "paiement unique",
      plus: ["Toutes tes séances et la progression sur 4 semaines", "Nutrition, mobilité et export PDF", "Coach IA sans limite de questions", "−50 % sur Premium, ton carnet"],
      accord: "Je veux accéder tout de suite au programme complet et je reconnais perdre mon droit de rétractation de 14 jours dès que l'accès m'est donné.",
      note: "Paiement unique, sans abonnement." }),
    premium: () => ({ titre: "Passer à Premium", prix: has("fonte") ? "2,49 € TTC" : "4,99 € TTC", rythme: "par mois, sans engagement",
      plus: ["Conseil de charge à chaque exercice", "Courbes de force, records, séries par muscle", "Analyse de tes progrès par le coach IA", "Historique illimité"],
      accord: "Je demande à profiter de Premium dès maintenant. Si je me rétracte dans les 14 jours, je ne paierai que la part déjà utilisée.",
      note: "Résiliable à tout moment en trois clics, sans frais." })
  };
  function checkout(produit) {
    const o = OFFERS[produit]();
    const s = sheet(`<h2>${o.titre}</h2><p class="pwa-price"><b>${o.prix}</b> ${o.rythme}</p>
      <ul class="pwa-plus">${o.plus.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <label class="pwa-check"><input type="checkbox" data-buy-ok> <span>${esc(o.accord)}</span></label>
      <p class="pwa-muted">${o.note} En continuant, tu acceptes les <a href="legal/conditions.html" target="_blank" rel="noopener">conditions générales de vente</a>. Paiement sécurisé par Stripe.</p>
      <p class="pwa-err" role="alert" hidden></p>
      <div class="pwa-row"><button type="button" class="pwa-ok" data-buy disabled>Continuer vers le paiement</button><button type="button" class="pwa-link" data-sheet-close>Annuler</button></div>`, o.titre);
    const box = s.el.querySelector("[data-buy-ok]"), go = s.el.querySelector("[data-buy]"), err = s.el.querySelector(".pwa-err");
    box.addEventListener("change", () => { go.disabled = !box.checked; });
    go.addEventListener("click", async () => {
      if (!box.checked) return;
      go.disabled = true; go.textContent = "Ouverture du paiement…"; err.hidden = true;
      try { await buy(produit, true); }
      catch (e) {
        go.disabled = false; go.textContent = "Continuer vers le paiement";
        err.textContent = e.code === "payments_off" ? "Le paiement n'est pas encore ouvert. Réessaie bientôt." : "Le paiement n'a pas pu s'ouvrir. Vérifie ta connexion et réessaie.";
        err.hidden = false;
      }
    });
    return s;
  }
  function cancelFlow() {
    const until = window.FONTE_PWA.premiumUntil();
    const s = sheet(`<h2>Résilier ton abonnement Premium</h2>
      <p>Premium reste actif jusqu'au <b>${until ? dateFr(until) : "terme du mois payé"}</b>, puis s'arrête : plus aucun prélèvement. Tes séances et ton programme restent sur ton téléphone.</p>
      <p class="pwa-err" role="alert" hidden></p>
      <div class="pwa-row"><button type="button" class="pwa-ok pwa-danger" data-cancel-ok>Confirmer la résiliation</button><button type="button" class="pwa-link" data-sheet-close>Garder Premium</button></div>`, "Résilier ton abonnement Premium");
    const go = s.el.querySelector("[data-cancel-ok]"), err = s.el.querySelector(".pwa-err");
    go.addEventListener("click", async () => {
      go.disabled = true; go.textContent = "Résiliation…"; err.hidden = true;
      try {
        const r = await cancelSub();
        const box = s.el.querySelector(".pwa-box");
        box.innerHTML = `<h2>Résiliation enregistrée</h2><p>Demande reçue le <b>${dateFr(r.le, true)}</b>. Premium reste actif jusqu'au <b>${dateFr(r.fin)}</b>, puis s'arrête. Aucun autre prélèvement n'aura lieu.</p>
          <p class="pwa-muted">Garde cette confirmation : télécharge-la ci-dessous.</p>
          <div class="pwa-row"><button type="button" class="pwa-ok" data-cancel-proof>Télécharger la confirmation</button><button type="button" class="pwa-link" data-sheet-close>Fermer</button></div>`;
        box.querySelector("[data-cancel-proof]").addEventListener("click", () => downloads.save({ filename: `fonte-confirmation-resiliation-${new Date(r.le).toISOString().slice(0, 10)}.txt`, data: cancelText(r) }));
        box.querySelector("[data-cancel-proof]").focus();
      } catch (e) {
        go.disabled = false; go.textContent = "Confirmer la résiliation";
        err.textContent = e.code === "network" ? "Pas de connexion : réessaie quand tu as du réseau." : "La résiliation n'a pas pu être enregistrée. Réessaie, ou utilise « Gérer mon abonnement ».";
        err.hidden = false;
      }
    });
    return s;
  }
  const cancelText = r => [
    "CONFIRMATION DE RÉSILIATION — FONTE PREMIUM", "",
    `Date de la demande : ${dateFr(r.le, true)}`,
    `Abonnement : Fonte Suivi Premium (référence ${r.ref || "—"})`,
    `Fin de l'abonnement : ${dateFr(r.fin)}`,
    "Aucun prélèvement ne sera effectué après cette date.", "",
    r.editeur && r.editeur.nom ? `Éditeur : ${r.editeur.nom}${r.editeur.email ? ` — ${r.editeur.email}` : ""}` : "Éditeur : voir les mentions légales de l'appli.", ""
  ].join("\r\n");

  /* ===== Tes données : tout est sur l'appareil ; export (portabilité), import d'une sauvegarde, effacement ===== */
  const localKeys = () => { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^fonte/.test(k)) out.push(k); } } catch (e) { /* stockage bloqué */ } return out.sort(); };
  async function exportAll() {
    const donnees = {};
    localKeys().forEach(k => { donnees[k] = store.get(k); });
    const json = JSON.stringify({ appli: "fonte", version: 1, exporte: new Date().toISOString(), donnees }, null, 2);
    return downloads.save({ filename: `fonte-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`, data: new Blob([json], { type: "application/json" }) });
  }
  async function importAll(file) {
    let o;
    try { o = JSON.parse(await file.text()); } catch (e) { throw fail("invalid_backup"); }
    const entries = o && o.appli === "fonte" && isObj(o.donnees) ? Object.entries(o.donnees).filter(([k, v]) => /^fonte/.test(k) && typeof v === "string") : [];
    if (!entries.length) throw fail("invalid_backup");
    localKeys().forEach(k => store.set(k, null));
    entries.forEach(([k, v]) => store.set(k, v));
    return entries.length;
  }
  function eraseAll() { localKeys().forEach(k => store.set(k, null)); }
  addEventListener("storage", e => { if (e.key && e.key.startsWith("fonte.acces.") && e.key !== "fonte.acces.verif") emit("fonte:acces", {}); });

  // retour de la page de paiement : l'adresse est nettoyée tout de suite, l'achat confirmé une fois l'appli prête
  const qs = new URLSearchParams(location.search), achat = qs.get("achat");
  if (achat) { qs.delete("achat"); history.replaceState(history.state, "", location.pathname + (qs.toString() ? "?" + qs : "") + location.hash); }
  const fromStripe = !!achat && /^cs_[A-Za-z0-9_]+$/.test(achat);
  if (fromStripe) store.set(PENDING, JSON.stringify({ s: achat, t: Date.now() }));
  const pending = (() => { try { const p = JSON.parse(store.get(PENDING)); return p && p.s && Date.now() - p.t < 7 * 864e5 ? p.s : null; } catch (e) { return null; } })();
  if (!pending) store.set(PENDING, null);

  /* ===== Coach : même interface que le runtime de claude.ai, la boucle d'outils tourne ici ===== */
  const brainOf = () => (typeof CERVEAU === "string" ? CERVEAU : "");
  const stripBrain = s => { const b = brainOf(); s = String(s == null ? "" : s); return b && s.startsWith(b) ? s.slice(b.length).replace(/^\s+/, "") : s; };
  function toMessages(input) {
    if (typeof input === "string") return [{ role: "user", content: stripBrain(input) }];
    const out = [];
    (Array.isArray(input) ? input : []).forEach((t, i) => {
      const text = i === 0 ? stripBrain(t.content) : String(t.content == null ? "" : t.content);
      if (!text.trim()) return;
      const role = t.role === "assistant" ? "assistant" : "user", last = out[out.length - 1];
      if (last && last.role === role) last.content.push({ type: "text", text });
      else if (out.length || role === "user") out.push({ role, content: [{ type: "text", text }] });
    });
    return out;
  }
  // entrées d'outil diffusées en direct : vérifiées contre le schéma avant d'exécuter quoi que ce soit
  function coerce(schema, input) {
    if (!isObj(input) || !schema || !isObj(schema.properties)) return input;
    const out = { ...input };
    for (const [k, s] of Object.entries(schema.properties)) {
      const v = out[k];
      if ((s.type === "integer" || s.type === "number") && typeof v === "string" && /^\s*-?\d+([.,]\d+)?\s*$/.test(v)) out[k] = Number(v.replace(",", "."));
      if (s.type === "boolean" && (v === "true" || v === "false")) out[k] = v === "true";
    }
    return out;
  }
  function typeOk(s, v) {
    if (!s) return true;
    if (s.enum && !s.enum.includes(v)) return false;
    const inRange = n => (s.minimum == null || n >= s.minimum) && (s.maximum == null || n <= s.maximum);
    switch (s.type) {
      case "string": return typeof v === "string";
      case "integer": return Number.isInteger(v) && inRange(v);
      case "number": return typeof v === "number" && isFinite(v) && inRange(v);
      case "boolean": return typeof v === "boolean";
      case "array": return Array.isArray(v) && (!s.items || v.every(x => typeOk(s.items, x)));
      case "object": return isObj(v);
      default: return true;
    }
  }
  function checkInput(schema, input) {
    if (!isObj(input)) return "les paramètres doivent former un objet JSON";
    const props = (schema && schema.properties) || {};
    for (const r of (schema && schema.required) || []) if (input[r] == null || input[r] === "") return `paramètre manquant : ${r}`;
    for (const [k, v] of Object.entries(input)) if (v != null && props[k] && !typeOk(props[k], v)) return `paramètre invalide : ${k}`;
    return null;
  }
  async function runTool(t, use) {
    const result = (content, isError) => ({ type: "tool_result", tool_use_id: use.id, content: typeof content === "string" ? content : JSON.stringify(content === undefined ? null : content), ...(isError ? { is_error: true } : {}) });
    if (!t || typeof t.execute !== "function") return result(`Outil inconnu : ${use.name}`, true);
    const input = coerce(t.inputSchema, use.input), problem = checkInput(t.inputSchema, input);
    if (problem) return result({ INVALID_JSON: JSON.stringify(use.input), erreur: problem }, true);
    try { return result(await t.execute(input)); } catch (e) { return result(String((e && e.message) || e), true); }
  }
  const CODES = { not_found: "coach_off", forbidden: "invalid_request", method_not_allowed: "invalid_request" };
  /* un tour du modèle : lit le flux NDJSON du serveur (texte, relance, réponse complète, erreur) */
  async function turn(body, signal, onText, onReset) {
    const stop = () => fail(signal && signal.aborted ? "cancelled" : "network");
    let res;
    try { res = await fetch("api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }); }
    catch (e) { throw stop(); }
    if (!res.ok || !(res.headers.get("content-type") || "").includes("ndjson")) {
      const data = await res.json().catch(() => ({}));
      throw fail(CODES[data.error] || data.error || "upstream_error");
    }
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = "", done = null;
    try {
      for (;;) {
        const { value, done: end } = await reader.read();
        if (end) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.t === "text") onText(ev.d);
          else if (ev.t === "reset") onReset();
          else if (ev.t === "done") done = ev;
          else if (ev.t === "error") throw fail(ev.code || "upstream_error");
        }
      }
    } catch (e) {
      throw e && e.code ? e : stop();
    }
    if (!done) throw stop();
    return done;
  }
  async function sample(input, opts = {}) {
    const kind = typeof input === "string" ? "analyse" : "coach";
    const tools = Array.isArray(opts.tools) ? opts.tools.slice(0, 8) : [];
    const byName = Object.fromEntries(tools.map(t => [t.name, t]));
    const defs = tools.map(t => ({ name: t.name, description: t.description || "", input_schema: t.inputSchema || { type: "object", properties: {} } }));
    if (!consentInfo()) throw fail("consent_required", { text: "" });
    let messages = toMessages(input), full = "", truncated = false, left = null;
    if (!messages.length) throw fail("invalid_request");
    const show = d => { full += d; if (opts.onText) opts.onText({ text: full, delta: d }); };
    for (let round = 0; ; round++) {
      const mark = full;
      let sep = full && !/\s$/.test(full) ? "\n\n" : "", done;
      try {
        done = await turn({ kind, device: device(), consentement: 1, tier: opts.modelTier === "complex" ? "complex" : "default", acces: { fonte: token("fonte"), premium: token("premium") }, messages, ...(defs.length ? { tools: defs } : {}) }, opts.signal,
          d => { if (sep) { show(sep); sep = ""; } show(d); },
          () => { full = mark; sep = mark && !/\s$/.test(mark) ? "\n\n" : ""; if (opts.onText) opts.onText({ text: full, delta: "" }); });
      } catch (e) { e.text = full; throw e; }
      if (done.left != null) left = done.left;
      const m = done.m;
      if (m.stop_reason === "refusal") throw fail("refused", { text: "" });
      if (m.stop_reason === "max_tokens") { truncated = true; break; }
      const uses = m.content.filter(b => b.type === "tool_use");
      if (m.stop_reason !== "tool_use" || !uses.length) break;
      if (round >= 7) { truncated = true; break; }
      if (opts.signal && opts.signal.aborted) throw fail("cancelled", { text: full });
      const results = [];
      for (const u of uses) results.push(await runTool(byName[u.name], u));
      // réponse renvoyée telle quelle (réflexion comprise), suivie des résultats : l'historique ne fait que s'allonger
      messages = [...messages, { role: "assistant", content: m.content }, { role: "user", content: results }];
    }
    if (!full.trim() && !truncated) throw fail("empty_completion", { text: "" });
    return { text: full.trim(), truncated, left };
  }
  sample.limits = async () => ({ maxPromptBytes: 240000, tools: { maxCount: 8 } });

  const downloads = {
    save: async ({ filename, data }) => {
      const blob = data instanceof Blob ? data : new Blob([data], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = filename || "fonte"; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return { status: "saved" };
    }
  };

  window.FONTE_PWA = {
    page: carnet ? "carnet" : "programme",
    suiviUrl: "carnet.html",
    fonteUrl: "index.html",
    coachMsg: "<b>Le coach IA arrive bientôt dans l'appli.</b><span class=\"muted\">Ton programme, la nutrition, la mobilité, les démos et ton carnet fonctionnent déjà, même sans réseau.</span>",
    ready: configReady,
    coachOn: () => config.coach,
    payOn: () => config.paiement,
    has, buy, portal, restore, refresh, accessCode,
    premiumUntil: () => { const d = info("premium"); return d && d.exp ? d.exp - 3 * 864e5 : 0; },
    cancelSub, cancelInfo, cancelFlow, checkout, consentInfo, needsConsent, consentHTML, withdrawConsent, exportAll, importAll, eraseAll,
    device, save: o => downloads.save(o),
    legalOk: () => config.legal !== false,
    portalLogin: () => config.portail || null
  };

  // pas de compte Claude ici : coach par le serveur de l'appli, fichiers (PDF, CSV) par le téléchargement du navigateur
  if (!window.claude) {
    window.claude = {
      use: async name => {
        if (name === "downloads") return downloads;
        if (name === "sample") { await configReady; return config.coach ? sample : null; }
        return null;
      }
    };
  }

  // mode hors connexion
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => { /* navigateur sans service worker */ }); });
  }

  const ICONS = {
    programme: '<path d="M9 3h6v3H9z"/><path d="M7 4.5H5V21h14V4.5h-2"/><path d="M8.5 11h7M8.5 15h5"/>',
    seance: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
    historique: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    progres: '<path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6"/>',
    offre: '<path d="M20 12l-8 8-8-8V4h8z"/><path d="M8.5 8.5h.01"/>',
    share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5v10h14V11h-1"/>'
  };
  let styled = false;
  function css() {
    if (styled) return;
    styled = true;
    const st = document.createElement("style");
    st.textContent = `
.pwa-bar{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:10px;padding:10px 14px;padding-top:calc(10px + env(safe-area-inset-top,0px));background:var(--ink);color:var(--bg)}
.pwa-bar img{width:40px;height:40px;border-radius:10px;flex:none}
.pwa-bar p{flex:1;min-width:0;display:grid;font-size:13.5px;line-height:1.3;margin:0}
.pwa-bar b{font-size:15px}
.pwa-go{background:var(--yellow);color:#18202A;border:0;border-radius:999px;padding:10px 14px;font:700 14px/1 var(--body);cursor:pointer;white-space:nowrap;min-height:40px}
.pwa-x{background:none;border:0;color:inherit;font-size:24px;line-height:1;cursor:pointer;padding:6px 8px;min-width:40px;min-height:40px}
.pwa-sheet{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.5);display:grid;align-items:end;justify-items:center;padding:12px}
.pwa-box{background:var(--surface);color:var(--ink);border-radius:16px;padding:18px 18px 16px;max-width:440px;width:100%;display:grid;gap:12px;margin-bottom:env(safe-area-inset-bottom,0px);max-height:calc(100dvh - 24px);overflow:auto}
.pwa-box h2{font-size:1.5rem}
.pwa-box ol{margin:0;padding-left:20px;display:grid;gap:8px}
.pwa-box svg{width:20px;height:20px;vertical-align:-4px;stroke:var(--blue);fill:none;stroke-width:1.8}
.pwa-ok{justify-self:end;background:var(--ink);color:var(--bg);border:0;border-radius:10px;padding:12px 18px;font-weight:600;cursor:pointer}
.appnav{position:fixed;left:0;right:0;bottom:0;z-index:10;background:var(--surface);border-top:1px solid var(--line);padding-bottom:env(safe-area-inset-bottom,0px)}
.appnav-in{max-width:720px;margin:0 auto;display:grid;grid-template-columns:repeat(5,1fr);height:64px}
.appnav a,.nav .navlink{display:grid;justify-items:center;align-content:center;gap:3px;font-size:12px;font-weight:600;color:var(--muted);text-decoration:none}
.appnav svg,.nav .navlink svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.8}
.appnav a[aria-current="page"]{color:var(--ink)}
.appnav a[aria-current="page"] svg{stroke:var(--red)}
html.has-appnav body{padding-bottom:calc(64px + env(safe-area-inset-bottom,0px))}
html.has-appnav .toast{bottom:calc(80px + env(safe-area-inset-bottom,0px))}
.nav .nav-in{grid-template-columns:repeat(5,1fr)}
.pwa-legal{max-width:720px;margin:0 auto;padding:20px 16px 28px;display:flex;flex-wrap:wrap;gap:6px 18px;font-size:14px}
.pwa-legal a{color:var(--muted);text-decoration:underline;text-underline-offset:2px}
.pwa-consent{background:var(--surface);border:1.5px solid var(--line);border-radius:12px;padding:16px 18px;display:grid;gap:10px;text-align:left}
.pwa-consent p{margin:0;font-size:15px;line-height:1.5}
.pwa-check{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.45;cursor:pointer}
.pwa-check input{width:22px;height:22px;margin:1px 0 0;flex:none;accent-color:var(--blue)}
.pwa-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px}
.pwa-row .primary[disabled]{opacity:.45;cursor:not-allowed}
.pwa-muted{color:var(--muted);font-size:13.5px!important}
.pwa-box .pwa-price{margin:0;font-size:16px}
.pwa-box .pwa-price b{font:800 1.8rem/1 var(--display,inherit);margin-right:4px}
.pwa-plus{margin:0;padding-left:20px;display:grid;gap:4px;font-size:15px}
.pwa-box p{margin:0}
.pwa-err{color:var(--red);font-weight:600;font-size:14.5px}
.pwa-link{background:none;border:0;color:var(--blue);font:600 15px/1 var(--body,inherit);cursor:pointer;padding:12px 4px;min-height:44px}
.pwa-ok[disabled]{opacity:.45;cursor:not-allowed}
.pwa-danger{background:var(--red)!important;color:#fff!important}`;
    document.head.appendChild(st);
  }

  /* une seule appli : la même barre du bas dans le Programme et dans le Carnet */
  const NAV = [["programme", "index.html", "Programme"], ["seance", "carnet.html", "Séance"], ["historique", "carnet.html#historique", "Historique"], ["progres", "carnet.html#progres", "Progrès"], ["offre", "carnet.html#offre", "Offre"]];
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;
  function navProgramme() {
    css();
    const n = document.createElement("nav");
    n.className = "appnav";
    n.setAttribute("aria-label", "Navigation de l'appli");
    n.innerHTML = `<div class="appnav-in">${NAV.map(([k, href, label]) => `<a href="${href}"${k === "programme" ? ' aria-current="page"' : ""}>${svg(k)}${label}</a>`).join("")}</div>`;
    document.body.appendChild(n);
    document.documentElement.classList.add("has-appnav");
  }
  function navCarnet() {
    const inner = document.querySelector(".nav .nav-in");
    if (!inner) return;
    css();
    const a = document.createElement("a");
    a.href = "index.html";
    a.className = "navlink";
    a.innerHTML = `${svg("programme")}Programme`;
    inner.prepend(a);
  }

  /* installation : bouton natif (Android, ordinateur) ou guide pas à pas (iPhone, iPad) */
  const LATER = "fonte.install.later";
  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const later = () => { try { return Date.now() - (+localStorage.getItem(LATER) || 0) < 7 * 864e5; } catch (e) { return false; } };
  let deferred = null, bar = null;
  function show() {
    if (standalone() || later() || bar || !document.body) return;
    if (!deferred && !ios) return;
    css();
    bar = document.createElement("div");
    bar.className = "pwa-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Installer l'appli");
    bar.innerHTML = `<img src="icons/icon-192.png" alt=""><p><b>Installe Fonte</b><span>Plein écran, en un geste, même sans réseau à la salle.</span></p><button type="button" class="pwa-go">${deferred ? "Installer" : "Comment faire"}</button><button type="button" class="pwa-x" aria-label="Plus tard">×</button>`;
    document.body.prepend(bar);
    bar.querySelector(".pwa-go").addEventListener("click", install);
    bar.querySelector(".pwa-x").addEventListener("click", () => { try { localStorage.setItem(LATER, String(Date.now())); } catch (e) { /* stockage bloqué */ } hide(); });
  }
  function hide() { if (bar) { bar.remove(); bar = null; } }
  async function install() {
    if (deferred) {
      const d = deferred;
      deferred = null;
      d.prompt();
      try { await d.userChoice; } catch (e) { /* fenêtre fermée */ }
      hide();
      return;
    }
    if (ios) iosHelp();
  }
  function iosHelp() {
    css();
    const back = document.activeElement, d = document.createElement("div");
    d.className = "pwa-sheet";
    d.innerHTML = `<div class="pwa-box" role="dialog" aria-modal="true" aria-labelledby="pwa-t"><h2 id="pwa-t">Installer Fonte</h2><ol><li>Touche le bouton <b>Partager</b> ${svg("share")} de Safari, en bas de l'écran (en haut sur iPad).</li><li>Fais défiler et choisis <b>Sur l'écran d'accueil</b>.</li><li>Touche <b>Ajouter</b> : l'icône Fonte rejoint tes applis.</li></ol><button type="button" class="pwa-ok">J'ai compris</button></div>`;
    document.body.appendChild(d);
    const close = () => { d.remove(); if (back && back.focus) back.focus(); };
    d.addEventListener("click", e => { if (e.target === d || e.target.closest(".pwa-ok")) close(); });
    d.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    d.querySelector(".pwa-ok").focus();
  }
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; hide(); show(); });
  addEventListener("appinstalled", () => { deferred = null; hide(); });
  window.FONTE_PWA.install = install;
  window.FONTE_PWA.canInstall = () => !standalone() && (!!deferred || ios);

  function legalFooter() {
    css();
    const f = document.createElement("footer");
    f.className = "pwa-legal";
    f.innerHTML = '<a href="legal/mentions-legales.html">Mentions légales</a><a href="legal/confidentialite.html">Confidentialité</a><a href="legal/conditions.html">Conditions générales</a>';
    const nav = document.querySelector(".appnav");
    if (nav) nav.before(f); else document.body.appendChild(f);
  }
  document.addEventListener("DOMContentLoaded", () => {
    if (carnet) navCarnet(); else navProgramme();
    legalFooter();
    if (ios) show();
    if (achat === "annule") setTimeout(() => emit("fonte:acces", { annule: true }), 0);
    configReady.then(() => { if (!config.paiement) return; if (pending) confirmPurchase(pending, fromStripe); refresh(false); });
  });
})();
