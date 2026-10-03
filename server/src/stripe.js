/* API Stripe en REST (formulaire encodé) : Checkout, abonnements, portail client. Aucune dépendance. */
function form(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v, key, out);
    else out.push([key, String(v)]);
  }
  return out;
}

export async function stripe(env, method, path, params) {
  const base = (env.STRIPE_API_BASE || "https://api.stripe.com").replace(/\/$/, "");
  const qs = params ? new URLSearchParams(form(params)).toString() : "";
  const get = method === "GET";
  const res = await fetch(get && qs ? `${base}${path}?${qs}` : `${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, ...(get ? {} : { "Content-Type": "application/x-www-form-urlencoded" }) },
    body: get ? undefined : qs
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data.error && data.error.message) || `Stripe ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/* fin de la période payée (selon la version de l'API, sur l'abonnement ou sur sa ligne) */
export const periodEnd = sub => (sub && (sub.current_period_end || (sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].current_period_end))) || 0;
