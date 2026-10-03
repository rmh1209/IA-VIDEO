// Faux Claude (flux SSE de l'API Messages) et faux Stripe (Checkout, abonnements, portail) pour tester le serveur sans réseau
import http from "node:http";

const sse = (res, events) => {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "request-id": "req_mock" });
  for (const e of events) res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
  res.end();
};
const start = (model = "claude-opus-5-5") => ({ type: "message_start", message: { id: "msg_" + Math.random().toString(36).slice(2, 10), type: "message", role: "assistant", model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1200, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 11800 } } });
const end = (stop, details) => [{ type: "message_delta", delta: { stop_reason: stop, stop_sequence: null, ...(details ? { stop_details: details } : {}) }, usage: { output_tokens: 42 } }, { type: "message_stop" }];
let blockIndex = 0;
const thinking = sig => { const i = blockIndex++; return [{ type: "content_block_start", index: i, content_block: { type: "thinking", thinking: "", signature: "" } }, { type: "content_block_delta", index: i, delta: { type: "signature_delta", signature: sig } }, { type: "content_block_stop", index: i }]; };
const text = parts => { const i = blockIndex++; return [{ type: "content_block_start", index: i, content_block: { type: "text", text: "" } }, ...parts.map(t => ({ type: "content_block_delta", index: i, delta: { type: "text_delta", text: t } })), { type: "content_block_stop", index: i }]; };
const tool = (id, name, jsonParts) => { const i = blockIndex++; return [{ type: "content_block_start", index: i, content_block: { type: "tool_use", id, name, input: {} } }, ...jsonParts.map(p => ({ type: "content_block_delta", index: i, delta: { type: "input_json_delta", partial_json: p } })), { type: "content_block_stop", index: i }]; };
const fallback = (from, to) => { const i = blockIndex++; return [{ type: "content_block_start", index: i, content_block: { type: "fallback", from: { model: from }, to: { model: to }, trigger: { type: "refusal", category: "cyber" } } }, { type: "content_block_stop", index: i }]; };

const textOf = c => (typeof c === "string" ? c : c.filter(b => b.type === "text").map(b => b.text).join("\n"));

