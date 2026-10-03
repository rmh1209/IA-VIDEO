/* Coach IA : un tour du modèle par requête, diffusé en direct. La boucle d'outils tourne dans l'appli, car les outils
   modifient le programme rangé sur le téléphone : à chaque tour, l'appli renvoie la réponse précédente telle quelle
   (blocs de réflexion compris) suivie des résultats de ses outils. */
import Anthropic from "@anthropic-ai/sdk";
import { CERVEAU } from "./brain.js";

export const MODEL = "claude-opus-5-5";
// repli automatique sur un autre modèle si celui-ci décline ; blocs de réflexion écartés (plutôt qu'une erreur) si l'historique a bougé
const BETAS = ["server-side-fallback-2026-07-01", "thinking-binding-controls-2026-08-01"];
export const TOOL_NAMES = ["chercher_exercices", "remplacer_exercice", "modifier_dosage", "ajouter_exercice", "retirer_exercice", "menager_zone", "calculer_nutrition", "changer_profil"];

const CADRE = `DANS L'APPLI FONTE
Tu réponds dans l'appli Fonte installée sur le téléphone de la personne : son programme, son carnet de séances et les démos animées y sont réunis. Le premier message de la conversation contient son contexte à jour (profil, programme, accès) ou la mission du moment, par exemple l'analyse de son carnet ; il remplace le contexte annoncé « à la fin de ce message ». Quand des outils sont fournis, ils modifient directement son programme sur son téléphone.`;
const SYSTEM = [{ type: "text", text: `${CERVEAU}\n\n${CADRE}`, cache_control: { type: "ephemeral" } }];

const MAX = { messages: 48, chars: 240000, tools: 8, toolChars: 8000 };
const USER_BLOCKS = ["text", "tool_result"];
const ASSISTANT_BLOCKS = ["text", "thinking", "redacted_thinking", "tool_use", "fallback"];
const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v, max) => typeof v === "string" && v.length <= max;

export class RequestError extends Error {
  constructor(code, status = 400, detail = "") { super(detail || code); this.code = code; this.status = status; }
}
const bad = detail => new RequestError("invalid_request", 400, detail);

function checkBlock(b, role) {
  if (!isObj(b) || !(role === "user" ? USER_BLOCKS : ASSISTANT_BLOCKS).includes(b.type)) throw bad(`bloc non accepté (${role})`);
  if ("cache_control" in b) throw bad("cache_control réservé au serveur");
  if (b.type === "text" && typeof b.text !== "string") throw bad("texte");
  if (b.type === "tool_use" && (!TOOL_NAMES.includes(b.name) || !str(b.id, 200) || !isObj(b.input))) throw bad("appel d'outil");
  if (b.type === "tool_result") {
    if (!str(b.tool_use_id, 200)) throw bad("résultat d'outil");
    const c = b.content;
    if (!(typeof c === "string" || (Array.isArray(c) && c.every(x => isObj(x) && x.type === "text" && typeof x.text === "string")))) throw bad("contenu du résultat d'outil");
  }
}

/* contrôle de ce que l'appli envoie : alternance des rôles, types de blocs, outils autorisés, tailles */
export function validate(body) {
  if (!isObj(body)) throw bad("corps de requête");
  const kind = body.kind === "analyse" ? "analyse" : "coach";
  const messages = body.messages;
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX.messages) throw bad("nombre de messages");
  if (kind === "analyse" && messages.length !== 1) throw bad("l'analyse tient en un message");
  messages.forEach((m, i) => {
    if (!isObj(m) || m.role !== (i % 2 ? "assistant" : "user")) throw bad("alternance des rôles");
    if (typeof m.content === "string") { if (!m.content.trim()) throw bad("message vide"); return; }
    if (!Array.isArray(m.content) || !m.content.length) throw bad("contenu");
    m.content.forEach(b => checkBlock(b, m.role));
  });
  if (messages.length % 2 === 0) throw bad("le dernier message doit venir de l'utilisateur");
  if (JSON.stringify(messages).length > MAX.chars) throw new RequestError("prompt_too_large", 413);

  // reprise après les outils : le dernier message ne contient que les résultats des appels du tour précédent
  const last = messages[messages.length - 1].content;
  const newQuestion = !(Array.isArray(last) && last.some(b => b.type === "tool_result"));
  if (!newQuestion) {
    const prev = messages[messages.length - 2].content;
    const ids = new Set((Array.isArray(prev) ? prev : []).filter(b => b.type === "tool_use").map(b => b.id));
    if (!ids.size || last.some(b => b.type !== "tool_result" || !ids.has(b.tool_use_id))) throw bad("résultats d'outils sans appel correspondant");
  }

  let tools = [];
  if (kind === "coach" && body.tools != null) {
    if (!Array.isArray(body.tools) || body.tools.length > MAX.tools) throw bad("outils");
    const seen = new Set();
    tools = body.tools.map(t => {
      if (!isObj(t) || !TOOL_NAMES.includes(t.name) || seen.has(t.name) || !str(t.description, 3000) || !isObj(t.input_schema) || t.input_schema.type !== "object") throw bad("définition d'outil");
      if (JSON.stringify(t.input_schema).length > MAX.toolChars) throw bad("schéma d'outil trop long");
      seen.add(t.name);
      // entrées diffusées dès leur génération : l'appli valide chaque entrée avant d'exécuter l'outil
      return { name: t.name, description: t.description, input_schema: t.input_schema, eager_input_streaming: true };
    });
  }
  return { kind, messages, tools, newQuestion, deep: body.tier === "complex" };
}

