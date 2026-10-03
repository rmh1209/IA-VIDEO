/* Fonte en ligne (Cloudflare Workers) : sert l'appli installable (dossier public) et son API (/api/...). */
import { handleApi } from "./api.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env, ctx);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Méthode non autorisée", { status: 405 });
    // adresses exactes des fichiers (index.html, carnet.html) : pas de redirection, que le service worker ne sait pas mettre en cache
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    const res = await env.ASSETS.fetch(new Request(new URL(path, url), request));
    const out = new Response(res.body, res);
    if (path === "/sw.js" || path.endsWith(".html")) out.headers.set("Cache-Control", "no-cache");
    if (path.endsWith(".webmanifest")) out.headers.set("Content-Type", "application/manifest+json");
    out.headers.set("X-Content-Type-Options", "nosniff");
    out.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return out;
  }
};