export function startMocks({ anthropicPort = 8792, stripePort = 8793 } = {}) {
  const state = { claude: [], stripe: [], sessions: {}, subs: {}, products: {}, prices: {}, portals: {}, jsonFailures: 0 };

  const claude = http.createServer((req, res) => {
    let body = "";
    req.on("data", c => { body += c; });
    req.on("end", () => {
      if (req.method !== "POST" || !req.url.startsWith("/v1/messages")) { res.writeHead(404); res.end("{}"); return; }
      const p = JSON.parse(body);
      state.claude.push({ headers: req.headers, body: p });
      if (req.headers["x-api-key"] !== "cle-test-claude") { res.writeHead(401, { "Content-Type": "application/json", "x-should-retry": "false" }); res.end(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } })); return; }
      blockIndex = 0;
      const msgs = p.messages, last = msgs[msgs.length - 1];
      const lastIsTools = Array.isArray(last.content) && last.content.some(b => b.type === "tool_result");
      const first = textOf(msgs[0].content), q = textOf(last.content);
      const question = lastIsTools ? textOf(msgs.filter(m => m.role === "user" && !(Array.isArray(m.content) && m.content.some(b => b.type === "tool_result"))).pop().content) : q;
      // tours d'outils depuis la dernière vraie question
      let rounds = 0;
      for (let i = msgs.length - 1; i >= 0 && msgs[i].role === "user" && Array.isArray(msgs[i].content) && msgs[i].content.some(b => b.type === "tool_result"); i -= 2) rounds++;
      const delay = /lent/i.test(question) ? 300 : 0;
      setTimeout(() => {
        if (/surcharge/i.test(question)) { res.writeHead(529, { "Content-Type": "application/json", "x-should-retry": "false" }); res.end(JSON.stringify({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } })); return; }
        if (/refus total/i.test(question)) return sse(res, [start(), ...end("refusal", { type: "refusal", category: "cyber", explanation: null })]);
        if (/repli/i.test(question)) return sse(res, [start(), ...thinking("sig_avant"), ...tool("toolu_coupe", "chercher_exercices", ['{"texte":"pec']), ...text(["Début de réponse. "]), ...fallback("claude-opus-5-5", "claude-opus-4-8"), ...thinking("sig_apres"), ...text(["Suite par le modèle de repli."]), ...end("end_turn")]);
        if (/json cass/i.test(question) && !lastIsTools && state.jsonFailures < 1) { state.jsonFailures++; return sse(res, [start(), ...text(["Texte du premier essai. "]), ...tool("toolu_bad", "chercher_exercices", ['{"texte": "pec', 'toraux" "schema"::: }}']), ...end("tool_use")]); }
        if (/(remplace|json cass)/i.test(question) && !lastIsTools) return sse(res, [start(), ...thinking("sig_t1"), ...tool("toolu_1", "chercher_exercices", ['{"texte": ', '"pectoraux"}']), ...end("tool_use")]);
        if (/(remplace|json cass)/i.test(question) && rounds === 1) {
          const name = (first.match(/1\. ([^—\n]+) —/) || [])[1];
          return sse(res, [start(), ...thinking("sig_t2"), ...tool("toolu_2", "remplacer_exercice", [JSON.stringify({ ancien: (name || "Goblet squat").trim(), nouveau: "Presse à cuisses", seance: 1 })]), ...end("tool_use")]);
        }
        if (/(remplace|json cass)/i.test(question) && lastIsTools) return sse(res, [start(), ...thinking("sig_t3"), ...text(["C'est fait : ", "j'ai remplacé l'exercice par la **presse à cuisses**."]), ...end("end_turn")]);
        if (/SES SÉANCES/i.test(first) && /fonte suivi/i.test(first)) return sse(res, [start(), ...thinking("sig_a"), ...text(["### Ce qui progresse\n", "Ton goblet squat monte bien."]), ...end("end_turn")]);
        if (/coupe/i.test(question)) return sse(res, [start(), ...text(["Réponse trop longue qui s'arrête"]), ...end("max_tokens")]);
        return sse(res, [start(), ...thinking("sig_q"), ...text(["Bonjour ! ", "Voici ma réponse de coach."]), ...end("end_turn")]);
      }, delay);
    });
  });

  // ===== Stripe =====
  const id = p => p + "_test_" + Math.random().toString(36).slice(2, 12);
  const parse = s => { const o = {}; for (const [k, v] of new URLSearchParams(s)) o[k] = v; return o; };
  const sendJson = (res, data, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(data)); };
  const stripe = http.createServer((req, res) => {
    let body = "";
    req.on("data", c => { body += c; });
    req.on("end", () => {
      const u = new URL(req.url, "http://x"), path = u.pathname;
      const isApi = path.startsWith("/v1/");
      if (isApi) {
        state.stripe.push({ method: req.method, path, query: Object.fromEntries(u.searchParams), body: parse(body), auth: req.headers.authorization });
        if (req.headers.authorization !== "Bearer sk_test_mock") return sendJson(res, { error: { message: "Invalid API Key provided" } }, 401);
      }
      if (req.method === "GET" && path === "/v1/prices") {
        const keys = [...u.searchParams.entries()].filter(([k]) => k.startsWith("lookup_keys")).map(([, v]) => v);
        return sendJson(res, { object: "list", data: Object.values(state.prices).filter(p => keys.includes(p.lookup_key)) });
      }
      if (req.method === "POST" && path === "/v1/products") { const b = parse(body), pr = { id: id("prod"), name: b.name, description: b.description }; state.products[pr.id] = pr; return sendJson(res, pr); }
      if (req.method === "POST" && path === "/v1/prices") {
        const b = parse(body);
        if (!state.products[b.product]) return sendJson(res, { error: { message: "No such product" } }, 400);
        const pr = { id: id("price"), product: b.product, unit_amount: +b.unit_amount, currency: b.currency, lookup_key: b.lookup_key, nickname: b.nickname || null, tax_behavior: b.tax_behavior, recurring: b["recurring[interval]"] ? { interval: b["recurring[interval]"] } : null };
        state.prices[pr.id] = pr; return sendJson(res, pr);
      }
      if (req.method === "GET" && path === "/v1/billing_portal/configurations") return sendJson(res, { object: "list", data: Object.values(state.portals) });
      if (req.method === "POST" && path === "/v1/billing_portal/configurations") {
        const b = parse(body), c = { id: id("bpc"), metadata: { appli: b["metadata[appli]"] }, features: b };
        state.portals[c.id] = c; return sendJson(res, c);
      }
      if (req.method === "POST" && path === "/v1/checkout/sessions") {
        const b = parse(body), s = { id: id("cs"), object: "checkout.session", mode: b.mode, status: "open", payment_status: "unpaid", customer: null, subscription: null, metadata: { produit: b["metadata[produit]"] }, price: b["line_items[0][price]"], success_url: b.success_url, cancel_url: b.cancel_url };
        s.url = `http://127.0.0.1:${stripePort}/payer/${s.id}`;
        state.sessions[s.id] = s;
        return sendJson(res, s);
      }
      let m;
      if (req.method === "GET" && (m = path.match(/^\/v1\/checkout\/sessions\/(cs_[\w]+)$/))) {
        const s = state.sessions[m[1]];
        if (!s) return sendJson(res, { error: { message: "No such checkout.session" } }, 404);
        const expand = Object.entries(Object.fromEntries(u.searchParams)).some(([k, v]) => k.startsWith("expand") && v === "subscription");
        return sendJson(res, { ...s, subscription: s.subscription && expand ? state.subs[s.subscription] : s.subscription });
      }
      if (req.method === "GET" && (m = path.match(/^\/v1\/subscriptions\/([\w]+)$/))) {
        const sub = state.subs[m[1]];
        return sub ? sendJson(res, sub) : sendJson(res, { error: { message: "No such subscription" } }, 404);
      }
      if (req.method === "POST" && path === "/v1/billing_portal/sessions") {
        const b = parse(body);
        return sendJson(res, { id: id("bps"), url: `http://127.0.0.1:${stripePort}/portail?customer=${b.customer}&retour=${encodeURIComponent(b.return_url)}` });
      }
      // pages hébergées par Stripe (simulées)
      if (req.method === "GET" && (m = path.match(/^\/payer\/(cs_[\w]+)$/))) {
        const s = state.sessions[m[1]];
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(`<!doctype html><meta charset="utf-8"><title>Stripe test</title><p id="prix">${s.price}</p><a id="payer" href="/payer/${s.id}/ok">Payer</a> <a id="annuler" href="${s.cancel_url}">Retour</a>`);
      }
      if (req.method === "GET" && (m = path.match(/^\/payer\/(cs_[\w]+)\/ok$/))) {
        const s = state.sessions[m[1]];
        s.status = "complete"; s.payment_status = "paid"; s.customer = id("cus");
        if (s.mode === "subscription") {
          const sub = { id: id("sub"), object: "subscription", status: "active", customer: s.customer, items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, price: { id: s.price } }] } };
          state.subs[sub.id] = sub; s.subscription = sub.id;
        }
        res.writeHead(303, { Location: s.success_url.replace("{CHECKOUT_SESSION_ID}", s.id) });
        return res.end();
      }
      if (req.method === "GET" && path === "/portail") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(`<!doctype html><meta charset="utf-8"><title>Portail</title><p id="client">${u.searchParams.get("customer")}</p><a id="retour" href="${u.searchParams.get("retour")}">Retour</a>`);
      }
      sendJson(res, { error: { message: "inconnu " + path } }, 404);
    });
  });
  return new Promise(ok => claude.listen(anthropicPort, "127.0.0.1", () => stripe.listen(stripePort, "127.0.0.1", () => ok({ state, close: () => { claude.close(); stripe.close(); } }))));
}
