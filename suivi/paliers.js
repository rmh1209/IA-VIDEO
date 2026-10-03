/* ===== Fonte Suivi : paliers « Charge ta barre », stades de programme et repères de force (interface) ===== */
const PG = PROGRESSION;
const TCOLOR = { vide: "var(--line)", vert: "var(--green)", jaune: "var(--yellow)", bleu: "var(--blue)", rouge: "var(--red)", complete: "var(--ink)" };
const SHARED_KEY = "fonte.shared", CODE_KEY = "fonte.code";
const targetDays = () => +from().days || program().sessions.length || 3;
const stageOf = () => profile.stage || { n: 1, at: 0, cycle: 1, done: 0 };
const ptsNow = list => PG.points(list, targetDays(), stageOf().done || 0);
const stageNow = list => PG.stageStatus(list, stageOf(), targetDays());
const f2 = x => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(x);
const tierLine = p => (p.next ? `Encore <b>${f0(p.toNext)} points</b> pour le ${p.next.n.toLowerCase()}.` : "Palier maximum : ta barre est complète.");

/* barre chargée : disques gagnés en couleur, les autres en pointillés */
function barSVG(idx, cls) {
  const on = PG.earned(idx), gold = !!PG.TIERS[idx].gold;
  const P = [["var(--red)", 70, 12], ["var(--blue)", 60, 11], ["var(--yellow)", 50, 10], ["var(--green)", 40, 9]];
  let s = `<rect x="6" y="42" width="288" height="6" rx="3" class="tb-rod"/><rect x="80" y="36" width="6" height="18" rx="2" class="tb-col"/><rect x="214" y="36" width="6" height="18" rx="2" class="tb-col"/>`;
  let off = 72;
  P.forEach(([c, h, w], i) => {
    const y = 45 - h / 2, a = on[i] ? `style="fill:${c}"` : 'class="tb-off"';
    s += `<rect x="${150 + off}" y="${y}" width="${w}" height="${h}" rx="2.5" ${a}/><rect x="${150 - off - w}" y="${y}" width="${w}" height="${h}" rx="2.5" ${a}/>`;
    off += w + 2;
  });
  return `<svg class="tbar${gold ? " gold" : ""}${cls ? " " + cls : ""}" viewBox="0 0 300 90" aria-hidden="true">${s}</svg>`;
}
const meterHTML = (pct, color, label) => `<div class="meter" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct * 100)}"><div style="width:${Math.max(2, Math.min(100, pct * 100)).toFixed(1)}%;background:${color}"></div></div>`;

function tiersCardHTML(list) {
  const p = ptsNow(list), t = targetDays(), X = PG.PTS;
  const rows = Object.keys(PG.PART_LABEL).map(k => `<tr><td>${PG.PART_LABEL[k]}</td><td class="n">${f0(p.by[k])}</td></tr>`).join("");
  return `<section class="card tiers"><div class="sechead"><h2>Ton palier</h2><span class="muted small">Charge ta barre</span></div>
    ${barSVG(p.idx)}
    <p class="tier-name"><b>${p.tier.n}</b><span>${f0(p.total)} points</span></p>
    ${p.next ? meterHTML(p.pct, TCOLOR[p.next.k], `Progression vers le ${p.next.n.toLowerCase()}`) : ""}
    <p class="muted small">${tierLine(p)}</p>
    <details><summary>Comment gagner des points</summary>
      <ul class="pts"><li><b>+${X.seance}</b> par séance terminée (au moins ${X.minSets} séries validées)</li><li><b>+${X.record}</b> par record battu (${X.recordMax} au plus par séance)</li><li><b>+${X.semaine}</b> par semaine complète (${t} séance${t > 1 ? "s" : ""})</li><li><b>+${X.serie}</b> de plus par semaine complète d'affilée, jusqu'à +${X.serie * X.serieMax}</li><li><b>+${X.stade}</b> par stade de programme terminé</li></ul>
      <div class="tbl"><table><thead><tr><th>Tes points</th><th class="n">Total</th></tr></thead><tbody>${rows}</tbody></table></div>
      <ol class="tierlist">${PG.TIERS.map((x, i) => `<li class="${i <= p.idx ? "on" : ""}"><span class="tdot" style="background:${TCOLOR[x.k]}"></span><span>${x.n}</span><span class="muted">${f0(x.min)} pts</span></li>`).join("")}</ol>
    </details></section>`;
}