/* réponse renvoyée telle quelle à l'appli. Après un repli en cours de réponse, les blocs de réflexion et les appels
   d'outils placés avant le dernier bloc « fallback » ne doivent pas être renvoyés (le texte, si). */
const KEEP = {
  text: b => ({ type: "text", text: b.text }),
  thinking: b => ({ type: "thinking", thinking: b.thinking, signature: b.signature }),
  redacted_thinking: b => ({ type: "redacted_thinking", data: b.data }),
  tool_use: b => ({ type: "tool_use", id: b.id, name: b.name, input: b.input }),
  fallback: b => ({ type: "fallback", from: { model: b.from.model }, to: { model: b.to.model } })
};
export function forClient(msg) {
  const lastFallback = msg.content.map(b => b.type).lastIndexOf("fallback");
  const content = msg.content
    .filter((b, i) => KEEP[b.type] && (i > lastFallback || b.type === "text" || b.type === "fallback"))
    .map(b => KEEP[b.type](b));
  return { content, stop_reason: msg.stop_reason, stop_details: msg.stop_details || null, model: msg.model };
}

/* un tour du modèle ; onText reçoit le texte au fil de l'eau, onReset annule le texte d'un tour relancé */
export async function coachTurn(env, req, { onText, onReset, signal }) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL || undefined });
  const params = {
    model: MODEL,
    max_tokens: req.deep ? 32000 : 16000,
    thinking: { type: "adaptive", block_binding: { prefix_mismatch_behavior: "drop_block" } },
    output_config: { effort: req.deep ? "high" : "medium" },
    cache_control: { type: "ephemeral" },
    system: SYSTEM,
    messages: req.messages,
    betas: BETAS,
    fallbacks: "default"
  };
  if (req.tools.length) params.tools = req.tools;
  for (let attempt = 0; ; attempt++) {
    const stream = client.beta.messages.stream(params, { signal });
    stream.on("text", delta => onText(delta));
    try {
      return forClient(await stream.finalMessage());
    } catch (e) {
      // seules les entrées d'outil illisibles (erreur hors API) justifient de relancer le tour ; les erreurs de l'API remontent
      if (e instanceof Anthropic.APIError || !(e instanceof Anthropic.AnthropicError) || attempt >= 2 || (signal && signal.aborted)) throw e;
      onReset();
    }
  }
}

/* erreurs de l'API traduites en codes compris par l'appli */
export function errorCode(e) {
  if (e instanceof RequestError) return { status: e.status, code: e.code };
  if (e instanceof Anthropic.APIUserAbortError) return { status: 499, code: "cancelled" };
  if (e instanceof Anthropic.APIError) {
    const s = e.status, msg = String(e.message || "");
    if (s === 413 || /prompt is too long|too many tokens|context window/i.test(msg)) return { status: 413, code: "prompt_too_large" };
    if (s === 429) return { status: 429, code: "rate_limited" };
    if (s === 529 || s === 503) return { status: 503, code: "overloaded" };
    if (s === 400) return { status: 400, code: "invalid_request" };
    return { status: 502, code: "upstream_error" };
  }
  return { status: 502, code: "upstream_error" };
}
