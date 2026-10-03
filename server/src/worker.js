/* Fonte en ligne (Cloudflare Workers) : sert l'appli installable (dossier public) et son API (/api/...). */
import { handleApi, editeurOf } from "./api.js";

// pages de l'appli : rien ne sort vers un site tiers (polices, PDF et API servis ici), pas d'intégration dans un autre site
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env, ctx);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Méthode non autorisée", { status: 405 });
    // informations de l'éditeur renseignées dans wrangler.jsonc : elles remplacent le fichier des pages légales
    if (url.pathname === "/legal/editeur.js" && env.EDITEUR_NOM) {
      return new Response(`window.FONTE_EDITEUR = ${JSON.stringify(editeurOf(env))};\n`, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" } });
    }
    // adresses exactes des fichiers (index.html, carnet.html) : pas de redirection, que le service worker ne sait pas mettre en cache
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    const res = await env.ASSETS.fetch(new Request(new URL(path, url), request));
    const out = new Response(res.body, res);
    if (path === "/sw.js" || path.endsWith(".html")) out.headers.set("Cache-Control", "no-cache");
    if (path.endsWith(".html")) { out.headers.set("Content-Security-Policy", CSP); out.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"); }
    if (path.endsWith(".webmanifest")) out.headers.set("Content-Type", "application/manifest+json");
    out.headers.set("X-Content-Type-Options", "nosniff");
    out.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return out;
  }
};
