/* Jetons d'accès signés (HMAC-SHA256) : la preuve d'achat reste chez l'utilisateur, sans base de données ni compte.
   Contenu : { v, p: "fonte" | "premium", id (session Stripe ou abonnement), cus (client Stripe), exp (ms, 0 = à vie), iat } */
const enc = new TextEncoder();
const b64u = bytes => {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const unb64u = str => {
  let s = String(str).replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
};
const keyOf = secret => crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

export async function signToken(payload, secret) {
  const body = b64u(enc.encode(JSON.stringify({ v: 1, iat: Date.now(), ...payload })));
  const sig = await crypto.subtle.sign("HMAC", await keyOf(secret), enc.encode(body));
  return `${body}.${b64u(sig)}`;
}

/* renvoie le contenu du jeton s'il est authentique (et non expiré, sauf allowExpired), sinon null */
export async function readToken(token, secret, { allowExpired = false } = {}) {
  if (!secret || typeof token !== "string" || token.length > 2000) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    if (!(await crypto.subtle.verify("HMAC", await keyOf(secret), unb64u(sig), enc.encode(body)))) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64u(body)));
    if (!p || p.v !== 1 || (p.p !== "fonte" && p.p !== "premium") || typeof p.id !== "string") return null;
    if (!allowExpired && p.exp && p.exp < Date.now()) return null;
    return p;
  } catch (e) {
    return null;
  }
}
