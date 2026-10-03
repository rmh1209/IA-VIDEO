/* ===== Progression : points et paliers « Charge ta barre », repères de force, stades de programme.
   Tout se recalcule à partir des séances enregistrées : rien à synchroniser, même résultat sur tous les appareils. ===== */
const PROGRESSION = (() => {
  const DAY = 864e5;
  const weekOf = ts => { const d = new Date(ts); const k = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - k); return d.getTime(); };
  const e1 = (w, r) => (!w || !r ? 0 : r === 1 ? w : w * (1 + Math.min(r, 12) / 30));

  /* ---------- points et paliers ---------- */
  const PTS = { seance: 100, record: 50, recordMax: 3, semaine: 150, serie: 50, serieMax: 4, stade: 500, minSets: 4 };
  const counts = w => (w.nsets || 0) >= PTS.minSets;
  // plates : nombre de disques sur la barre (le vert d'abord, puis jaune, bleu, rouge)
  const TIERS = [
    { k: "vide", n: "Barre vide", min: 0, plates: 0 },
    { k: "vert", n: "Disque vert", min: 100, plates: 1 },
    { k: "jaune", n: "Disque jaune", min: 1200, plates: 2 },
    { k: "bleu", n: "Disque bleu", min: 3500, plates: 3 },
    { k: "rouge", n: "Disque rouge", min: 7000, plates: 4 },
    { k: "complete", n: "Barre complète", min: 12000, plates: 4, gold: true }
  ];
  /* disques gagnés dans l'ordre du logo (rouge, bleu, jaune, vert, du centre vers l'extérieur) */
  const earned = idx => [0, 1, 2, 3].map(i => TIERS[idx].plates >= 4 - i);
  function points(workouts, target, stagesDone) {
    target = Math.max(1, +target || 3);
    const by = { seances: 0, records: 0, semaines: 0, series: 0, stades: (stagesDone || 0) * PTS.stade };
    const weeks = new Map();
    for (const w of workouts) {
      if (!counts(w)) continue;
      by.seances += PTS.seance;
      by.records += Math.min(PTS.recordMax, (w.prs || []).length) * PTS.record;
      const k = weekOf(w.startedAt);
      weeks.set(k, (weeks.get(k) || 0) + 1);
    }
    let run = 0, prev = null, full = 0;
    for (const k of [...weeks.keys()].sort((a, b) => a - b)) {
      if (weeks.get(k) >= target) {
        full++;
        run = prev != null && Math.round((k - prev) / DAY) === 7 ? run + 1 : 1;
        by.semaines += PTS.semaine;
        by.series += PTS.serie * Math.min(run - 1, PTS.serieMax);
        prev = k;
      } else { run = 0; prev = null; }
    }
    const total = by.seances + by.records + by.semaines + by.series + by.stades;
    let idx = 0;
    TIERS.forEach((t, i) => { if (total >= t.min) idx = i; });
    const tier = TIERS[idx], next = TIERS[idx + 1] || null;
    return { total, by, idx, tier, next, toNext: next ? next.min - total : 0, pct: next ? (total - tier.min) / (next.min - tier.min) : 1, fullWeeks: full };
  }
  /* points apportés par une nouvelle séance */
  function gain(workouts, w, target, stagesDone) {
    const a = points(workouts, target, stagesDone), b = points([...workouts, w], target, stagesDone);
    const parts = Object.keys(b.by).map(k => [k, b.by[k] - a.by[k]]).filter(p => p[1] > 0);
    return { before: a, after: b, delta: b.total - a.total, parts, tierUp: b.idx > a.idx };
  }
  const PART_LABEL = { seances: "Séance terminée", records: "Records battus", semaines: "Semaine complète", series: "Semaines d'affilée", stades: "Stade terminé" };

  /* ---------- repères de force (indicatifs, adultes) ----------
     ratio : force estimée (1RM, formule d'Epley) divisée par le poids de corps ; reps : meilleure série ; time : secondes tenues */
  const FORCE = [
    { id: "squat", t: "ratio", h: [0.75, 1.25, 1.75, 2.25], f: [0.5, 0.9, 1.3, 1.7] },
    { id: "sdt", t: "ratio", h: [1, 1.5, 2, 2.5], f: [0.6, 1.1, 1.5, 2] },
    { id: "dc", t: "ratio", h: [0.6, 1, 1.35, 1.75], f: [0.35, 0.6, 0.85, 1.1] },
    { id: "militaire", t: "ratio", h: [0.4, 0.6, 0.85, 1.05], f: [0.25, 0.4, 0.55, 0.75] },
    { id: "rowbarre", t: "ratio", h: [0.5, 0.85, 1.15, 1.5], f: [0.3, 0.55, 0.75, 1] },
    { id: "hipthrust", t: "ratio", h: [1, 1.5, 2.25, 3], f: [0.75, 1.25, 1.9, 2.5] },
    { id: "goblet", t: "ratio", h: [0.25, 0.45, 0.65, 0.85], f: [0.15, 0.3, 0.45, 0.6] },
    { id: "dch", t: "ratio", h: [0.2, 0.35, 0.5, 0.65], f: [0.12, 0.22, 0.32, 0.42], per: "par haltère" },
    { id: "row1", t: "ratio", h: [0.25, 0.45, 0.65, 0.85], f: [0.15, 0.28, 0.4, 0.55], per: "haltère" },
    { id: "tractions", t: "reps", h: [1, 5, 12, 20], f: [1, 3, 8, 15] },
    { id: "pompes", t: "reps", h: [10, 25, 40, 60], f: [5, 15, 30, 45] },
    { id: "dips", t: "reps", h: [5, 12, 20, 30], f: [2, 6, 12, 20] },
    { id: "squatpdc", t: "reps", h: [15, 30, 50, 80], f: [15, 30, 50, 80] },
    { id: "planche", t: "time", h: [30, 60, 120, 180], f: [30, 60, 120, 180] }
  ];
  const LEVELS = ["À mesurer", "Débutant", "Intermédiaire", "Avancé", "Élite"];
  function bestOf(workouts, id, t) {
    let best = 0, when = 0;
    for (const w of workouts) for (const x of w.ex || []) {
      if (x.id !== id) continue;
      for (const s of x.sets || []) {
        const v = t === "ratio" ? e1(s.w, s.r) : (s.r || 0);
        if (v > best) { best = v; when = w.startedAt; }
      }
    }
    return { best, when };
  }
  /* un repère par mouvement compatible avec le matériel ; body = { sex: "h" | "f", kg } */
  function force(workouts, body, eq) {
    const sex = body && (body.sex === "h" || body.sex === "f") ? body.sex : null;
    const kg = body && +body.kg > 0 ? +body.kg : null;
    return FORCE.filter(F => typeof EXI !== "undefined" && EXI[F.id] && (!eq || EXI[F.id].eq.includes(eq))).map(F => {
      const { best, when } = bestOf(workouts, F.id, F.t);
      const need = F.t === "ratio" ? !kg || !sex : F.t === "reps" ? !sex : false;
      const th = F[sex || "h"], val = F.t === "ratio" ? (kg ? best / kg : 0) : best;
      let level = 0;
      if (best > 0 && !need) th.forEach((v, i) => { if (val >= v - 1e-9) level = i + 1; });
      const next = !need && level < 4 ? th[level] : null;
      return { id: F.id, n: EXI[F.id].n, t: F.t, per: F.per || "", best, when, val, level, need, next, nextKg: next != null && F.t === "ratio" ? next * kg : null };
    });
  }

  /* ---------- stades de programme : 3 stades de 8 semaines (2 blocs de 4, décharge en semaines 4 et 8) ---------- */
  const WEEKS = 8;
  const STAGES = [
    { n: 1, name: "Fondations", focus: "Technique propre et régularité : charges confortables, 2 à 3 répétitions en réserve." },
    { n: 2, name: "Construction", focus: "Plus de volume : une série de plus sur les exercices principaux et secondaires, effort plus proche de l'échec." },
    { n: 3, name: "Performance", focus: "Plus lourd : fourchettes plus basses et repos plus longs sur les exercices principaux." }
  ];
  const NEXT_LEVEL = { deb: "inter", inter: "conf", conf: "conf" };
  function stageStatus(workouts, stage, target) {
    target = Math.max(1, +target || 3);
    const n = Math.min(3, Math.max(1, (stage && +stage.n) || 1)), at = (stage && stage.at) || 0;
    const done = workouts.filter(w => w.startedAt >= at && counts(w)).length, need = target * WEEKS;
    const week = Math.min(WEEKS, Math.floor(done / target) + 1);
    return { n, info: STAGES[n - 1], cycle: (stage && stage.cycle) || 1, done: Math.min(done, need), need, week, deload: done < need && week % 4 === 0, complete: done >= need, last: n === 3 };
  }
  const range = s => { const m = String(s || "").trim().match(/^(\d+)\s*à\s*(\d+)$/); return m ? [+m[1], +m[2]] : null; };
  const rirDown = r => {
    const g = range(r);
    if (g) return `${Math.max(0, g[0] - 1)} à ${Math.max(1, g[1] - 1)}`;
    const n = parseInt(r, 10);
    return Number.isFinite(n) ? String(Math.max(0, n - 1)) : r;
  };
  const REST_PERF = { force: "3 à 5 min", muscle: "2 à 3 min", seche: "2 à 3 min", forme: "2 min" };
  function roleIn(x, i) {
    const e = typeof EXI !== "undefined" ? EXI[x.id] : null;
    if (!e) return null;
    if (e.p === "core") return "gainage";
    if (e.k === "i" || e.k === "t") return "isolation";
    return i <= 1 ? "principal" : "secondaire";
  }
  /* dosage du stade n calculé depuis le dosage de base b (celui du stade 1) */
  function doseAt(b, role, n, goal) {
    const d = { sets: b.sets, reps: b.reps, rest: b.rest, rir: b.rir };
    if (n <= 1 || !role || role === "gainage") return d;
    if (n === 2) {
      if (role !== "isolation") d.sets = Math.min(5, (+b.sets || 3) + 1);
      if (b.rir && b.rir !== "—") d.rir = rirDown(b.rir);
      return d;
    }
    if (role === "principal") {
      const g = range(b.reps);
      if (g) { const lo = Math.max(3, g[0] - 2); d.reps = `${lo} à ${Math.max(lo + 2, g[1] - 2)}`; }
      d.rest = REST_PERF[goal] || b.rest;
      if (b.rir !== "—") d.rir = "1 à 2";
    } else if (role === "secondaire" && b.rir && b.rir !== "—") d.rir = rirDown(b.rir);
    return d;
  }
  /* applique le stade aux séances : garde les exercices, change le dosage ; un dosage fixé à la main (fixed) ne bouge pas */
  function applyStage(sessions, n, goal) {
    return sessions.map(s => ({
      ...s,
      ex: s.ex.map((x, i) => {
        if (x.fixed || !x.id) return x;
        const b = x.b || { sets: x.sets, reps: x.reps, rest: x.rest, rir: x.rir };
        return { ...x, b, ...doseAt(b, x.role || roleIn(x, i), n, goal) };
      })
    }));
  }
  /* semaine de décharge : une série de moins, 3 à 4 répétitions en réserve */
  function deload(x) {
    const d = { ...x, sets: Math.max(1, (+x.sets || 3) - 1) };
    if (x.rir && x.rir !== "—") d.rir = "3 à 4";
    return d;
  }

  return { PTS, TIERS, PART_LABEL, earned, points, gain, FORCE, LEVELS, force, WEEKS, STAGES, NEXT_LEVEL, stageStatus, doseAt, applyStage, deload, weekOf };
})();