function stageCardHTML(list, interactive) {
  const s = stageNow(list), st = from();
  const steps = PG.STAGES.map(x => `<li class="${x.n < s.n ? "done" : x.n === s.n ? "cur" : ""}"><b>${x.n}</b><span>${x.name}</span></li>`).join("");
  let act = "";
  if (s.complete) {
    const nx = PG.STAGES[s.n];
    act = s.last
      ? `<div class="stage-up"><p><b>Cycle ${s.cycle} terminé, bravo !</b> Le cycle ${s.cycle + 1} repart au stade 1 avec un programme de niveau ${LABEL.level[PG.NEXT_LEVEL[st.level]].toLowerCase()}.</p>${interactive ? `<button type="button" class="primary" data-act="stage-next">Commencer le cycle ${s.cycle + 1}</button>` : ""}</div>`
      : `<div class="stage-up"><p><b>Stade ${s.n} terminé !</b> Stade ${nx.n} · ${nx.name} : ${esc(nx.focus)}</p>${interactive ? `<button type="button" class="primary" data-act="stage-next">Passer au stade ${nx.n} · ${nx.name}</button>` : ""}</div>`;
  } else if (s.deload) act = `<p class="deload"><b>Semaine de décharge.</b> Une série de moins par exercice, mêmes charges, 3 à 4 répétitions en réserve : tes séances de la semaine sont allégées automatiquement.</p>`;
  return `<section class="card stage"><div class="sechead"><h2>Stade ${s.n} · ${s.info.name}</h2><span class="muted small">${s.complete ? "terminé" : `semaine ${s.week} sur ${PG.WEEKS}`}${s.cycle > 1 ? ` · cycle ${s.cycle}` : ""}</span></div>
    <ol class="steps">${steps}</ol>
    ${meterHTML(s.done / s.need, "var(--ink)", `Progression du stade ${s.n}`)}
    <p class="muted small">${s.done} séance${s.done > 1 ? "s" : ""} sur ${s.need} · ${esc(s.info.focus)}</p>${act}</section>`;
}

function homeProgressHTML() {
  const p = ptsNow(workouts);
  return `<button type="button" class="card tierline" data-act="go-progres" aria-label="Voir tes paliers : ${p.tier.n}, ${f0(p.total)} points">${barSVG(p.idx, "mini")}<span><b>${p.tier.n}</b> · ${f0(p.total)} points<span class="muted small">${tierLine(p).replace(/<\/?b>/g, "")}</span></span></button>
  ${stageCardHTML(workouts, true)}`;
}

function forceCardHTML(list, interactive) {
  const body = profile.body || {}, F = PG.force(list, body, from().eq), need = !(body.sex && body.kg > 0);
  const done = F.filter(f => f.best > 0).sort((a, b) => b.level - a.level), todo = F.filter(f => !f.best);
  const dots = l => `<span class="dots" aria-hidden="true">${[1, 2, 3, 4].map(i => `<i class="${i <= l ? "on" : ""}"></i>`).join("")}</span>`;
  const lvl = f => (f.level ? PG.LEVELS[f.level] : f.best ? "En route" : PG.LEVELS[0]);
  const valTxt = f => {
    if (!f.best) return "À mesurer : fais-le dans une séance.";
    if (f.t === "ratio") return `Force estimée ${f1(f.best)} kg${f.per ? " " + f.per : ""}${f.need ? "" : ` · ${f2(f.val)} × ton poids`}`;
    return f.t === "reps" ? `${f0(f.best)} répétitions d'affilée` : `${f0(f.best)} s tenues`;
  };
  const nextTxt = f => {
    if (!f.best) return "";
    if (f.need) return "Indique ton sexe et ton poids pour te situer.";
    if (f.level >= 4) return "Niveau maximum atteint.";
    const L = PG.LEVELS[f.level + 1];
    if (f.t === "ratio") return `Prochain : ${L} à ${f2(f.next)} × ton poids, soit ${f1(f.nextKg)} kg de force estimée${f.per ? " " + f.per : ""}.`;
    return f.t === "reps" ? `Prochain : ${L} à ${f.next} répétitions.` : `Prochain : ${L} à ${f.next} s.`;
  };
  const form = interactive ? `<form class="bodyform" id="body-form" novalidate><div class="seg" role="group" aria-label="Sexe"><button type="button" data-sex="h" aria-pressed="${body.sex === "h"}">Homme</button><button type="button" data-sex="f" aria-pressed="${body.sex === "f"}">Femme</button></div><label class="kg"><span>Poids</span><input id="body-kg" type="text" inputmode="decimal" autocomplete="off" value="${inVal(body.kg)}" placeholder="75" aria-label="Poids de corps en kilos"><span>kg</span></label><button type="submit" class="btn2">${need ? "Enregistrer" : "Mettre à jour"}</button></form>` : "";
  return `<section class="card force"><div class="sechead"><h2>Repères de force</h2><span class="muted small">ton niveau par mouvement</span></div>
    ${need ? `<p class="muted small">Pour te situer sur les mouvements chargés, indique ton sexe et ton poids de corps.</p>` : ""}${form}
    ${done.length ? `<ul class="flist">${done.map(f => `<li><div class="fl-top"><b>${esc(f.n)}</b>${dots(f.level)}<span class="lvl${f.level ? "" : " muted"}">${lvl(f)}</span></div><span class="muted small">${valTxt(f)}</span>${nextTxt(f) ? `<span class="small">${nextTxt(f)}</span>` : ""}</li>`).join("")}</ul>` : ""}
    ${todo.length ? `<p class="fwait"><b>${done.length ? "Encore à mesurer" : "À mesurer"} :</b> ${todo.map(f => esc(f.n)).join(", ")}. Fais-les dans une séance pour connaître ton niveau.</p>` : ""}
    <p class="muted small">Repères indicatifs pour adultes, calculés sur ta meilleure série (force estimée par la formule d'Epley). Ils servent à te situer et à viser le niveau suivant.</p></section>`;
}
function saveBody() {
  const f = $("#body-form"), sx = f && f.querySelector('[data-sex][aria-pressed="true"]'), kg = num($("#body-kg").value);
  if (!sx) { toast("Choisis Homme ou Femme."); return; }
  if (kg == null || kg < 30 || kg > 250) { toast("Indique ton poids en kilos, entre 30 et 250."); $("#body-kg").focus(); return; }
  profile.body = { sex: sx.dataset.sex, kg: Math.round(kg * 10) / 10, at: Date.now() };
  saveProfile();
  renderProgress();
  toast("Profil enregistré : tes repères de force sont à jour.");
}

