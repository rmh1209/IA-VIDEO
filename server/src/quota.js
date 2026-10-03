/* Quotas du coach dans Workers KV : questions offertes par appareil et plafonds journaliers contre les abus.
   KV est à cohérence différée : les plafonds sont approximatifs à quelques requêtes près, ce qui suffit ici. */
const today = () => new Date().toISOString().slice(0, 10);
const num = (v, d) => (Number.isFinite(+v) && +v > 0 ? +v : d);
const TWO_DAYS = 172800, SIX_MONTHS = 15552000;

export function limits(env) {
  return {
    freeQuestions: num(env.QUESTIONS_OFFERTES, 3),
    freePerDevice: num(env.PLAFOND_GRATUIT_APPAREIL, 25),
    freePerIp: num(env.PLAFOND_GRATUIT_IP, 60),
    paidPerDay: num(env.PLAFOND_PAYANT_JOUR, 300),
    analysePerDay: num(env.PLAFOND_ANALYSE_JOUR, 8),
    stripePerIp: num(env.PLAFOND_PAIEMENT_IP, 60)
  };
}

/* compte une requête : -1 si le plafond est atteint, sinon le nouveau total (0 si KV ne répond pas : on laisse passer) */
export async function bump(kv, key, limit, ttl) {
  try {
    const n = +(await kv.get(key)) || 0;
    if (n >= limit) return -1;
    await kv.put(key, String(n + 1), { expirationTtl: ttl });
    return n + 1;
  } catch (e) {
    console.warn("quota indisponible", key, e && e.message);
    return 0;
  }
}

/* kind : "coach" (Programme) ou "analyse" (Carnet, Premium) ; newQuestion : faux pour les allers-retours d'outils */
export async function takeQuota(env, { kind, newQuestion, device, ip, access }) {
  const kv = env.QUOTAS, d = today(), L = limits(env);
  const over = code => ({ ok: false, status: code === "daily_limit" ? 429 : 402, code });
  if (kind === "analyse") {
    if (!access.premium) return over("premium_required");
    if (newQuestion && (await bump(kv, `a:${access.premium.id}:${d}`, L.analysePerDay, TWO_DAYS)) < 0) return over("daily_limit");
    return { ok: true };
  }
  const paid = access.fonte || access.premium;
  if (paid) return (await bump(kv, `p:${paid.id}:${d}`, L.paidPerDay, TWO_DAYS)) < 0 ? over("daily_limit") : { ok: true };
  if ((await bump(kv, `ri:${ip}:${d}`, L.freePerIp, TWO_DAYS)) < 0) return over("daily_limit");
  if ((await bump(kv, `rd:${device}:${d}`, L.freePerDevice, TWO_DAYS)) < 0) return over("daily_limit");
  if (!newQuestion) return { ok: true };
  const used = await bump(kv, `q:${device}`, L.freeQuestions, SIX_MONTHS);
  if (used < 0) return over("quota");
  return { ok: true, left: used ? L.freeQuestions - used : null };
}