/* points, palier, niveaux de force et stade gagnés par la séance qu'on termine */
function xpHTML(w) {
  const g = PG.gain(workouts, w, targetDays(), stageOf().done || 0);
  const eq = from().eq, fb = PG.force(workouts, profile.body, eq), fa = PG.force([...workouts, w], profile.body, eq);
  const ups = fa.filter((f, i) => f.level > fb[i].level);
  const sb = stageNow(workouts), sa = stageNow([...workouts, w]);
  const chips = g.parts.map(([k, v]) => `<span class="chip">${PG.PART_LABEL[k]} +${f0(v)}</span>`).join("");
  let s = `<div class="xp"><div class="xp-head"><b>${g.delta ? `+${f0(g.delta)} points` : "Pas de points cette fois"}</b>${chips}</div>`;
  if (!g.delta) s += `<p class="muted small">Valide au moins ${PG.PTS.minSets} séries pour que la séance compte.</p>`;
  if (g.tierUp) s += `<div class="levelup">${barSVG(g.after.idx)}<p><b>Nouveau palier : ${g.after.tier.n} !</b> ${tierLine(g.after)}</p></div>`;
  else if (g.delta) s += `<p class="muted small">${g.after.tier.n} · ${tierLine(g.after)}</p>`;
  ups.forEach(f => { s += `<p class="fup">Nouveau niveau de force : <b>${esc(f.n)}</b>, ${PG.LEVELS[f.level].toLowerCase()}.</p>`; });
  if (sa.complete && !sb.complete) s += `<p class="fup"><b>Stade ${sa.n} terminé !</b> Passe au stade suivant depuis l'accueil.</p>`;
  else if (sa.deload && !sb.deload) s += `<p class="fup">La semaine prochaine est une semaine de décharge : tes séances seront allégées automatiquement.</p>`;
  return { html: s + "</div>", g };
}

/* passage au stade suivant (dosage) ou nouveau cycle (programme du niveau suivant) */
function nextStage() {
  const s = stageNow(workouts), st = stageOf(), P = program();
  if (!s.complete) return;
  const keep = { paid: !!P.paid, example: !!P.example };
  if (s.last) {
    const nf = { ...P.from, level: PG.NEXT_LEVEL[P.from.level] || P.from.level };
    profile.program = { ...keep, from: nf, sessions: buildPlan(nf) };
    profile.stage = { n: 1, at: Date.now(), cycle: (st.cycle || 1) + 1, done: (st.done || 0) + 1 };
    toast(`Cycle ${profile.stage.cycle} : nouveau programme ${LABEL.level[nf.level].toLowerCase()}, +${PG.PTS.stade} points.`);
  } else {
    profile.program = { ...keep, from: P.from, sessions: PG.applyStage(P.sessions, s.n + 1, P.from.goal) };
    profile.stage = { n: s.n + 1, at: Date.now(), cycle: st.cycle || 1, done: (st.done || 0) + 1 };
    toast(`Stade ${s.n + 1} · ${PG.STAGES[s.n].name} : séances mises à jour, +${PG.PTS.stade} points.`);
  }
  saveProfile();
  render(true);
  window.scrollTo(0, 0);
}

/* même appli installée : Fonte et le carnet partagent le stockage du navigateur */
function shareState() { if (!window.FONTE_PWA) return; try { localStorage.setItem(SHARED_KEY, JSON.stringify({ stage: stageOf(), from: program().from, at: Date.now() })); } catch (e) { /* stockage bloqué */ } }
function pullFonte() {
  if (!window.FONTE_PWA) return;
  let c = null;
  try { c = localStorage.getItem(CODE_KEY); } catch (e) { c = null; }
  if (c && /^F1[A-Za-z0-9_-]{20,}$/.test(c) && fp(c) !== profile.lastCode && !active && storeReady) importCode(c, true);
}
